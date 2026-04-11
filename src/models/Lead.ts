import mongoose, { Schema, Document } from 'mongoose';

export type LeadStatus =
  | 'New'
  | 'Working'
  | 'Nurturing'
  | 'Qualified'
  | 'Unqualified'
  | 'Converted';

export interface ILead extends Document {
  userId: string;
  orgId?: string;
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status: LeadStatus;
  rating?: 'Hot' | 'Warm' | 'Cold';
  leadSource?: string;
  industry?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  ownerId?: string;
  ownerName?: string;
  description?: string;
  convertedAt?: Date;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    company: { type: String },
    title: { type: String },
    email: { type: String, index: true },
    phone: { type: String },
    mobile: { type: String },
    status: {
      type: String,
      enum: ['New', 'Working', 'Nurturing', 'Qualified', 'Unqualified', 'Converted'],
      default: 'New',
    },
    rating: { type: String, enum: ['Hot', 'Warm', 'Cold'] },
    leadSource: { type: String },
    industry: { type: String },
    annualRevenue: { type: Number, default: 0 },
    numberOfEmployees: { type: Number, default: 0 },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    description: { type: String },
    convertedAt: { type: Date },
    convertedAccountId: { type: String },
    convertedContactId: { type: String },
    convertedOpportunityId: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Lead ||
  mongoose.model<ILead>('Lead', LeadSchema);
