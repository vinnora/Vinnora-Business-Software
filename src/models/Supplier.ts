import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  userId: string;
  orgId?: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  gstNumber?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  paymentTerms?: string;
  creditLimit?: number;
  currency: string;
  rating?: number;
  totalOrders: number;
  totalSpend: number;
  preferredCategories: string[];
  active: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    alternatePhone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    postalCode: { type: String },
    gstNumber: { type: String },
    panNumber: { type: String },
    bankName: { type: String },
    bankAccount: { type: String },
    ifscCode: { type: String },
    paymentTerms: { type: String, default: 'Net 30' },
    creditLimit: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    rating: { type: Number, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0 },
    totalSpend: { type: Number, default: 0 },
    preferredCategories: [{ type: String }],
    active: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

SupplierSchema.index({ userId: 1, code: 1 }, { unique: true });

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
