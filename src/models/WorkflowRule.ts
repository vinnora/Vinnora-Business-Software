import mongoose, { Schema, Document } from 'mongoose';

export type WorkflowObject = 'Lead' | 'Opportunity' | 'Case' | 'Contact' | 'Account' | 'Activity';
export type WorkflowEvent = 'created' | 'updated' | 'fieldChanged';
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty';
export type ActionType =
  | 'createActivity'
  | 'updateField'
  | 'assignOwner'
  | 'sendEmail'
  | 'escalateCase'
  | 'createWorkOrder'
  | 'webhook';

export interface IWorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

export interface IWorkflowAction {
  type: ActionType;
  params: Record<string, any>;
}

export interface IWorkflowRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault?: boolean;
  objectType: WorkflowObject;
  triggerEvent: WorkflowEvent;
  watchFields?: string[];
  conditions: IWorkflowCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: IWorkflowAction[];
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowRuleSchema = new Schema<IWorkflowRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    objectType: {
      type: String,
      enum: ['Lead', 'Opportunity', 'Case', 'Contact', 'Account', 'Activity'],
      required: true,
    },
    triggerEvent: {
      type: String,
      enum: ['created', 'updated', 'fieldChanged'],
      required: true,
    },
    watchFields: [{ type: String }],
    conditions: [
      {
        field: { type: String, required: true },
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
          required: true,
        },
        value: { type: Schema.Types.Mixed },
      },
    ],
    conditionLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    actions: [
      {
        type: {
          type: String,
          enum: ['createActivity', 'updateField', 'assignOwner', 'sendEmail', 'escalateCase', 'createWorkOrder', 'webhook'],
          required: true,
        },
        params: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.WorkflowRule ||
  mongoose.model<IWorkflowRule>('WorkflowRule', WorkflowRuleSchema);
