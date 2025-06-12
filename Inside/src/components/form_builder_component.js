import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const FormBuilder = ({ visible, onClose, onSave, editingForm = null }) => {
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState([]);
  const [currentField, setCurrentField] = useState(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  useEffect(() => {
    if (editingForm) {
      setFormName(editingForm.name);
      setFormDescription(editingForm.description || '');
      setFields(editingForm.fields || []);
    } else {
      resetForm();
    }
  }, [editingForm, visible]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFields([]);
    setCurrentField(null);
  };

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Dropdown' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Checkbox' },
  ];

  const openFieldEditor = (field = null, index = null) => {
    setCurrentField(field ? { ...field, index } : {
      name: '',
      type: 'text',
      label: '',
      required: false,
      options: [],
      validation: {},
    });
    setShowFieldEditor(true);
  };

  const saveField = () => {
    if (!currentField.name || !currentField.label) {
      Alert.alert('Error', 'Field name and label are required');
      return;
    }

    const newFields = [...fields];
    if (currentField.index !== undefined) {
      newFields[currentField.index] = { ...currentField };
      delete newFields[currentField.index].index;
    } else {
      newFields.push({ ...currentField });
    }

    setFields(newFields);
    setShowFieldEditor(false);
    setCurrentField(null);
  };

  const deleteField = (index) => {
    Alert.alert(
      'Delete Field',
      'Are you sure you want to delete this field?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newFields = fields.filter((_, i) => i !== index);
            setFields(newFields);
          },
        },
      ]
    );
  };

  const moveField = (index, direction) => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
      setFields(newFields);
    }
  };

  const saveForm = () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Form name is required');
      return;
    }

    if (fields.length === 0) {
      Alert.alert('Error', 'At least one field is required');
      return;
    }

    const formData = {
      name: formName.trim(),
      description: formDescription.trim(),
      fields: fields,
      is_active: true,
    };

    onSave(formData);
    resetForm();
  };

  const addOption = () => {
    const newOptions = [...(currentField.options || []), ''];
    setCurrentField({ ...currentField, options: newOptions });
  };

  const updateOption = (index, value) => {
    const newOptions = [...currentField.options];
    newOptions[index] = value;
    setCurrentField({ ...currentField, options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = currentField.options.filter((_, i) => i !== index);
    setCurrentField({ ...currentField, options: newOptions });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingForm ? 'Edit Form' : 'Create Form'}
          </Text>
          <TouchableOpacity onPress={saveForm} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Form Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Form Details</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Form Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter form name"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Enter form description"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Fields */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Form Fields</Text>
              <TouchableOpacity
                style={styles.addFieldButton}
                onPress={() => openFieldEditor()}
              >
                <Text style={styles.addFieldButtonText}>+ Add Field</Text>
              </TouchableOpacity>
            </View>

            {fields.map((field, index) => (
              <View key={index} style={styles.fieldItem}>
                <View style={styles.fieldInfo}>
                  <Text style={styles.fieldName}>{field.label}</Text>
                  <Text style={styles.fieldType}>
                    {fieldTypes.find(t => t.value === field.type)?.label} 
                    {field.required && ' (Required)'}
                  </Text>
                </View>
                <View style={styles.fieldActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => moveField(index, 'up')}
                    disabled={index === 0}
                  >
                    <Text style={[styles.actionButtonText, index === 0 && styles.disabledText]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => moveField(index, 'down')}
                    disabled={index === fields.length - 1}
                  >
                    <Text style={[styles.actionButtonText, index === fields.length - 1 && styles.disabledText]}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openFieldEditor(field, index)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteField(index)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {fields.length === 0 && (
              <Text style={styles.emptyState}>No fields added yet</Text>
            )}
          </View>
        </ScrollView>

        {/* Field Editor Modal */}
        <Modal visible={showFieldEditor} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.fieldEditorModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {currentField?.index !== undefined ? 'Edit Field' : 'Add Field'}
                </Text>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Field Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={currentField?.name || ''}
                    onChangeText={(value) => setCurrentField({ ...currentField, name: value })}
                    placeholder="e.g., full_name"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Field Label *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={currentField?.label || ''}
                    onChangeText={(value) => setCurrentField({ ...currentField, label: value })}
                    placeholder="e.g., Full Name"
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Field Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {fieldTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.typeButton,
                          currentField?.type === type.value && styles.selectedType,
                        ]}
                        onPress={() => setCurrentField({ ...currentField, type: type.value })}
                      >
                        <Text style={[
                          styles.typeButtonText,
                          currentField?.type === type.value && styles.selectedTypeText,
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.fieldContainer}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.fieldLabel}>Required Field</Text>
                    <Switch
                      value={currentField?.required || false}
                      onValueChange={(value) => setCurrentField({ ...currentField, required: value })}
                    />
                  </View>
                </View>

                {currentField?.type === 'select' && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Options</Text>
                    {(currentField.options || []).map((option, index) => (
                      <View key={index} style={styles.optionContainer}>
                        <TextInput
                          style={[styles.textInput, styles.optionInput]}
                          value={option}
                          onChangeText={(value) => updateOption(index, value)}
                          placeholder={`Option ${index + 1}`}
                        />
                        <TouchableOpacity
                          style={styles.removeOptionButton}
                          onPress={() => removeOption(index)}
                        >
                          <Text style={styles.removeOptionText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                      <Text style={styles.addOptionText}>+ Add Option</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowFieldEditor(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={saveField}>
                  <Text style={styles.modalSaveButtonText}>Save Field</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
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
    height: 80,
    textAlignVertical: 'top',
  },
  addFieldButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addFieldButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  fieldType: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  actionButtonText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  disabledText: {
    color: '#d1d5db',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 18,
  },
  emptyState: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldEditorModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: isTablet ? '70%' : '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2937',
  },
  modalContent: {
    padding: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedType: {
    backgroundColor: '#2563eb',
  },
  typeButtonText: {
    color: '#374151',
    fontSize: 14,
  },
  selectedTypeText: {
    color: 'white',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    marginRight: 8,
  },
  removeOptionButton: {
    backgroundColor: '#fef2f2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeOptionText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addOptionButton: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addOptionText: {
    color: '#2563eb',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#374151',
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default FormBuilder;