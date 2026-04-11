import mongoose, { Schema, Document } from 'mongoose';

export interface IMktSmsMessage extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  name: string;
  body: string;
  senderId?: string;
  status: string;
  scheduledAt?: Date;
  sentAt?: Date;
  recipientSegmentId?: string;
  recipientCount?: number;
  metrics: {
    sent: number;
    delivered: number;
    clicked: number;
    failed: number;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktSmsMessageSchema = new Schema<IMktSmsMessage>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    name: { type: String, required: true },
    body: { type: String, required: true },
    senderId: { type: String },
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
      clicked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktSmsMessage ||
  mongoose.model<IMktSmsMessage>('MktSmsMessage', MktSmsMessageSchema);
