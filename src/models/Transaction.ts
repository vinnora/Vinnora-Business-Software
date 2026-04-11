import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: string;
  orgId?: string;
  transactionType: 'expense' | 'income' | 'transfer' | 'adjustment';
  description: string;
  amount: number;
  date: Date;
  category: string;
  payee?: string;
  referenceNumber?: string;
  attachments?: string[];
  notes?: string;
  status: 'draft' | 'posted' | 'reconciled';
  accountId: string;
  counterAccountId?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    transactionType: {
      type: String,
      enum: ['expense', 'income', 'transfer', 'adjustment'],
      required: true,
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    category: { type: String, required: true },
    payee: { type: String },
    referenceNumber: { type: String },
    attachments: [{ type: String }],
    notes: { type: String },
    status: {
      type: String,
      enum: ['draft', 'posted', 'reconciled'],
      default: 'draft',
    },
    accountId: { type: String, required: true },
    counterAccountId: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);
