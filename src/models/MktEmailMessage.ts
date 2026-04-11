import mongoose, { Schema, Document } from 'mongoose';

export interface IMktEmailMessage extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  name: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  bodyHtml: string;
  bodyText?: string;
  templateId?: string;
  status: string;
  scheduledAt?: Date;
  sentAt?: Date;
  recipientSegmentId?: string;
  recipientCount?: number;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktEmailMessageSchema = new Schema<IMktEmailMessage>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    fromName: { type: String },
    fromEmail: { type: String },
    replyTo: { type: String },
    bodyHtml: { type: String, default: '' },
    bodyText: { type: String },
    templateId: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'],
      default: 'Draft',
    },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    recipientSegmentId: { type: String },
    recipientCount: { type: Number, default: 0 },
    metrics: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktEmailMessage ||
  mongoose.model<IMktEmailMessage>('MktEmailMessage', MktEmailMessageSchema);
