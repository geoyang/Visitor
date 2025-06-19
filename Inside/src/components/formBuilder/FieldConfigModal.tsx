import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { FormField, FormFieldOption, ValidationRule } from '../../types/formBuilder';
import { useTheme } from '../../contexts/EnhancedThemeContext';

interface FieldConfigModalProps {
  visible: boolean;
  field: FormField | null;
  onClose: () => void;
  onSave: (field: FormField) => void;
}

const FieldConfigModal: React.FC<FieldConfigModalProps> = ({
  visible,
  field,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [editedField, setEditedField] = useState<FormField | null>(field);

  React.useEffect(() => {
    setEditedField(field);
  }, [field]);

  // Automatically add email validation when field type is email
  useEffect(() => {
    if (editedField && editedField.type === 'email') {
      const validation = editedField.validation || [];
      const hasEmailValidation = validation.some(rule => rule.type === 'email');
      
      if (!hasEmailValidation) {
        const newEmailRule: ValidationRule = {
          type: 'email',
          message: 'Please enter a valid email address',
        };
        updateField({ validation: [...validation, newEmailRule] });
      }
    }
  }, [editedField?.type]);

  // Automatically add number validation when field type is number
  useEffect(() => {
    if (editedField && editedField.type === 'number') {
      const validation = editedField.validation || [];
      const hasNumberValidation = validation.some(rule => rule.type === 'number');
      
      if (!hasNumberValidation) {
        const newNumberRule: ValidationRule = {
          type: 'number',
          message: 'Please enter a valid number',
        };
        updateField({ validation: [...validation, newNumberRule] });
      }
    }
  }, [editedField?.type]);

  // Automatically add phone validation when field type is phone
  useEffect(() => {
    if (editedField && editedField.type === 'phone') {
      const validation = editedField.validation || [];
      const hasPhoneValidation = validation.some(rule => rule.type === 'phone');
      
      if (!hasPhoneValidation) {
        const newPhoneRule: ValidationRule = {
          type: 'phone',
          message: 'Please enter a valid phone number',
        };
        updateField({ validation: [...validation, newPhoneRule] });
      }
    }
  }, [editedField?.type]);

  if (!editedField) return null;

  const handleSave = () => {
    if (!editedField.label.trim()) {
      Alert.alert('Error', 'Field label is required');
      return;
    }
    onSave(editedField);
    onClose();
  };

  const updateField = (updates: Partial<FormField>) => {
    setEditedField({ ...editedField, ...updates });
  };

  const addOption = () => {
    const options = editedField.options || [];
    const newOption: FormFieldOption = {
      id: `option_${Date.now()}`,
      label: `Option ${options.length + 1}`,
      value: `option${options.length + 1}`,
    };
    updateField({ options: [...options, newOption] });
  };

  const updateOption = (optionId: string, updates: Partial<FormFieldOption>) => {
    const options = editedField.options || [];
    const updatedOptions = options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    updateField({ options: updatedOptions });
  };

  const removeOption = (optionId: string) => {
    const options = editedField.options || [];
    updateField({ options: options.filter(opt => opt.id !== optionId) });
  };

  const addValidationRule = () => {
    const validation = editedField.validation || [];
    const newRule: ValidationRule = {
      type: 'required',
      message: 'This field is required',
    };
    updateField({ validation: [...validation, newRule] });
  };

  const updateValidationRule = (index: number, updates: Partial<ValidationRule>) => {
    const validation = editedField.validation || [];
    const updatedValidation = [...validation];
    updatedValidation[index] = { ...updatedValidation[index], ...updates };
    updateField({ validation: updatedValidation });
  };

  const removeValidationRule = (index: number) => {
    const validation = editedField.validation || [];
    updateField({ validation: validation.filter((_, i) => i !== index) });
  };

  const renderBasicSettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Basic Settings
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Label *</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
          value={editedField.label}
          onChangeText={(text) => updateField({ label: text })}
          placeholder="Enter field label"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
        <TextInput
          style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
          value={editedField.description || ''}
          onChangeText={(text) => updateField({ description: text })}
          placeholder="Optional field description"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      {['text', 'email', 'phone', 'number', 'textarea'].includes(editedField.type) && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Placeholder</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
            value={editedField.placeholder || ''}
            onChangeText={(text) => updateField({ placeholder: text })}
            placeholder="Enter placeholder text"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      )}

      <View style={styles.switchGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Required Field</Text>
        <Switch
          value={editedField.required}
          onValueChange={(value) => updateField({ required: value })}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
        />
      </View>
    </View>
  );

  const renderOptionsSettings = () => {
    if (!['select', 'radio', 'checkbox', 'multiselect'].includes(editedField.type)) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Options
        </Text>
        
        {(editedField.options || []).map((option, index) => (
          <View key={option.id} style={[styles.optionCard, { backgroundColor: theme.colors.background }]}>
            <View style={styles.optionInputs}>
              <TextInput
                style={[styles.input, { flex: 1, color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
                value={option.label}
                onChangeText={(text) => updateOption(option.id, { label: text })}
                placeholder="Option label"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 8, color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
                value={option.value}
                onChangeText={(text) => updateOption(option.id, { value: text })}
                placeholder="Option value"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <TouchableOpacity
              onPress={() => removeOption(option.id)}
              style={styles.removeButton}
            >
              <Text style={[styles.removeButtonText, { color: theme.colors.error }]}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={addOption}
        >
          <Text style={styles.addButtonText}>+ Add Option</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAdvancedSettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Advanced Settings
      </Text>
      
      {editedField.type === 'textarea' && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Rows</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
            value={String(editedField.rows || 4)}
            onChangeText={(text) => updateField({ rows: parseInt(text) || 4 })}
            keyboardType="numeric"
            placeholder="4"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      )}

      {['text', 'textarea', 'email', 'phone'].includes(editedField.type) && (
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Max Length</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
            value={editedField.maxLength ? String(editedField.maxLength) : ''}
            onChangeText={(text) => updateField({ maxLength: text ? parseInt(text) : undefined })}
            keyboardType="numeric"
            placeholder="No limit"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      )}

      {editedField.type === 'number' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Minimum Value</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
              value={editedField.minValue ? String(editedField.minValue) : ''}
              onChangeText={(text) => updateField({ minValue: text ? parseFloat(text) : undefined })}
              keyboardType="numeric"
              placeholder="No minimum"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Maximum Value</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
              value={editedField.maxValue ? String(editedField.maxValue) : ''}
              onChangeText={(text) => updateField({ maxValue: text ? parseFloat(text) : undefined })}
              keyboardType="numeric"
              placeholder="No maximum"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </>
      )}

      {editedField.type === 'file' && (
        <>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Max Files</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
              value={String(editedField.maxFiles || 1)}
              onChangeText={(text) => updateField({ maxFiles: parseInt(text) || 1 })}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          
          <View style={styles.switchGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Allow Multiple</Text>
            <Switch
              value={editedField.multiple || false}
              onValueChange={(value) => updateField({ multiple: value })}
              trackColor={{ false: '#767577', true: theme.colors.primary }}
            />
          </View>
        </>
      )}

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Help Text</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
          value={editedField.helpText || ''}
          onChangeText={(text) => updateField({ helpText: text })}
          placeholder="Additional help for users"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>
    </View>
  );

  const renderValidationSettings = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Validation Rules
      </Text>
      
      {(editedField.validation || []).map((rule, index) => (
        <View key={index} style={[styles.validationCard, { backgroundColor: theme.colors.background }]}>
          <View style={styles.validationInputs}>
            <TextInput
              style={[styles.input, { flex: 1, color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
              value={rule.type}
              onChangeText={(text) => updateValidationRule(index, { type: text as any })}
              placeholder="Validation type"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { flex: 2, marginLeft: 8, color: theme.colors.text, borderColor: theme.colors.textSecondary }]}
              value={rule.message || ''}
              onChangeText={(text) => updateValidationRule(index, { message: text })}
              placeholder="Error message"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          <TouchableOpacity
            onPress={() => removeValidationRule(index)}
            style={styles.removeButton}
          >
            <Text style={[styles.removeButtonText, { color: theme.colors.error }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={addValidationRule}
      >
        <Text style={styles.addButtonText}>+ Add Validation Rule</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.modalTitle}>
              Configure {editedField.type} Field
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {renderBasicSettings()}
            {renderOptionsSettings()}
            {renderAdvancedSettings()}
            {renderValidationSettings()}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>Save Field</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionInputs: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  validationCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  validationInputs: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
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
});

export default FieldConfigModal;