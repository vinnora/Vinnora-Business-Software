import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  userId: string;
  orgId?: string;
  name: string;
  type: 'Customer' | 'Prospect' | 'Partner' | 'Vendor' | 'Other';
  industry?: string;
  website?: string;
  phone?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  annualRevenue?: number;
  employees?: number;
  ownerId?: string;
  ownerName?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['Customer', 'Prospect', 'Partner', 'Vendor', 'Other'],
      default: 'Prospect',
    },
    industry: { type: String },
    website: { type: String },
    phone: { type: String },
    billingStreet: { type: String },
    billingCity: { type: String },
    billingState: { type: String },
    billingCountry: { type: String },
    billingPostalCode: { type: String },
    annualRevenue: { type: Number, default: 0 },
    employees: { type: Number, default: 0 },
    ownerId: { type: String },
    ownerName: { type: String },
    description: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Account ||
  mongoose.model<IAccount>('Account', AccountSchema);
