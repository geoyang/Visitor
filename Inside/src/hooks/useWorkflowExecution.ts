import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Workflow, WorkflowExecution, ExecutionContext } from '../types/workflow';
import { WorkflowExecutor } from '../services/WorkflowExecutor';
import { useSimpleDeviceConfig } from '../contexts/SimpleDeviceConfig';

interface UseWorkflowExecutionResult {
  activeWorkflows: Workflow[];
  isLoading: boolean;
  executeWorkflow: (workflow: Workflow, context: ExecutionContext) => Promise<WorkflowExecution | null>;
  executeWorkflowsForTrigger: (trigger: string, context: ExecutionContext) => Promise<void>;
}

export const useWorkflowExecution = (): UseWorkflowExecutionResult => {
  const { config } = useSimpleDeviceConfig();
  const [activeWorkflows, setActiveWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (config) {
      fetchActiveWorkflows();
    }
  }, [config]);

  const fetchActiveWorkflows = async () => {
    if (!config) return;

    try {
      setIsLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.deviceToken) {
        headers['X-Device-Token'] = config.deviceToken;
      }

      const response = await fetch(`${config.serverUrl}/device/workflows`, { headers });
      if (response.ok) {
        const workflows = await response.json();
        setActiveWorkflows(workflows);
      } else {
        console.error('Failed to fetch workflows');
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeWorkflow = async (
    workflow: Workflow,
    context: ExecutionContext
  ): Promise<WorkflowExecution | null> => {
    if (!config) return null;

    try {
      const executor = new WorkflowExecutor(
        workflow,
        context,
        config.serverUrl,
        config.deviceToken
      );

      executor.onNodeCompleted((nodeId, result) => {
        console.log(`Node ${nodeId} completed:`, result);
      });

      executor.onWorkflowCompleted(async (execution) => {
        console.log('Workflow completed:', execution);
        await executor.saveExecution();
      });

      const execution = await executor.start();
      return execution;
    } catch (error: any) {
      Alert.alert('Workflow Error', error.message);
      return null;
    }
  };

  const executeWorkflowsForTrigger = async (
    trigger: string,
    context: ExecutionContext
  ): Promise<void> => {
    // Find all workflows that match this trigger
    const triggeredWorkflows = activeWorkflows.filter(w => 
      w.trigger === trigger && w.status === 'active'
    );

    if (triggeredWorkflows.length === 0) {
      return;
    }

    // Execute workflows in parallel
    await Promise.all(
      triggeredWorkflows.map(workflow => executeWorkflow(workflow, context))
    );
  };

  return {
    activeWorkflows,
    isLoading,
    executeWorkflow,
    executeWorkflowsForTrigger,
  };
};