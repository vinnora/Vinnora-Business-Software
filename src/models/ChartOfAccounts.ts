import mongoose, { Schema, Document } from 'mongoose';

export interface IChartOfAccounts extends Document {
  userId: string;
  orgId?: string;
  accountName: string;
  accountNumber: string;
  accountType: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  description?: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'archived';
  parentAccountId?: string;
  isHeader: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChartOfAccountsSchema = new Schema<IChartOfAccounts>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true, unique: true },
    accountType: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'income', 'expense'],
      required: true,
    },
    description: { type: String },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
    },
    parentAccountId: { type: String },
    isHeader: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.ChartOfAccounts ||
  mongoose.model<IChartOfAccounts>('ChartOfAccounts', ChartOfAccountsSchema);
