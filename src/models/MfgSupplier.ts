import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgSupplier extends Document {
  userId: string;
  orgId?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: { street?: string; city?: string; state?: string; country?: string; postalCode?: string };
  gst?: string;
  pan?: string;
  materials: Array<{
    materialId?: string;
    materialName?: string;
    leadTimeDays?: number;
    costPerUnit?: number;
  }>;
  rating?: number;
  paymentTerms?: string;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgSupplierSchema = new Schema<IMfgSupplier>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    gst: { type: String },
    pan: { type: String },
    materials: [{
      materialId: { type: String },
      materialName: { type: String },
      leadTimeDays: { type: Number },
      costPerUnit: { type: Number },
    }],
    rating: { type: Number, min: 1, max: 5 },
    paymentTerms: { type: String },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Blacklisted'],
      default: 'Active',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgSupplierSchema.index({ userId: 1, name: 1 });

export default mongoose.models.MfgSupplier ||
  mongoose.model<IMfgSupplier>('MfgSupplier', MfgSupplierSchema);
