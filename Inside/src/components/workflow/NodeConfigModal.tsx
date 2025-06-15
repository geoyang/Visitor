import React, { useState } from 'react';
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
import { WorkflowNode, FormField, Condition, NodeConfig } from '../../types/workflow';
import { useTheme } from '../../contexts/ThemeContext';

interface NodeConfigModalProps {
  visible: boolean;
  node: WorkflowNode | null;
  onClose: () => void;
  onSave: (node: WorkflowNode) => void;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({
  visible,
  node,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const [editedNode, setEditedNode] = useState<WorkflowNode | null>(node);

  React.useEffect(() => {
    setEditedNode(node);
  }, [node]);

  if (!editedNode) return null;

  const handleSave = () => {
    if (!editedNode.name.trim()) {
      Alert.alert('Error', 'Node name is required');
      return;
    }
    onSave(editedNode);
    onClose();
  };

  const updateConfig = (updates: Partial<NodeConfig>) => {
    setEditedNode({
      ...editedNode,
      config: { ...editedNode.config, ...updates },
    });
  };

  const renderFormConfig = () => {
    const fields = editedNode.config.formFields || [];

    const addField = () => {
      const newField: FormField = {
        id: `field_${Date.now()}`,
        type: 'text',
        label: 'New Field',
        required: false,
      };
      updateConfig({ formFields: [...fields, newField] });
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
      const updatedFields = fields.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      );
      updateConfig({ formFields: updatedFields });
    };

    const removeField = (fieldId: string) => {
      updateConfig({ formFields: fields.filter(f => f.id !== fieldId) });
    };

    return (
      <View style={styles.configSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Form Fields
        </Text>
        
        {fields.map((field) => (
          <View key={field.id} style={[styles.fieldCard, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={field.label}
              onChangeText={(text) => updateField(field.id, { label: text })}
              placeholder="Field Label"
              placeholderTextColor={theme.colors.textSecondary}
            />
            
            <View style={styles.fieldRow}>
              <TouchableOpacity
                style={[styles.fieldTypeButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  // TODO: Show field type picker
                  Alert.alert('Field Type', 'Type selector coming soon!');
                }}
              >
                <Text style={styles.fieldTypeText}>{field.type}</Text>
              </TouchableOpacity>
              
              <View style={styles.requiredToggle}>
                <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>
                  Required
                </Text>
                <Switch
                  value={field.required}
                  onValueChange={(value) => updateField(field.id, { required: value })}
                  trackColor={{ false: '#767577', true: theme.colors.primary }}
                />
              </View>
              
              <TouchableOpacity
                onPress={() => removeField(field.id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={addField}
        >
          <Text style={styles.addButtonText}>+ Add Field</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderApprovalConfig = () => {
    return (
      <View style={styles.configSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Approval Settings
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Approval Type
          </Text>
          <View style={styles.radioGroup}>
            {['all', 'any', 'threshold'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioButton,
                  editedNode.config.approvalType === type && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => updateConfig({ approvalType: type as any })}
              >
                <Text style={[
                  styles.radioText,
                  editedNode.config.approvalType === type && { color: 'white' }
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {editedNode.config.approvalType === 'threshold' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Minimum Approvals
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={String(editedNode.config.threshold || 1)}
              onChangeText={(text) => updateConfig({ threshold: parseInt(text) || 1 })}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        )}
      </View>
    );
  };

  const renderConditionConfig = () => {
    const conditions = editedNode.config.conditions || [];

    const addCondition = () => {
      const newCondition: Condition = {
        field: '',
        operator: 'equals',
        value: '',
      };
      updateConfig({ conditions: [...conditions, newCondition] });
    };

    return (
      <View style={styles.configSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Conditions
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Logic
          </Text>
          <View style={styles.radioGroup}>
            {['and', 'or'].map((logic) => (
              <TouchableOpacity
                key={logic}
                style={[
                  styles.radioButton,
                  editedNode.config.conditionLogic === logic && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => updateConfig({ conditionLogic: logic as any })}
              >
                <Text style={[
                  styles.radioText,
                  editedNode.config.conditionLogic === logic && { color: 'white' }
                ]}>
                  {logic.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {conditions.map((condition, index) => (
          <View key={index} style={[styles.conditionCard, { backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={condition.field}
              onChangeText={(text) => {
                const updated = [...conditions];
                updated[index] = { ...condition, field: text };
                updateConfig({ conditions: updated });
              }}
              placeholder="Field name"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <Text style={[styles.conditionOperator, { color: theme.colors.text }]}>
              {condition.operator}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              value={String(condition.value)}
              onChangeText={(text) => {
                const updated = [...conditions];
                updated[index] = { ...condition, value: text };
                updateConfig({ conditions: updated });
              }}
              placeholder="Value"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        ))}
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={addCondition}
        >
          <Text style={styles.addButtonText}>+ Add Condition</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotificationConfig = () => {
    return (
      <View style={styles.configSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Notification Settings
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Type
          </Text>
          <View style={styles.radioGroup}>
            {['email', 'sms', 'push'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioButton,
                  editedNode.config.notificationType === type && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => updateConfig({ notificationType: type as any })}
              >
                <Text style={[
                  styles.radioText,
                  editedNode.config.notificationType === type && { color: 'white' }
                ]}>
                  {type.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Template
          </Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text }]}
            value={editedNode.config.template || ''}
            onChangeText={(text) => updateConfig({ template: text })}
            placeholder="Enter notification template..."
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    );
  };

  const renderNodeTypeConfig = () => {
    switch (editedNode.type) {
      case 'form':
        return renderFormConfig();
      case 'approval':
        return renderApprovalConfig();
      case 'condition':
        return renderConditionConfig();
      case 'notification':
        return renderNotificationConfig();
      default:
        return (
          <Text style={[styles.comingSoon, { color: theme.colors.textSecondary }]}>
            Configuration for {editedNode.type} nodes coming soon!
          </Text>
        );
    }
  };

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
            <Text style={styles.modalTitle}>Configure {editedNode.type} Node</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Node Name
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={editedNode.name}
                onChangeText={(text) => setEditedNode({ ...editedNode, name: text })}
                placeholder="Enter node name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Description
              </Text>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text }]}
                value={editedNode.description || ''}
                onChangeText={(text) => setEditedNode({ ...editedNode, description: text })}
                placeholder="Optional description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
            
            {renderNodeTypeConfig()}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
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
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
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
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  configSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fieldCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  fieldTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  fieldTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#ef4444',
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
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  conditionCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  conditionOperator: {
    fontSize: 14,
    marginVertical: 8,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default NodeConfigModal;