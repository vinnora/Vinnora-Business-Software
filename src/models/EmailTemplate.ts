import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailTemplate extends Document {
  userId: string;
  orgId?: string;
  name: string;
  category?: string;
  subject: string;
  body: string;
  objectType?: 'Lead' | 'Contact' | 'Account' | 'Opportunity' | 'Case';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    category: { type: String },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    objectType: {
      type: String,
      enum: ['Lead', 'Contact', 'Account', 'Opportunity', 'Case'],
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.EmailTemplate ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
