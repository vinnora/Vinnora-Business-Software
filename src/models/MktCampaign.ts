import mongoose, { Schema, Document } from 'mongoose';

export type CampaignType = 'Email' | 'SMS' | 'Social' | 'Event' | 'Multi-Channel' | 'Other';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed' | 'Cancelled';

export interface IMktCampaign extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  channel: string[];
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  actualSpend?: number;
  goal?: string;
  targetAudience?: string;
  audienceSegmentId?: string;
  tags?: string[];
  ownerId?: string;
  ownerName?: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MktCampaignSchema = new Schema<IMktCampaign>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['Email', 'SMS', 'Social', 'Event', 'Multi-Channel', 'Other'],
      default: 'Email',
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Active', 'Paused', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    channel: [{ type: String }],
    startDate: { type: Date },
    endDate: { type: Date },
    budget: { type: Number },
    actualSpend: { type: Number },
    goal: { type: String },
    targetAudience: { type: String },
    audienceSegmentId: { type: String },
    tags: [{ type: String }],
    ownerId: { type: String },
    ownerName: { type: String },
    metrics: {
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      converted: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.MktCampaign ||
  mongoose.model<IMktCampaign>('MktCampaign', MktCampaignSchema);
