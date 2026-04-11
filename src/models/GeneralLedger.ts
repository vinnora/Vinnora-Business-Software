import mongoose, { Schema, Document } from 'mongoose';

export interface IGeneralLedger extends Document {
  userId: string;
  orgId?: string;
  transactionId: string;
  accountId: string;
  debit: number;
  credit: number;
  date: Date;
  description: string;
  referenceNumber?: string;
  status: 'posted' | 'unposted';
  createdAt: Date;
  updatedAt: Date;
}

const GeneralLedgerSchema = new Schema<IGeneralLedger>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    transactionId: { type: String, required: true },
    accountId: { type: String, required: true, index: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
    referenceNumber: { type: String },
    status: {
      type: String,
      enum: ['posted', 'unposted'],
      default: 'unposted',
    },
  },
  { timestamps: true }
);

export default mongoose.models.GeneralLedger ||
  mongoose.model<IGeneralLedger>('GeneralLedger', GeneralLedgerSchema);
