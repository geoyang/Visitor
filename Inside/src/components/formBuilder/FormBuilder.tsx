import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {
  CustomForm,
  FormField,
  FormFieldType,
  FieldTypeConfig,
  FormBuilderState,
} from '../../types/formBuilder';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface FormBuilderProps {
  form: CustomForm;
  onFormChange: (form: CustomForm) => void;
  readOnly?: boolean;
  onFieldEdit?: (field: FormField) => void;
}

// Field type configurations for the palette
const fieldTypeConfigs: FieldTypeConfig[] = [
  // Basic fields
  {
    type: 'text',
    label: 'Text Input',
    icon: '📝',
    category: 'basic',
    description: 'Single line text input',
    defaultConfig: {
      type: 'text',
      label: 'Text Field',
      placeholder: 'Enter text...',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: '📄',
    category: 'basic',
    description: 'Multi-line text input',
    defaultConfig: {
      type: 'textarea',
      label: 'Text Area',
      placeholder: 'Enter detailed text...',
      rows: 4,
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'email',
    label: 'Email',
    icon: '📧',
    category: 'basic',
    description: 'Email address input',
    defaultConfig: {
      type: 'email',
      label: 'Email Address',
      placeholder: 'Enter email...',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'phone',
    label: 'Phone',
    icon: '📞',
    category: 'basic',
    description: 'Phone number input',
    defaultConfig: {
      type: 'phone',
      label: 'Phone Number',
      placeholder: 'Enter phone...',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'number',
    label: 'Number',
    icon: '🔢',
    category: 'basic',
    description: 'Numeric input',
    defaultConfig: {
      type: 'number',
      label: 'Number',
      placeholder: 'Enter number...',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  
  // Selection fields
  {
    type: 'select',
    label: 'Dropdown',
    icon: '📋',
    category: 'basic',
    description: 'Dropdown selection',
    defaultConfig: {
      type: 'select',
      label: 'Select Option',
      required: false,
      options: [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' },
      ],
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'radio',
    label: 'Radio Buttons',
    icon: '🔘',
    category: 'basic',
    description: 'Single choice selection',
    defaultConfig: {
      type: 'radio',
      label: 'Choose One',
      required: false,
      options: [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' },
      ],
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    icon: '☑️',
    category: 'basic',
    description: 'Multiple choice selection',
    defaultConfig: {
      type: 'checkbox',
      label: 'Select All That Apply',
      required: false,
      options: [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' },
      ],
      position: { row: 0, column: 0 },
    },
  },
  
  // Date/Time fields
  {
    type: 'date',
    label: 'Date',
    icon: '📅',
    category: 'advanced',
    description: 'Date picker',
    defaultConfig: {
      type: 'date',
      label: 'Date',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'time',
    label: 'Time',
    icon: '🕐',
    category: 'advanced',
    description: 'Time picker',
    defaultConfig: {
      type: 'time',
      label: 'Time',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  
  // Special fields
  {
    type: 'file',
    label: 'File Upload',
    icon: '📎',
    category: 'special',
    description: 'File upload field',
    defaultConfig: {
      type: 'file',
      label: 'Upload File',
      required: false,
      maxFiles: 1,
      acceptedTypes: ['image/*', 'application/pdf'],
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'signature',
    label: 'Signature',
    icon: '✍️',
    category: 'special',
    description: 'Digital signature pad',
    defaultConfig: {
      type: 'signature',
      label: 'Signature',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  
  // Layout fields
  {
    type: 'section',
    label: 'Section Header',
    icon: '📌',
    category: 'layout',
    description: 'Section divider with title',
    defaultConfig: {
      type: 'section',
      label: 'Section Title',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '➖',
    category: 'layout',
    description: 'Visual divider line',
    defaultConfig: {
      type: 'divider',
      label: '',
      required: false,
      position: { row: 0, column: 0 },
    },
  },
];

const FormBuilder: React.FC<FormBuilderProps> = ({
  form,
  onFormChange,
  readOnly = false,
  onFieldEdit,
}) => {
  const { theme } = useTheme();
  const [builderState, setBuilderState] = useState<FormBuilderState>({
    previewMode: false,
    zoom: 1,
    showGrid: true,
    snapToGrid: true,
  });
  const [showFormSettings, setShowFormSettings] = useState(false);

  const canvasRef = useRef<View>(null);

  // Update form metadata
  const updateFormMetadata = (updates: Partial<CustomForm>) => {
    const updatedForm = {
      ...form,
      ...updates,
      updatedAt: new Date(),
    };
    onFormChange(updatedForm);
  };

  // Create a new field
  const createField = (fieldType: FormFieldType, position?: { x: number; y: number }) => {
    const config = fieldTypeConfigs.find(c => c.type === fieldType);
    if (!config) return;

    const newField: FormField = {
      id: `field_${Date.now()}`,
      ...config.defaultConfig,
      position: {
        row: form.fields.length,
        column: 0,
      },
    } as FormField;

    const updatedForm = {
      ...form,
      fields: [...form.fields, newField],
      updatedAt: new Date(),
    };

    onFormChange(updatedForm);
  };

  // Delete a field
  const deleteField = (fieldId: string) => {
    Alert.alert(
      'Delete Field',
      'Are you sure you want to delete this field?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedFields = form.fields.filter(f => f.id !== fieldId);
            const updatedForm = {
              ...form,
              fields: updatedFields,
              updatedAt: new Date(),
            };
            onFormChange(updatedForm);
          },
        },
      ]
    );
  };

  // Move field up/down
  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const fields = [...form.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];

    // Update positions
    fields.forEach((field, idx) => {
      field.position.row = idx;
    });

    const updatedForm = {
      ...form,
      fields,
      updatedAt: new Date(),
    };

    onFormChange(updatedForm);
  };

  // Render field palette
  const renderFieldPalette = () => {
    const categories = ['basic', 'advanced', 'special', 'layout'];
    
    return (
      <View style={[styles.palette, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.paletteTitle, { color: theme.colors.text }]}>
          Field Types
        </Text>
        
        {categories.map(category => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
              {category.toUpperCase()}
            </Text>
            
            <View style={styles.fieldsGrid}>
              {fieldTypeConfigs
                .filter(config => config.category === category)
                .map(config => (
                  <TouchableOpacity
                    key={config.type}
                    style={[styles.fieldPaletteItem, { backgroundColor: theme.colors.background }]}
                    onPress={() => createField(config.type)}
                    disabled={readOnly}
                  >
                    <Text style={styles.fieldIcon}>{config.icon}</Text>
                    <Text style={[styles.fieldLabel, { color: theme.colors.text }]} numberOfLines={2}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render form canvas
  const renderFormCanvas = () => {
    return (
      <View style={[styles.canvas, { backgroundColor: theme.colors.background }]}>
        <View style={styles.canvasHeader}>
          <TouchableOpacity 
            style={styles.formTitleButton}
            onPress={() => setShowFormSettings(true)}
          >
            <Text style={[styles.canvasTitle, { color: theme.colors.text }]}>
              {form.name || 'Untitled Form'}
            </Text>
            <Text style={[styles.editHint, { color: theme.colors.textSecondary }]}>
              Tap to edit
            </Text>
          </TouchableOpacity>
          <View style={styles.canvasControls}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setShowFormSettings(true)}
            >
              <Text style={[styles.controlButtonText, { color: theme.colors.text }]}>
                ⚙️ Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.controlButton,
                builderState.previewMode && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => setBuilderState({
                ...builderState,
                previewMode: !builderState.previewMode
              })}
            >
              <Text style={[
                styles.controlButtonText,
                { color: builderState.previewMode ? 'white' : theme.colors.text }
              ]}>
                {builderState.previewMode ? '📝 Edit' : '👁️ Preview'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.formContainer}>
          {form.fields.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No fields yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
                Drag fields from the palette to start building your form
              </Text>
            </View>
          ) : (
            <View style={styles.fieldsContainer}>
              {form.fields.map((field, index) => renderField(field, index))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render individual field
  const renderField = (field: FormField, index: number) => {
    const isSelected = builderState.selectedFieldId === field.id;

    return (
      <TouchableOpacity
        key={field.id}
        style={[
          styles.fieldContainer,
          { backgroundColor: theme.colors.surface },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }
        ]}
        onPress={() => {
          if (!builderState.previewMode) {
            setBuilderState({ ...builderState, selectedFieldId: field.id });
          }
        }}
        disabled={builderState.previewMode}
      >
        <View style={styles.fieldHeader}>
          <Text style={[styles.fieldTitle, { color: theme.colors.text }]}>
            {field.label}
            {field.required && <Text style={{ color: theme.colors.error }}> *</Text>}
          </Text>
          
          {!builderState.previewMode && !readOnly && (
            <View style={styles.fieldControls}>
              <TouchableOpacity
                style={styles.fieldControlButton}
                onPress={() => onFieldEdit?.(field)}
              >
                <Text style={[styles.fieldControlText, { color: theme.colors.primary }]}>✏️</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fieldControlButton}
                onPress={() => moveField(field.id, 'up')}
                disabled={index === 0}
              >
                <Text style={[styles.fieldControlText, { 
                  color: index === 0 ? theme.colors.textSecondary : theme.colors.text 
                }]}>↑</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fieldControlButton}
                onPress={() => moveField(field.id, 'down')}
                disabled={index === form.fields.length - 1}
              >
                <Text style={[styles.fieldControlText, { 
                  color: index === form.fields.length - 1 ? theme.colors.textSecondary : theme.colors.text 
                }]}>↓</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fieldControlButton}
                onPress={() => deleteField(field.id)}
              >
                <Text style={[styles.fieldControlText, { color: theme.colors.error }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {field.description && (
          <Text style={[styles.fieldDescription, { color: theme.colors.textSecondary }]}>
            {field.description}
          </Text>
        )}

        <View style={styles.fieldPreview}>
          {renderFieldPreview(field)}
        </View>
      </TouchableOpacity>
    );
  };

  // Render field preview based on type
  const renderFieldPreview = (field: FormField) => {
    const baseStyle = [styles.previewInput, { borderColor: theme.colors.textSecondary }];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <View style={baseStyle}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              {field.placeholder || 'Enter value...'}
            </Text>
          </View>
        );
        
      case 'textarea':
        return (
          <View style={[baseStyle, { height: (field.rows || 4) * 24 }]}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              {field.placeholder || 'Enter detailed text...'}
            </Text>
          </View>
        );
        
      case 'select':
        return (
          <View style={baseStyle}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              Select an option ▼
            </Text>
          </View>
        );
        
      case 'radio':
        return (
          <View>
            {field.options?.map(option => (
              <View key={option.id} style={styles.radioOption}>
                <View style={[styles.radioCircle, { borderColor: theme.colors.textSecondary }]} />
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
        );
        
      case 'checkbox':
        return (
          <View>
            {field.options?.map(option => (
              <View key={option.id} style={styles.checkboxOption}>
                <View style={[styles.checkboxSquare, { borderColor: theme.colors.textSecondary }]} />
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                  {option.label}
                </Text>
              </View>
            ))}
          </View>
        );
        
      case 'date':
        return (
          <View style={baseStyle}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              📅 Select date
            </Text>
          </View>
        );
        
      case 'file':
        return (
          <View style={[styles.fileUpload, { borderColor: theme.colors.textSecondary }]}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              📎 Choose files or drag here
            </Text>
          </View>
        );
        
      case 'signature':
        return (
          <View style={[styles.signatureArea, { borderColor: theme.colors.textSecondary }]}>
            <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
              ✍️ Signature area
            </Text>
          </View>
        );
        
      case 'section':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {field.label}
            </Text>
          </View>
        );
        
      case 'divider':
        return <View style={[styles.divider, { backgroundColor: theme.colors.textSecondary }]} />;
        
      default:
        return (
          <Text style={[styles.previewPlaceholder, { color: theme.colors.textSecondary }]}>
            {field.type} field
          </Text>
        );
    }
  };

  // Render form settings modal
  const renderFormSettingsModal = () => {
    const [tempForm, setTempForm] = useState(form);

    const handleSave = () => {
      if (!tempForm.name.trim()) {
        Alert.alert('Error', 'Form name is required');
        return;
      }
      updateFormMetadata({
        name: tempForm.name,
        description: tempForm.description,
        category: tempForm.category,
      });
      setShowFormSettings(false);
    };

    const categoryOptions = [
      { value: 'visitor', label: '👤 Visitor' },
      { value: 'contractor', label: '🔧 Contractor' },
      { value: 'event', label: '🎉 Event' },
      { value: 'survey', label: '📝 Survey' },
      { value: 'feedback', label: '💬 Feedback' },
      { value: 'registration', label: '📋 Registration' },
      { value: 'other', label: '📄 Other' },
    ];

    return (
      <Modal
        visible={showFormSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFormSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.modalTitle}>Form Settings</Text>
              <TouchableOpacity onPress={() => setShowFormSettings(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Basic Information
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Form Name *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
                    value={tempForm.name}
                    onChangeText={(text) => setTempForm({ ...tempForm, name: text })}
                    placeholder="Enter form name"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
                  <TextInput
                    style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
                    value={tempForm.description || ''}
                    onChangeText={(text) => setTempForm({ ...tempForm, description: text })}
                    placeholder="Describe the purpose of this form"
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.colors.text }]}>Category</Text>
                  <View style={styles.categoryGrid}>
                    {categoryOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.categoryOption,
                          { backgroundColor: theme.colors.surface },
                          tempForm.category === option.value && { backgroundColor: theme.colors.primary }
                        ]}
                        onPress={() => setTempForm({ ...tempForm, category: option.value as any })}
                      >
                        <Text style={[
                          styles.categoryText,
                          { color: tempForm.category === option.value ? 'white' : theme.colors.text }
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowFormSettings(false)}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
              >
                <Text style={[styles.buttonText, { color: 'white' }]}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {!readOnly && renderFieldPalette()}
      {renderFormCanvas()}
      {renderFormSettingsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  palette: {
    width: isTablet ? 300 : 250,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  paletteTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categorySection: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldPaletteItem: {
    width: isTablet ? 130 : 110,
    height: 80,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  canvas: {
    flex: 1,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  canvasTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  canvasControls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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
  fieldsContainer: {
    gap: 12,
  },
  fieldContainer: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  fieldControls: {
    flexDirection: 'row',
    gap: 4,
  },
  fieldControlButton: {
    padding: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  fieldControlText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  fieldPreview: {
    marginTop: 8,
  },
  previewInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    minHeight: 44,
  },
  previewPlaceholder: {
    fontSize: 14,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 8,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderWidth: 2,
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 14,
  },
  fileUpload: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  signatureArea: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  
  // Form settings modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: 'white',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  saveButton: {},
  buttonText: {
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formTitleButton: {
    flex: 1,
  },
  editHint: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default FormBuilder;