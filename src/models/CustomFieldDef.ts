import mongoose, { Schema, Document } from 'mongoose';

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'picklist' | 'multipicklist' | 'url' | 'email';

export interface ICustomFieldDef extends Document {
  userId: string;
  orgId?: string;
  objectType: 'Lead' | 'Contact' | 'Account' | 'Opportunity' | 'Case' | 'WorkOrder';
  name: string;
  apiName: string;
  type: CustomFieldType;
  required: boolean;
  picklistValues?: string[];
  defaultValue?: any;
  helpText?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFieldDefSchema = new Schema<ICustomFieldDef>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    objectType: {
      type: String,
      enum: ['Lead', 'Contact', 'Account', 'Opportunity', 'Case', 'WorkOrder'],
      required: true,
    },
    name: { type: String, required: true },
    apiName: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'picklist', 'multipicklist', 'url', 'email'],
      required: true,
    },
    required: { type: Boolean, default: false },
    picklistValues: [{ type: String }],
    defaultValue: { type: Schema.Types.Mixed },
    helpText: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.CustomFieldDef ||
  mongoose.model<ICustomFieldDef>('CustomFieldDef', CustomFieldDefSchema);
