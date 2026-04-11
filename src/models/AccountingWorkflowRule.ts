import mongoose, { Schema, Document } from 'mongoose';

export type AcctWorkflowObject = 'Transaction' | 'Invoice' | 'Bill' | 'PayrollEntry' | 'Asset' | 'Budget';
export type AcctWorkflowEvent = 'created' | 'updated' | 'fieldChanged' | 'overdue' | 'paid';
export type AcctConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
export type AcctActionType = 'updateField' | 'sendEmail' | 'createActivity' | 'webhook' | 'flagForReview' | 'notify';

export interface IAccountingWorkflowRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  objectType: AcctWorkflowObject;
  triggerEvent: AcctWorkflowEvent;
  watchFields?: string[];
  conditions: Array<{ field: string; operator: AcctConditionOperator; value?: any }>;
  conditionLogic: 'AND' | 'OR';
  actions: Array<{ type: AcctActionType; params: Record<string, any> }>;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountingWorkflowRuleSchema = new Schema<IAccountingWorkflowRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    objectType: {
      type: String,
      enum: ['Transaction', 'Invoice', 'Bill', 'PayrollEntry', 'Asset', 'Budget'],
      required: true,
    },
    triggerEvent: {
      type: String,
      enum: ['created', 'updated', 'fieldChanged', 'overdue', 'paid'],
      required: true,
    },
    watchFields: [{ type: String }],
    conditions: [{
      field: { type: String },
      operator: { type: String, enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'] },
      value: { type: Schema.Types.Mixed },
    }],
    conditionLogic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    actions: [{
      type: { type: String, enum: ['updateField', 'sendEmail', 'createActivity', 'webhook', 'flagForReview', 'notify'], required: true },
      params: { type: Schema.Types.Mixed, default: {} },
    }],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.AccountingWorkflowRule ||
  mongoose.model<IAccountingWorkflowRule>('AccountingWorkflowRule', AccountingWorkflowRuleSchema);
