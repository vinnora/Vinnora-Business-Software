import mongoose, { Schema, Document } from 'mongoose';

export interface IValidationRule extends Document {
  orgId: string;
  objectApiName: string;
  name: string;
  description?: string;
  active: boolean;
  mode: 'builder' | 'formula';
  conditions: { field: string; operator: string; value?: string }[];
  logic?: string;
  formula?: string;
  errorMessage: string;
  errorField?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ValidationRuleSchema = new Schema<IValidationRule>(
  {
    orgId: { type: String, required: true, index: true },
    objectApiName: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    mode: { type: String, enum: ['builder', 'formula'], default: 'builder' },
    conditions: [
      {
        _id: false,
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: String },
      },
    ],
    logic: { type: String },
    formula: { type: String },
    errorMessage: { type: String, required: true },
    errorField: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.ValidationRule ||
  mongoose.model<IValidationRule>('ValidationRule', ValidationRuleSchema);
