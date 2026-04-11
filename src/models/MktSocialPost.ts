import mongoose, { Schema, Document } from 'mongoose';

export interface IMktSocialPost extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  platform: string;
  accountName?: string;
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  status: string;
  scheduledAt?: Date;
  publishedAt?: Date;
  metrics: {
    impressions: number;
    reach: number;
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktSocialPostSchema = new Schema<IMktSocialPost>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    platform: {
      type: String,
      enum: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube', 'Other'],
      required: true,
    },
    accountName: { type: String },
    content: { type: String, required: true },
    mediaUrls: [{ type: String }],
    linkUrl: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Published', 'Failed'],
      default: 'Draft',
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    metrics: {
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktSocialPost ||
  mongoose.model<IMktSocialPost>('MktSocialPost', MktSocialPostSchema);
