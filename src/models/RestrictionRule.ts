import mongoose, { Schema, Document } from 'mongoose';

/**
 * Restriction rule: users matching `appliesTo` only see records of the object
 * that match the record criteria (conditions + logic).
 */
export interface IRestrictionRule extends Document {
  orgId: string;
  objectApiName: string;
  name: string;
  description?: string;
  active: boolean;
  appliesTo: 'all' | 'profiles' | 'permissionSets' | 'users';
  appliesToIds: string[];
  conditions: { field: string; operator: string; value?: string }[];
  logic?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RestrictionRuleSchema = new Schema<IRestrictionRule>(
  {
    orgId: { type: String, required: true, index: true },
    objectApiName: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    appliesTo: { type: String, enum: ['all', 'profiles', 'permissionSets', 'users'], default: 'all' },
    appliesToIds: [{ type: String }],
    conditions: [
      {
        _id: false,
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: String },
      },
    ],
    logic: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.RestrictionRule ||
  mongoose.model<IRestrictionRule>('RestrictionRule', RestrictionRuleSchema);
