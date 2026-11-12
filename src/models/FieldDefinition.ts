import mongoose, { Schema, Document } from 'mongoose';

/**
 * A custom field, or an override of a built-in field (isOverride = true:
 * label / help text / required / picklist values only).
 */
export interface IFieldDefinition extends Document {
  orgId: string;
  objectApiName: string;
  apiName: string;
  label: string;
  type: string;
  isOverride: boolean;
  required: boolean;
  unique: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  picklistValues?: { value: string; label?: string; active?: boolean; isDefault?: boolean; color?: string }[];
  restrictedPicklist?: boolean;
  referenceTo?: string;
  formula?: string;
  returnType?: string;
  defaultValue?: unknown;
  helpText?: string;
  description?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const FieldDefinitionSchema = new Schema<IFieldDefinition>(
  {
    orgId: { type: String, required: true, index: true },
    objectApiName: { type: String, required: true, index: true },
    apiName: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    isOverride: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    unique: { type: Boolean, default: false },
    length: { type: Number },
    precision: { type: Number },
    scale: { type: Number },
    picklistValues: [
      {
        _id: false,
        value: { type: String, required: true },
        label: { type: String },
        active: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: false },
        color: { type: String },
      },
    ],
    restrictedPicklist: { type: Boolean },
    referenceTo: { type: String },
    formula: { type: String },
    returnType: { type: String },
    defaultValue: { type: Schema.Types.Mixed },
    helpText: { type: String },
    description: { type: String },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FieldDefinitionSchema.index({ orgId: 1, objectApiName: 1, apiName: 1 }, { unique: true });

export default mongoose.models.FieldDefinition ||
  mongoose.model<IFieldDefinition>('FieldDefinition', FieldDefinitionSchema);
