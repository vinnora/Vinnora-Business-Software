import mongoose, { Schema, Document } from 'mongoose';

export type MktLeadSource = 'Landing Page' | 'Form' | 'Social' | 'Referral' | 'Event' | 'Import' | 'Other';
export type MktLeadStage = 'New' | 'Engaged' | 'MQL' | 'Handed Off' | 'Disqualified';

export interface IMktLead extends Document {
  userId: string;
  orgId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source: MktLeadSource;
  sourceDetail?: string;
  campaignId?: string;
  score: number;
  stage: MktLeadStage;
  tags?: string[];
  customFields?: Record<string, any>;
  convertedToSalesLeadId?: string;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MktLeadSchema = new Schema<IMktLead>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    source: {
      type: String,
      enum: ['Landing Page', 'Form', 'Social', 'Referral', 'Event', 'Import', 'Other'],
      default: 'Other',
    },
    sourceDetail: { type: String },
    campaignId: { type: String },
    score: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ['New', 'Engaged', 'MQL', 'Handed Off', 'Disqualified'],
      default: 'New',
    },
    tags: [{ type: String }],
    customFields: { type: Schema.Types.Mixed },
    convertedToSalesLeadId: { type: String },
    convertedAt: { type: Date },
  },
  { timestamps: true }
);

MktLeadSchema.index({ userId: 1, email: 1 });

export default mongoose.models.MktLead ||
  mongoose.model<IMktLead>('MktLead', MktLeadSchema);
