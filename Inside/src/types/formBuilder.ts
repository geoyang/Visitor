// Form builder types for creating custom visitor forms

export type FormFieldType = 
  | 'text'
  | 'email' 
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'signature'
  | 'address'
  | 'website'
  | 'rating'
  | 'slider'
  | 'section'
  | 'divider'
  | 'html';

export type ValidationRule = {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'phone' | 'url' | 'number' | 'custom';
  value?: any;
  message?: string;
};

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
  selected?: boolean;
}

export interface FormFieldStyle {
  width?: 'full' | 'half' | 'third' | 'quarter';
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  margin?: number;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  
  // Field-specific configurations
  options?: FormFieldOption[]; // For select, radio, checkbox
  multiple?: boolean; // For select, file
  maxFiles?: number; // For file uploads
  acceptedTypes?: string[]; // For file uploads
  minValue?: number; // For number, rating, slider
  maxValue?: number; // For number, rating, slider
  step?: number; // For number, slider
  minDate?: string; // For date/datetime
  maxDate?: string; // For date/datetime
  rows?: number; // For textarea
  maxLength?: number; // For text fields
  pattern?: string; // For text validation
  
  // HTML content for html fields
  content?: string;
  
  // Conditional logic
  showWhen?: ConditionalRule[];
  
  // Validation rules
  validation?: ValidationRule[];
  
  // Styling
  style?: FormFieldStyle;
  
  // Position in form
  position: {
    row: number;
    column: number;
  };
  
  // Metadata
  helpText?: string;
  tooltip?: string;
  errorMessage?: string;
}

export interface ConditionalRule {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: any;
}

export interface FormLayout {
  columns: number;
  spacing: number;
  containerPadding: number;
  fieldSpacing: number;
  labelPosition: 'top' | 'left' | 'inside';
  submitButtonPosition: 'left' | 'center' | 'right' | 'full';
}

export interface FormTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  labelColor: string;
  borderColor: string;
  errorColor: string;
  successColor: string;
  fontFamily: string;
  fontSize: number;
  borderRadius: number;
}

export interface FormSettings {
  allowSave?: boolean; // Allow saving drafts
  showProgress?: boolean; // Show form progress
  multiStep?: boolean; // Multi-step form
  confirmSubmission?: boolean; // Show confirmation before submit
  redirectAfterSubmit?: string; // URL to redirect after submit
  submitButtonText?: string;
  cancelButtonText?: string;
  successMessage?: string;
  errorMessage?: string;
  autoSave?: boolean; // Auto-save drafts
  maxSubmissions?: number; // Limit number of submissions
  submissionDeadline?: string; // Form deadline
  requireAuthentication?: boolean;
  allowAnonymous?: boolean;
}

export interface CustomForm {
  id: string;
  name: string;
  description?: string;
  category: 'visitor' | 'contractor' | 'event' | 'survey' | 'feedback' | 'registration' | 'other';
  status: 'draft' | 'active' | 'inactive' | 'archived';
  
  // Form structure
  fields: FormField[];
  layout: FormLayout;
  theme: FormTheme;
  settings: FormSettings;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  locationIds?: string[]; // Optional: limit to specific locations
  
  // Usage statistics
  totalSubmissions?: number;
  lastSubmissionAt?: Date;
  averageCompletionTime?: number;
  
  // Version control
  version: number;
  previousVersions?: string[]; // IDs of previous versions
  
  // Integration
  workflowIds?: string[]; // Associated workflows
  notificationTemplates?: string[]; // Email/SMS templates
}

export interface FormSubmission {
  id: string;
  formId: string;
  submittedBy?: string; // User ID if authenticated
  submittedAt: Date;
  data: Record<string, any>; // Field ID -> value mapping
  status: 'draft' | 'submitted' | 'processed' | 'rejected';
  
  // Device/location info
  deviceId?: string;
  locationId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Processing info
  processedBy?: string;
  processedAt?: Date;
  processingNotes?: string;
  
  // Files (if any)
  attachments?: FormAttachment[];
  
  // Workflow execution
  workflowExecutionId?: string;
}

export interface FormAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
  fieldId: string; // Which field this file was uploaded to
}

// Form builder state types
export interface FormBuilderState {
  selectedFieldId?: string;
  draggedField?: DraggedField;
  previewMode: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface DraggedField {
  type: FormFieldType;
  label: string;
  fromPalette: boolean;
}

// Field configuration for the form builder palette
export interface FieldTypeConfig {
  type: FormFieldType;
  label: string;
  icon: string;
  category: 'basic' | 'advanced' | 'layout' | 'special';
  description: string;
  defaultConfig: Partial<FormField>;
}

// Form validation result
export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
  fieldErrors: Record<string, string[]>;
}

export interface FormValidationError {
  fieldId: string;
  message: string;
  type: string;
}

// Form analytics
export interface FormAnalytics {
  formId: string;
  totalViews: number;
  totalSubmissions: number;
  completionRate: number;
  averageTime: number;
  dropOffPoints: Array<{
    fieldId: string;
    dropOffRate: number;
  }>;
  fieldAnalytics: Array<{
    fieldId: string;
    totalResponses: number;
    uniqueResponses?: number;
    topResponses?: Array<{ value: string; count: number }>;
  }>;
}