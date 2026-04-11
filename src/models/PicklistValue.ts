import mongoose, { Schema, Document } from 'mongoose';

/**
 * Customizable picklist values used by Setup. Lets users edit
 * stages, statuses, sources, industries, etc. without code changes.
 *
 * Common keys: lead.status, lead.source, opportunity.stage,
 * case.status, case.priority, case.origin, account.industry,
 * account.type, workOrder.status
 */
export interface IPicklistValue extends Document {
  userId: string;
  orgId?: string;
  picklistKey: string;
  value: string;
  label: string;
  order: number;
  isDefault: boolean;
  active: boolean;
  color?: string;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PicklistValueSchema = new Schema<IPicklistValue>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    picklistKey: { type: String, required: true, index: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    color: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.PicklistValue ||
  mongoose.model<IPicklistValue>('PicklistValue', PicklistValueSchema);
