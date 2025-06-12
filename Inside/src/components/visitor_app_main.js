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
} from 'react-native';
import { Camera } from 'expo-camera';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const VisitorApp = () => {
  const [visitors, setVisitors] = useState([]);
  const [currentForm, setCurrentForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('default');
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:8000'; // Replace with your API URL

  useEffect(() => {
    loadCustomForms();
    loadActiveVisitors();
  }, []);

  const loadCustomForms = async () => {
    try {
      const response = await fetch(`${API_BASE}/forms`);
      const forms = await response.json();
      setCustomForms(forms);
    } catch (error) {
      console.error('Error loading forms:', error);
    }
  };

  const loadActiveVisitors = async () => {
    try {
      const response = await fetch(`${API_BASE}/visitors/active`);
      const visitors = await response.json();
      setActiveVisitors(visitors);
    } catch (error) {
      console.error('Error loading visitors:', error);
    }
  };

  const getFormSchema = async (formId) => {
    try {
      const response = await fetch(`${API_BASE}/forms/${formId}`);
      const form = await response.json();
      setCurrentForm(form);
      setFormData({});
    } catch (error) {
      Alert.alert('Error', 'Failed to load form schema');
    }
  };

  const submitVisitor = async () => {
    setLoading(true);
    try {
      const visitorData = {
        data: formData,
        form_id: selectedForm,
        check_in_time: new Date().toISOString(),
        status: 'checked_in'
      };

      const response = await fetch(`${API_BASE}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitorData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Visitor checked in successfully');
        setFormData({});
        loadActiveVisitors();
      } else {
        Alert.alert('Error', 'Failed to check in visitor');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const checkOutVisitor = async (visitorId) => {
    try {
      const response = await fetch(`${API_BASE}/visitors/${visitorId}/checkout`, {
        method: 'PUT',
      });

      if (response.ok) {
        Alert.alert('Success', 'Visitor checked out');
        loadActiveVisitors();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check out visitor');
    }
  };

  const renderFormField = (field) => {
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
              {options.map((option) => (
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

  const defaultForm = {
    name: 'Default Visitor Form',
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
    ]
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Visitor Management</Text>
        <Text style={styles.headerSubtitle}>
          {activeVisitors.length} active visitors
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
            <Text style={styles.submitButtonText}>
              {loading ? 'Checking In...' : 'Check In Visitor'}
            </Text>
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
                  <Text style={styles.visitorTime}>
                    Checked in: {new Date(visitor.check_in_time).toLocaleTimeString()}
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
});

export default VisitorApp;