import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';
import FormBuilder from '../components/formBuilder/FormBuilder';
import FieldConfigModal from '../components/formBuilder/FieldConfigModal';
import {
  CustomForm,
  FormField,
  FormLayout,
  FormTheme,
  FormSettings,
} from '../types/formBuilder';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface FormManagementScreenProps {
  onBack?: () => void;
}

const FormManagementScreen: React.FC<FormManagementScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { config } = useSimpleDeviceConfig();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<CustomForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    if (!config) return;

    try {
      setIsLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/forms`, { headers });
      if (response.ok) {
        const data = await response.json();
        setForms(data);
      } else {
        console.error('Failed to fetch forms');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewForm = () => {
    const defaultLayout: FormLayout = {
      columns: 1,
      spacing: 16,
      containerPadding: 20,
      fieldSpacing: 16,
      labelPosition: 'top',
      submitButtonPosition: 'center',
    };

    const defaultTheme: FormTheme = {
      primaryColor: theme.colors.primary,
      secondaryColor: theme.colors.secondary || '#6b7280',
      backgroundColor: theme.colors.background,
      textColor: theme.colors.text,
      labelColor: theme.colors.text,
      borderColor: theme.colors.textSecondary,
      errorColor: theme.colors.error,
      successColor: theme.colors.success,
      fontFamily: theme.fonts.primary,
      fontSize: 16,
      borderRadius: 8,
    };

    const defaultSettings: FormSettings = {
      allowSave: true,
      showProgress: false,
      multiStep: false,
      confirmSubmission: true,
      submitButtonText: 'Submit',
      cancelButtonText: 'Cancel',
      successMessage: 'Form submitted successfully!',
      errorMessage: 'Please fix the errors and try again.',
      autoSave: false,
      requireAuthentication: false,
      allowAnonymous: true,
    };

    const newForm: CustomForm = {
      id: `form_${Date.now()}`,
      name: 'New Form',
      description: '',
      category: 'visitor',
      status: 'draft',
      fields: [],
      layout: defaultLayout,
      theme: defaultTheme,
      settings: defaultSettings,
      createdBy: config?.deviceId || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: config?.companyId || '',
      version: 1,
      totalSubmissions: 0,
    };

    setSelectedForm(newForm);
    setShowBuilder(true);
  };

  const saveForm = async (form: CustomForm) => {
    if (!config) return;

    // Validate required fields
    if (!form.name || !form.name.trim()) {
      Alert.alert('Validation Error', 'Form name is required');
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const isNew = !forms.find(f => f.id === form.id);
      const url = isNew
        ? `${config.serverUrl}/forms`
        : `${config.serverUrl}/forms/${form.id}`;
      const method = isNew ? 'POST' : 'PUT';

      // Prepare form data for backend - remove frontend-specific fields
      const {
        createdAt,
        updatedAt,
        createdBy,
        companyId,
        totalSubmissions,
        lastSubmissionAt,
        averageCompletionTime,
        previousVersions,
        workflowIds,
        notificationTemplates,
        ...cleanForm
      } = form;

      const formData = {
        id: cleanForm.id,
        name: cleanForm.name.trim(),
        description: cleanForm.description || '',
        category: cleanForm.category || 'visitor',
        status: cleanForm.status || 'draft',
        fields: cleanForm.fields || [],
        layout: cleanForm.layout || {},
        theme: cleanForm.theme || {},
        settings: cleanForm.settings || {},
        version: cleanForm.version || 1,
        location_ids: cleanForm.locationIds || [],
        created_by: createdBy || config?.deviceId || 'unknown',
        company_id: companyId || config?.companyId || '',
      };

      console.log('=== FORM SAVE DEBUG ===');
      console.log('Original form:', form);
      console.log('Cleaned form data:', JSON.stringify(formData, null, 2));
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Headers:', headers);
      console.log('========================');

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Form saved successfully');
        await fetchForms();
      } else {
        const errorText = await response.text();
        console.error('=== FORM SAVE ERROR DETAILS ===');
        console.error('Status:', response.status);
        console.error('Status Text:', response.statusText);
        console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.error('Response Body:', errorText);
        console.error('Request URL:', url);
        console.error('Request Method:', method);
        console.error('Request Headers:', headers);
        console.error('Request Body:', JSON.stringify(formData, null, 2));
        console.error('Device Token Present:', !!config?.deviceToken);
        console.error('Server URL:', config?.serverUrl);
        console.error('================================');
        
        let errorMessage = `Failed to save form (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage += `\n${errorData.detail}`;
          }
          if (errorData.error_code) {
            errorMessage += `\nError Code: ${errorData.error_code}`;
          }
        } catch {
          errorMessage += `\n${errorText}`;
        }
        
        Alert.alert('Save Error', errorMessage);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while saving form');
      console.error('Save form error:', error);
    }
  };

  const deleteForm = (formId: string) => {
    Alert.alert(
      'Delete Form',
      'Are you sure you want to delete this form?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!config) return;

            try {
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };

              if (config.deviceToken) {
                headers['X-Device-Token'] = config.deviceToken;
              }

              const response = await fetch(
                `${config.serverUrl}/forms/${formId}`,
                { method: 'DELETE', headers }
              );

              if (response.ok) {
                Alert.alert('Success', 'Form deleted successfully');
                await fetchForms();
              } else {
                Alert.alert('Error', 'Failed to delete form');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error while deleting form');
              console.error('Delete form error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleFormStatus = async (form: CustomForm) => {
    const newStatus = form.status === 'active' ? 'inactive' : 'active';
    const updatedForm = { ...form, status: newStatus };
    await saveForm(updatedForm);
  };

  const handleFormChange = (form: CustomForm) => {
    setSelectedForm(form);
  };

  const handleFieldEdit = (field: FormField) => {
    setSelectedField(field);
    setShowFieldConfig(true);
  };

  const handleFieldSave = (updatedField: FormField) => {
    if (!selectedForm) return;

    const updatedFields = selectedForm.fields.map(f =>
      f.id === updatedField.id ? updatedField : f
    );

    const updatedForm = {
      ...selectedForm,
      fields: updatedFields,
      updatedAt: new Date(),
    };

    setSelectedForm(updatedForm);
    setShowFieldConfig(false);
  };

  const renderFormCard = (form: CustomForm) => {
    const statusColor = {
      draft: '#6b7280',
      active: '#10b981',
      inactive: '#f59e0b',
      archived: '#ef4444',
    }[form.status];

    const categoryIcons = {
      visitor: '👤',
      contractor: '🔧',
      event: '🎉',
      survey: '📝',
      feedback: '💬',
      registration: '📋',
      other: '📄',
    };

    return (
      <TouchableOpacity
        key={form.id}
        style={[styles.formCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => {
          setSelectedForm(form);
          setShowBuilder(true);
        }}
      >
        <View style={styles.formHeader}>
          <View style={styles.formTitleRow}>
            <Text style={styles.formIcon}>{categoryIcons[form.category]}</Text>
            <Text style={[styles.formName, { color: theme.colors.text }]}>
              {form.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{form.status}</Text>
          </View>
        </View>
        
        {form.description && (
          <Text style={[styles.formDescription, { color: theme.colors.textSecondary }]}>
            {form.description}
          </Text>
        )}
        
        <View style={styles.formMeta}>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            Category: {form.category}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {form.fields.length} fields
          </Text>
        </View>

        <View style={styles.formStats}>
          <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
            Submissions: {form.totalSubmissions || 0}
          </Text>
          <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
            v{form.version}
          </Text>
        </View>
        
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => toggleFormStatus(form)}
          >
            <Text style={styles.actionButtonText}>
              {form.status === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => deleteForm(form.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (showBuilder && selectedForm) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowBuilder(false);
              setSelectedForm(null);
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{selectedForm.name}</Text>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.success }]}
            onPress={() => saveForm(selectedForm)}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <FormBuilder
          form={selectedForm}
          onFormChange={handleFormChange}
          onFieldEdit={handleFieldEdit}
          readOnly={false}
        />
        
        <FieldConfigModal
          visible={showFieldConfig}
          field={selectedField}
          onClose={() => setShowFieldConfig(false)}
          onSave={handleFieldSave}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading forms...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Form Management</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={createNewForm}
        >
          <Text style={styles.createButtonText}>+ Create New Form</Text>
        </TouchableOpacity>
        
        {forms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No forms yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Create your first custom form for visitor registration
            </Text>
          </View>
        ) : (
          <View style={styles.formGrid}>
            {forms.map(renderFormCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  formGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  formCard: {
    width: isTablet ? '48%' : '100%',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  formIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  formName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  formDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  formMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
  },
  formStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FormManagementScreen;