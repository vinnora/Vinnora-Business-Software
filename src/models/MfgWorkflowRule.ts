import mongoose, { Schema, Document } from 'mongoose';

export type MfgWorkflowObject = 'WorkOrder' | 'BOM' | 'Material' | 'QualityCheck' | 'Machine' | 'PurchaseRequisition';
export type MfgWorkflowEvent = 'created' | 'updated' | 'fieldChanged' | 'completed' | 'failed';
export type MfgConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
export type MfgActionType = 'updateField' | 'sendEmail' | 'createActivity' | 'createQualityCheck' | 'webhook' | 'notify';

export interface IMfgWorkflowRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  objectType: MfgWorkflowObject;
  triggerEvent: MfgWorkflowEvent;
  watchFields?: string[];
  conditions: Array<{ field: string; operator: MfgConditionOperator; value?: any }>;
  conditionLogic: 'AND' | 'OR';
  actions: Array<{ type: MfgActionType; params: Record<string, any> }>;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MfgWorkflowRuleSchema = new Schema<IMfgWorkflowRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    objectType: {
      type: String,
      enum: ['WorkOrder', 'BOM', 'Material', 'QualityCheck', 'Machine', 'PurchaseRequisition'],
      required: true,
    },
    triggerEvent: {
      type: String,
      enum: ['created', 'updated', 'fieldChanged', 'completed', 'failed'],
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
      type: { type: String, enum: ['updateField', 'sendEmail', 'createActivity', 'createQualityCheck', 'webhook', 'notify'], required: true },
      params: { type: Schema.Types.Mixed, default: {} },
    }],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.MfgWorkflowRule ||
  mongoose.model<IMfgWorkflowRule>('MfgWorkflowRule', MfgWorkflowRuleSchema);
