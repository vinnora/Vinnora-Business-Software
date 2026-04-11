import mongoose, { Schema, Document } from 'mongoose';

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  tax?: number;
  accountId?: string;
}

export interface IInvoice extends Document {
  userId: string;
  orgId?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  email?: string;
  invoiceDate: Date;
  dueDate: Date;
  lineItems: ILineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paymentTerms?: string;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    invoiceNumber: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    email: { type: String },
    invoiceDate: { type: Date, required: true, default: Date.now },
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
      enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paymentTerms: { type: String },
    notes: { type: String },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Invoice ||
  mongoose.model<IInvoice>('Invoice', InvoiceSchema);
