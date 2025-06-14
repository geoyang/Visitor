import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

interface TenantConfig {
  companyId: string;
  companySlug: string;
  locationId: string;
  deviceId: string;
}

interface VisitorForm {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  is_global: boolean;
  company_name: string;
}

interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
  validation?: any;
}

interface Visitor {
  id: string;
  data: Record<string, any>;
  check_in_time: string;
  status: string;
  company_name: string;
  location_name: string;
  device_name: string;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  host_name: string;
  visit_purpose: string;
}

interface VisitorAppMultitenantProps {
  tenantConfig: TenantConfig;
  onConfigError: () => void;
}

const VisitorAppMultitenant: React.FC<VisitorAppMultitenantProps> = ({
  tenantConfig,
  onConfigError,
}) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [currentForm, setCurrentForm] = useState<VisitorForm | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeVisitors, setActiveVisitors] = useState<Visitor[]>([]);
  const [customForms, setCustomForms] = useState<VisitorForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('default');
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  const API_BASE = 'http://localhost:8000'; // Docker backend API

  useEffect(() => {
    initializeApp();
    const interval = setInterval(() => {
      sendDeviceHeartbeat();
      loadActiveVisitors();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [tenantConfig]);

  const initializeApp = async () => {
    try {
      await sendDeviceHeartbeat();
      await loadCustomForms();
      await loadActiveVisitors();
      await loadDeviceInfo();
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize app. Please check your configuration.');
    }
  };

  const sendDeviceHeartbeat = async () => {
    try {
      const heartbeatData = {
        device_id: tenantConfig.deviceId,
        ip_address: '192.168.1.100', // Would get actual IP in production
        user_agent: 'VisitorApp/1.0',
        app_version: '1.0.0',
        timestamp: new Date().toISOString(),
      };

      await fetch(`${API_BASE}/devices/${tenantConfig.deviceId}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Slug': tenantConfig.companySlug,
        },
        body: JSON.stringify(heartbeatData),
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  };

  const loadDeviceInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/devices?location_id=${tenantConfig.locationId}`, {
        headers: {
          'X-Company-Slug': tenantConfig.companySlug,
        },
      });

      if (response.ok) {
        const devices = await response.json();
        const device = devices.find((d: any) => d.id === tenantConfig.deviceId);
        setDeviceInfo(device);
      }
    } catch (error) {
      console.error('Error loading device info:', error);
    }
  };

  const loadCustomForms = async () => {
    try {
      const response = await fetch(`${API_BASE}/forms?location_id=${tenantConfig.locationId}`, {
        headers: {
          'X-Company-Slug': tenantConfig.companySlug,
        },
      });

      if (response.ok) {
        const forms = await response.json();
        setCustomForms(forms);
      } else if (response.status === 403 || response.status === 404) {
        onConfigError();
      }
    } catch (error) {
      console.error('Error loading forms:', error);
      Alert.alert('Error', 'Failed to load forms. Please check your connection.');
    }
  };

  const loadActiveVisitors = async () => {
    try {
      const response = await fetch(`${API_BASE}/visitors/active?location_id=${tenantConfig.locationId}`, {
        headers: {
          'X-Company-Slug': tenantConfig.companySlug,
        },
      });

      if (response.ok) {
        const visitors = await response.json();
        setActiveVisitors(visitors);
      } else if (response.status === 403 || response.status === 404) {
        onConfigError();
      }
    } catch (error) {
      console.error('Error loading visitors:', error);
    }
  };

  const getFormSchema = async (formId: string) => {
    try {
      if (formId === 'default') {
        setCurrentForm(defaultForm);
        setFormData({});
        return;
      }

      const form = customForms.find(f => f.id === formId);
      if (form) {
        setCurrentForm(form);
        setFormData({});
      } else {
        Alert.alert('Error', 'Failed to load form schema');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load form schema');
    }
  };

  const submitVisitor = async () => {
    setLoading(true);
    try {
      // Validate required fields
      const currentFormData = currentForm || defaultForm;
      const missingFields = currentFormData.fields
        .filter(field => field.required && !formData[field.name])
        .map(field => field.label);

      if (missingFields.length > 0) {
        Alert.alert('Required Fields', `Please fill in: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      const visitorData = {
        company_id: tenantConfig.companyId,
        location_id: tenantConfig.locationId,
        device_id: tenantConfig.deviceId,
        form_id: selectedForm,
        data: formData,
        check_in_time: new Date().toISOString(),
        status: 'checked_in',
      };

      const response = await fetch(`${API_BASE}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Slug': tenantConfig.companySlug,
        },
        body: JSON.stringify(visitorData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Visitor checked in successfully');
        setFormData({});
        loadActiveVisitors();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to check in visitor');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const checkOutVisitor = async (visitorId: string) => {
    try {
      const response = await fetch(`${API_BASE}/visitors/${visitorId}/checkout`, {
        method: 'PUT',
        headers: {
          'X-Company-Slug': tenantConfig.companySlug,
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'Visitor checked out');
        loadActiveVisitors();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check out visitor');
    }
  };

  const renderFormField = (field: FormField) => {
    const { name, type, label, required, options } = field;

    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <View key={name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {label} {required && '*'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={formData[name] || ''}
              onChangeText={(value) => setFormData({ ...formData, [name]: value })}
              keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : 'default'}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </View>
        );

      case 'select':
        return (
          <View key={name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {label} {required && '*'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    formData[name] === option && styles.selectedOption,
                  ]}
                  onPress={() => setFormData({ ...formData, [name]: option })}
                >
                  <Text style={[
                    styles.optionText,
                    formData[name] === option && styles.selectedOptionText,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'textarea':
        return (
          <View key={name} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {label} {required && '*'}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData[name] || ''}
              onChangeText={(value) => setFormData({ ...formData, [name]: value })}
              multiline
              numberOfLines={4}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const defaultForm: VisitorForm = {
    id: 'default',
    name: 'Default Visitor Form',
    description: 'Standard visitor check-in form',
    fields: [
      { name: 'full_name', type: 'text', label: 'Full Name', required: true },
      { name: 'company', type: 'text', label: 'Company', required: false },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'phone', type: 'phone', label: 'Phone', required: false },
      { 
        name: 'visit_purpose', 
        type: 'select', 
        label: 'Purpose of Visit', 
        required: true,
        options: ['Meeting', 'Interview', 'Delivery', 'Maintenance', 'Other']
      },
      { name: 'host_name', type: 'text', label: 'Host Name', required: true },
      { name: 'notes', type: 'textarea', label: 'Additional Notes', required: false },
    ],
    is_global: true,
    company_name: '',
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {deviceInfo?.company_name || 'Visitor Management'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {deviceInfo?.location_name} • {activeVisitors.length} active visitors
        </Text>
        <Text style={styles.deviceInfo}>
          Device: {deviceInfo?.name} • {deviceInfo?.is_online ? 'Online' : 'Offline'}
        </Text>
      </View>

      {/* Form Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Form</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.formSelector,
              selectedForm === 'default' && styles.selectedFormSelector,
            ]}
            onPress={() => {
              setSelectedForm('default');
              setCurrentForm(defaultForm);
            }}
          >
            <Text style={styles.formSelectorText}>Default Form</Text>
          </TouchableOpacity>
          {customForms.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={[
                styles.formSelector,
                selectedForm === form.id && styles.selectedFormSelector,
              ]}
              onPress={() => {
                setSelectedForm(form.id);
                getFormSchema(form.id);
              }}
            >
              <Text style={styles.formSelectorText}>{form.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Visitor Check-in Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Check-in New Visitor</Text>
        <View style={isTablet ? styles.tabletFormContainer : styles.phoneFormContainer}>
          {(currentForm || defaultForm).fields.map(renderFormField)}
          
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={submitVisitor}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Check In Visitor</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Visitors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Visitors</Text>
        {activeVisitors.length === 0 ? (
          <Text style={styles.emptyState}>No active visitors</Text>
        ) : (
          <View style={isTablet ? styles.tabletGrid : styles.phoneList}>
            {activeVisitors.map((visitor) => (
              <View key={visitor.id} style={styles.visitorCard}>
                <View style={styles.visitorInfo}>
                  <Text style={styles.visitorName}>{visitor.full_name}</Text>
                  <Text style={styles.visitorDetail}>{visitor.company}</Text>
                  <Text style={styles.visitorDetail}>Host: {visitor.host_name}</Text>
                  <Text style={styles.visitorDetail}>Purpose: {visitor.visit_purpose}</Text>
                  <Text style={styles.visitorTime}>
                    Checked in: {formatTime(visitor.check_in_time)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => checkOutVisitor(visitor.id)}
                >
                  <Text style={styles.checkoutButtonText}>Check Out</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Device Config Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.configButton}
          onPress={onConfigError}
        >
          <Text style={styles.configButtonText}>Reconfigure Device</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginTop: 4,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  formSelector: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedFormSelector: {
    backgroundColor: '#2563eb',
  },
  formSelectorText: {
    color: '#374151',
    fontWeight: '500',
  },
  tabletFormContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phoneFormContainer: {
    flexDirection: 'column',
  },
  fieldContainer: {
    marginBottom: 16,
    width: isTablet ? '48%' : '100%',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: '#2563eb',
  },
  optionText: {
    color: '#374151',
  },
  selectedOptionText: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: isTablet ? '48%' : '100%',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  tabletGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  phoneList: {
    flexDirection: 'column',
  },
  visitorCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: isTablet ? '48%' : '100%',
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  visitorDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  visitorTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  checkoutButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkoutButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    padding: 20,
  },
  configButton: {
    backgroundColor: '#f59e0b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  configButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default VisitorAppMultitenant;