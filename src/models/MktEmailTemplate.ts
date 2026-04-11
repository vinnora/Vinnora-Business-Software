import mongoose, { Schema, Document } from 'mongoose';

export interface IMktEmailTemplate extends Document {
  userId: string;
  orgId?: string;
  name: string;
  category?: string;
  subject: string;
  bodyHtml: string;
  thumbnailUrl?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MktEmailTemplateSchema = new Schema<IMktEmailTemplate>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['Newsletter', 'Promotional', 'Transactional', 'Welcome', 'Other'],
      default: 'Other',
    },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    thumbnailUrl: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.MktEmailTemplate ||
  mongoose.model<IMktEmailTemplate>('MktEmailTemplate', MktEmailTemplateSchema);
