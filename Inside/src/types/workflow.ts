// Workflow system types for visitor management

export type WorkflowNodeType = 
  | 'form'
  | 'approval'
  | 'condition'
  | 'notification'
  | 'delay'
  | 'assignment';

export type WorkflowStatus = 
  | 'draft'
  | 'active'
  | 'inactive'
  | 'archived';

export type WorkflowTrigger = 
  | 'visitor_checkin'
  | 'form_submission'
  | 'manual'
  | 'schedule'
  | 'api';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  config: NodeConfig;
  position: {
    x: number;
    y: number;
  };
  nextNodes: string[]; // IDs of nodes this connects to
}

export interface NodeConfig {
  // Form node config
  formId?: string;
  formFields?: FormField[];
  
  // Approval node config
  approvers?: string[]; // User IDs
  approvalType?: 'all' | 'any' | 'threshold';
  threshold?: number;
  
  // Condition node config
  conditions?: Condition[];
  conditionLogic?: 'and' | 'or';
  
  // Notification node config
  notificationType?: 'email' | 'sms' | 'push' | 'in-app';
  recipients?: string[];
  template?: string;
  
  // Delay node config
  delayAmount?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  
  // Assignment node config
  assignTo?: string; // User ID or role
  assignmentType?: 'user' | 'role' | 'round-robin' | 'least-loaded';
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'date' | 'file' | 'signature';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  validation?: FieldValidation;
}

export interface FieldValidation {
  pattern?: string; // Regex pattern
  min?: number;
  max?: number;
  message?: string;
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface WorkflowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  condition?: Condition; // Optional condition for this path
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  startNodeId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  locationIds?: string[]; // Optional: limit to specific locations
  metadata?: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentNodeId?: string;
  startedAt: Date;
  completedAt?: Date;
  context: ExecutionContext;
  history: ExecutionHistory[];
}

export interface ExecutionContext {
  visitorId?: string;
  formData: Record<string, any>;
  variables: Record<string, any>;
  triggeredBy: string;
}

export interface ExecutionHistory {
  nodeId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
}

// Helper types for the workflow designer
export interface DraggedNode {
  type: WorkflowNodeType;
  name: string;
}

export interface DesignerState {
  selectedNodeId?: string;
  selectedConnectionId?: string;
  isConnecting: boolean;
  connectingFromNode?: string;
  zoom: number;
  pan: { x: number; y: number };
}