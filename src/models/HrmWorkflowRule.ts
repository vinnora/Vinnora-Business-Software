import mongoose, { Schema, Document } from 'mongoose';

export type HrmWorkflowObject = 'Employee' | 'LeaveRequest' | 'Attendance' | 'JobPosting' | 'Applicant' | 'PayrollRecord' | 'PerformanceReview';
export type HrmWorkflowEvent = 'created' | 'updated' | 'fieldChanged' | 'approved' | 'rejected';
export type HrmConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
export type HrmActionType = 'updateField' | 'sendEmail' | 'createActivity' | 'createOnboarding' | 'webhook' | 'notify';

export interface IHrmWorkflowRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  objectType: HrmWorkflowObject;
  triggerEvent: HrmWorkflowEvent;
  watchFields?: string[];
  conditions: Array<{ field: string; operator: HrmConditionOperator; value?: any }>;
  conditionLogic: 'AND' | 'OR';
  actions: Array<{ type: HrmActionType; params: Record<string, any> }>;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HrmWorkflowRuleSchema = new Schema<IHrmWorkflowRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    objectType: {
      type: String,
      enum: ['Employee', 'LeaveRequest', 'Attendance', 'JobPosting', 'Applicant', 'PayrollRecord', 'PerformanceReview'],
      required: true,
    },
    triggerEvent: {
      type: String,
      enum: ['created', 'updated', 'fieldChanged', 'approved', 'rejected'],
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
      type: { type: String, enum: ['updateField', 'sendEmail', 'createActivity', 'createOnboarding', 'webhook', 'notify'], required: true },
      params: { type: Schema.Types.Mixed, default: {} },
    }],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.HrmWorkflowRule ||
  mongoose.model<IHrmWorkflowRule>('HrmWorkflowRule', HrmWorkflowRuleSchema);
