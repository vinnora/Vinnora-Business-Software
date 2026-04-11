import mongoose, { Schema, Document } from 'mongoose';

export interface IBill extends Document {
  userId: string;
  orgId?: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  email?: string;
  billDate: Date;
  dueDate: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    tax?: number;
    accountId?: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'received' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  purchaseOrderNumber?: string;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema = new Schema<IBill>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    billNumber: { type: String, required: true, unique: true },
    vendorId: { type: String, required: true },
    vendorName: { type: String, required: true },
    email: { type: String },
    billDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    lineItems: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true },
        tax: { type: Number, default: 0 },
        accountId: { type: String },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['draft', 'received', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    purchaseOrderNumber: { type: String },
    notes: { type: String },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Bill ||
  mongoose.model<IBill>('Bill', BillSchema);
