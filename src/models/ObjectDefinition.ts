import mongoose, { Schema, Document } from 'mongoose';

/** A custom object defined in Setup (built-in objects come from the code registry). */
export interface IObjectDefinition extends Document {
  orgId: string;
  apiName: string;
  label: string;
  pluralLabel: string;
  app: string;
  description?: string;
  nameFieldLabel: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ObjectDefinitionSchema = new Schema<IObjectDefinition>(
  {
    orgId: { type: String, required: true, index: true },
    apiName: { type: String, required: true },
    label: { type: String, required: true },
    pluralLabel: { type: String, required: true },
    app: {
      type: String,
      enum: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'],
      required: true,
    },
    description: { type: String },
    nameFieldLabel: { type: String, default: 'Name' },
    createdBy: { type: String },
  },
  { timestamps: true }
);

ObjectDefinitionSchema.index({ orgId: 1, apiName: 1 }, { unique: true });

export default mongoose.models.ObjectDefinition ||
  mongoose.model<IObjectDefinition>('ObjectDefinition', ObjectDefinitionSchema);
