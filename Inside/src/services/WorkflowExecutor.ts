import {
  Workflow,
  WorkflowNode,
  WorkflowExecution,
  ExecutionContext,
  ExecutionHistory,
  Condition,
} from '../types/workflow';

export class WorkflowExecutor {
  private workflow: Workflow;
  private execution: WorkflowExecution;
  private onNodeComplete?: (nodeId: string, result: any) => void;
  private onWorkflowComplete?: (execution: WorkflowExecution) => void;
  private serverUrl: string;
  private deviceToken?: string;

  constructor(
    workflow: Workflow,
    context: ExecutionContext,
    serverUrl: string,
    deviceToken?: string
  ) {
    this.workflow = workflow;
    this.serverUrl = serverUrl;
    this.deviceToken = deviceToken;
    
    this.execution = {
      id: `exec_${Date.now()}`,
      workflowId: workflow.id,
      status: 'pending',
      startedAt: new Date(),
      context,
      history: [],
    };
  }

  // Set callbacks
  onNodeCompleted(callback: (nodeId: string, result: any) => void) {
    this.onNodeComplete = callback;
    return this;
  }

  onWorkflowCompleted(callback: (execution: WorkflowExecution) => void) {
    this.onWorkflowComplete = callback;
    return this;
  }

  // Start execution
  async start(): Promise<WorkflowExecution> {
    try {
      this.execution.status = 'in_progress';
      
      if (!this.workflow.startNodeId) {
        throw new Error('No start node defined in workflow');
      }

      const startNode = this.workflow.nodes.find(n => n.id === this.workflow.startNodeId);
      if (!startNode) {
        throw new Error('Start node not found');
      }

      await this.executeNode(startNode);
      
      return this.execution;
    } catch (error: any) {
      this.execution.status = 'failed';
      throw error;
    }
  }

  // Execute a single node
  private async executeNode(node: WorkflowNode): Promise<void> {
    const startTime = new Date();
    this.execution.currentNodeId = node.id;

    try {
      let result: any;

      switch (node.type) {
        case 'form':
          result = await this.executeFormNode(node);
          break;
        case 'approval':
          result = await this.executeApprovalNode(node);
          break;
        case 'condition':
          result = await this.executeConditionNode(node);
          break;
        case 'notification':
          result = await this.executeNotificationNode(node);
          break;
        case 'delay':
          result = await this.executeDelayNode(node);
          break;
        case 'assignment':
          result = await this.executeAssignmentNode(node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Record success
      const historyEntry: ExecutionHistory = {
        nodeId: node.id,
        startedAt: startTime,
        completedAt: new Date(),
        status: 'success',
        output: result,
      };
      this.execution.history.push(historyEntry);

      // Notify callback
      if (this.onNodeComplete) {
        this.onNodeComplete(node.id, result);
      }

      // Find next nodes
      const nextNodeIds = this.getNextNodes(node, result);
      
      if (nextNodeIds.length === 0) {
        // No more nodes, workflow complete
        this.execution.status = 'completed';
        this.execution.completedAt = new Date();
        
        if (this.onWorkflowComplete) {
          this.onWorkflowComplete(this.execution);
        }
      } else {
        // Execute next nodes in parallel
        await Promise.all(
          nextNodeIds.map(nodeId => {
            const nextNode = this.workflow.nodes.find(n => n.id === nodeId);
            if (nextNode) {
              return this.executeNode(nextNode);
            }
          })
        );
      }
    } catch (error: any) {
      // Record failure
      const historyEntry: ExecutionHistory = {
        nodeId: node.id,
        startedAt: startTime,
        completedAt: new Date(),
        status: 'failed',
        error: error.message,
      };
      this.execution.history.push(historyEntry);

      // Stop execution on error
      this.execution.status = 'failed';
      throw error;
    }
  }

  // Get next nodes based on current node and conditions
  private getNextNodes(node: WorkflowNode, nodeResult: any): string[] {
    if (node.type === 'condition') {
      // For condition nodes, evaluate conditions to determine path
      const connections = this.workflow.connections.filter(c => c.fromNode === node.id);
      
      for (const connection of connections) {
        if (connection.condition && this.evaluateCondition(connection.condition, nodeResult)) {
          return [connection.toNode];
        }
      }
      
      // Default path if no conditions match
      return node.nextNodes.slice(0, 1);
    }
    
    // For other nodes, follow all connections
    return node.nextNodes;
  }

  // Evaluate a condition
  private evaluateCondition(condition: Condition, data: any): boolean {
    const fieldValue = data[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'is_empty':
        return !fieldValue || fieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '';
      default:
        return false;
    }
  }

  // Node execution implementations
  private async executeFormNode(node: WorkflowNode): Promise<any> {
    // In a real implementation, this would show a form UI and wait for submission
    // For now, we'll simulate with existing form data from context
    const formData = this.execution.context.formData || {};
    
    // Validate required fields
    if (node.config.formFields) {
      for (const field of node.config.formFields) {
        if (field.required && !formData[field.id]) {
          throw new Error(`Required field missing: ${field.label}`);
        }
      }
    }
    
    return formData;
  }

  private async executeApprovalNode(node: WorkflowNode): Promise<any> {
    // In a real implementation, this would send approval requests and wait
    // For now, we'll simulate auto-approval
    console.log(`Approval required: ${node.name}`);
    
    return {
      approved: true,
      approvedBy: 'system',
      approvedAt: new Date(),
    };
  }

  private async executeConditionNode(node: WorkflowNode): Promise<any> {
    // Evaluate conditions based on current context
    const data = this.execution.context.formData || {};
    const conditions = node.config.conditions || [];
    const logic = node.config.conditionLogic || 'and';
    
    let results = conditions.map(condition => ({
      condition,
      result: this.evaluateCondition(condition, data),
    }));
    
    const passed = logic === 'and' 
      ? results.every(r => r.result)
      : results.some(r => r.result);
    
    return { passed, results };
  }

  private async executeNotificationNode(node: WorkflowNode): Promise<any> {
    // Send notification via API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.deviceToken) {
      headers['X-Device-Token'] = this.deviceToken;
    }
    
    try {
      const response = await fetch(`${this.serverUrl}/notifications`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: node.config.notificationType,
          recipients: node.config.recipients,
          template: node.config.template,
          context: this.execution.context,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send notification');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Notification error:', error);
      // Don't fail workflow on notification errors
      return { error: 'Notification failed' };
    }
  }

  private async executeDelayNode(node: WorkflowNode): Promise<any> {
    const delayMs = (node.config.delayAmount || 0) * 
      (node.config.delayUnit === 'minutes' ? 60000 :
       node.config.delayUnit === 'hours' ? 3600000 :
       node.config.delayUnit === 'days' ? 86400000 : 1000);
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return { delayed: delayMs };
  }

  private async executeAssignmentNode(node: WorkflowNode): Promise<any> {
    // Assign task to user/role
    console.log(`Assigning to: ${node.config.assignTo}`);
    
    return {
      assignedTo: node.config.assignTo,
      assignedAt: new Date(),
    };
  }

  // Save execution state
  async saveExecution(): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.deviceToken) {
      headers['X-Device-Token'] = this.deviceToken;
    }
    
    try {
      await fetch(`${this.serverUrl}/workflow-executions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this.execution),
      });
    } catch (error) {
      console.error('Failed to save execution:', error);
    }
  }
}