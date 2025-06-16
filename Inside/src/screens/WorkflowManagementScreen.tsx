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
import { useTheme } from '../contexts/EnhancedThemeContext';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';
import WorkflowDesigner from '../components/WorkflowDesigner';
import NodeConfigModal from '../components/workflow/NodeConfigModal';
import {
  Workflow,
  WorkflowNode,
  WorkflowStatus,
  WorkflowTrigger,
} from '../types/workflow';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface WorkflowManagementScreenProps {
  onBack?: () => void;
}

const WorkflowManagementScreen: React.FC<WorkflowManagementScreenProps> = ({ onBack }) => {
  const { theme } = useTheme();
  const { config } = useSimpleDeviceConfig();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    if (!config) return;

    try {
      setIsLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/workflows`, { headers });
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      } else {
        console.error('Failed to fetch workflows');
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewWorkflow = () => {
    const newWorkflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name: 'New Workflow',
      status: 'draft',
      trigger: 'visitor_checkin',
      nodes: [],
      connections: [],
      startNodeId: '',
      createdBy: config?.deviceId || 'unknown',
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: config?.companyId || '',
    };

    setSelectedWorkflow(newWorkflow);
    setShowDesigner(true);
  };

  const saveWorkflow = async (workflow: Workflow) => {
    if (!config) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const isNew = !workflows.find(w => w.id === workflow.id);
      const url = isNew
        ? `${config.serverUrl}/workflows`
        : `${config.serverUrl}/workflows/${workflow.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(workflow),
      });

      if (response.ok) {
        Alert.alert('Success', 'Workflow saved successfully');
        await fetchWorkflows();
      } else {
        Alert.alert('Error', 'Failed to save workflow');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while saving workflow');
      console.error('Save workflow error:', error);
    }
  };

  const deleteWorkflow = (workflowId: string) => {
    Alert.alert(
      'Delete Workflow',
      'Are you sure you want to delete this workflow?',
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
                `${config.serverUrl}/workflows/${workflowId}`,
                { method: 'DELETE', headers }
              );

              if (response.ok) {
                Alert.alert('Success', 'Workflow deleted successfully');
                await fetchWorkflows();
              } else {
                Alert.alert('Error', 'Failed to delete workflow');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error while deleting workflow');
              console.error('Delete workflow error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleWorkflowStatus = async (workflow: Workflow) => {
    const newStatus: WorkflowStatus = workflow.status === 'active' ? 'inactive' : 'active';
    const updatedWorkflow = { ...workflow, status: newStatus };
    await saveWorkflow(updatedWorkflow);
  };

  const handleWorkflowChange = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleNodeEdit = (node: WorkflowNode) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  };

  const handleNodeSave = (updatedNode: WorkflowNode) => {
    if (!selectedWorkflow) return;

    const updatedNodes = selectedWorkflow.nodes.map(n =>
      n.id === updatedNode.id ? updatedNode : n
    );

    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: updatedNodes,
    };

    setSelectedWorkflow(updatedWorkflow);
    setShowNodeConfig(false);
  };

  const renderWorkflowCard = (workflow: Workflow) => {
    const statusColor = {
      draft: '#6b7280',
      active: '#10b981',
      inactive: '#f59e0b',
      archived: '#ef4444',
    }[workflow.status];

    return (
      <TouchableOpacity
        key={workflow.id}
        style={[styles.workflowCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => {
          setSelectedWorkflow(workflow);
          setShowDesigner(true);
        }}
      >
        <View style={styles.workflowHeader}>
          <Text style={[styles.workflowName, { color: theme.colors.text }]}>
            {workflow.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{workflow.status}</Text>
          </View>
        </View>
        
        {workflow.description && (
          <Text style={[styles.workflowDescription, { color: theme.colors.textSecondary }]}>
            {workflow.description}
          </Text>
        )}
        
        <View style={styles.workflowMeta}>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            Trigger: {workflow.trigger.replace('_', ' ')}
          </Text>
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
            {workflow.nodes.length} steps
          </Text>
        </View>
        
        <View style={styles.workflowActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => toggleWorkflowStatus(workflow)}
          >
            <Text style={styles.actionButtonText}>
              {workflow.status === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => deleteWorkflow(workflow.id)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (showDesigner && selectedWorkflow) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowDesigner(false);
              setSelectedWorkflow(null);
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{selectedWorkflow.name}</Text>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.success }]}
            onPress={() => saveWorkflow(selectedWorkflow)}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <WorkflowDesigner
          workflow={selectedWorkflow}
          onWorkflowChange={handleWorkflowChange}
          readOnly={false}
        />
        
        <NodeConfigModal
          visible={showNodeConfig}
          node={selectedNode}
          onClose={() => setShowNodeConfig(false)}
          onSave={handleNodeSave}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading workflows...
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
        <Text style={styles.headerTitle}>Workflow Management</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={createNewWorkflow}
        >
          <Text style={styles.createButtonText}>+ Create New Workflow</Text>
        </TouchableOpacity>
        
        {workflows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No workflows yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Create your first workflow to automate visitor processes
            </Text>
          </View>
        ) : (
          <View style={styles.workflowGrid}>
            {workflows.map(renderWorkflowCard)}
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
  workflowGrid: {
    flexDirection: isTablet ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  workflowCard: {
    width: isTablet ? '48%' : '100%',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workflowName: {
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
  workflowDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  workflowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
  },
  workflowActions: {
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

export default WorkflowManagementScreen;