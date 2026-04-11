import mongoose, { Schema, Document } from 'mongoose';

export type ChannelType = 'email' | 'web' | 'chat' | 'phone' | 'social' | 'sms';

export interface IChannelMessage extends Document {
  userId: string;
  orgId?: string;
  channel: ChannelType;
  fromName?: string;
  fromAddress?: string;
  subject?: string;
  body: string;
  receivedAt: Date;
  caseId?: string;
  contactId?: string;
  processed: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  raw?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelMessageSchema = new Schema<IChannelMessage>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    channel: {
      type: String,
      enum: ['email', 'web', 'chat', 'phone', 'social', 'sms'],
      required: true,
    },
    fromName: { type: String },
    fromAddress: { type: String },
    subject: { type: String },
    body: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    caseId: { type: String, index: true },
    contactId: { type: String },
    processed: { type: Boolean, default: false },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.ChannelMessage ||
  mongoose.model<IChannelMessage>('ChannelMessage', ChannelMessageSchema);
