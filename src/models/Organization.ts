import mongoose, { Schema, Document } from 'mongoose';

export type PlanType = 'free' | 'custom' | 'all-in-one';
export type BillingCycle = 'monthly' | 'yearly' | 'none';
export type AppKey = 'sales-service' | 'accounting' | 'inventory' | 'marketing' | 'hrm' | 'manufacturing';

export const ALL_APPS: AppKey[] = ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'];

export interface IOrganization extends Document {
  name: string;
  slug: string;
  ownerId: string;
  plan: PlanType;
  apps: AppKey[];
  maxSeats: number;
  billingCycle: BillingCycle;
  billingEmail?: string;
  nextRenewal?: Date;
  monthlyRate: number;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    plan: {
      type: String,
      enum: ['free', 'custom', 'all-in-one'],
      default: 'free',
    },
    apps: [{
      type: String,
      enum: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'],
    }],
    maxSeats: { type: Number, default: 1 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'none'],
      default: 'none',
    },
    billingEmail: { type: String },
    nextRenewal: { type: Date },
    monthlyRate: { type: Number, default: 0 },
    trialEndsAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>('Organization', OrganizationSchema);
