import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  userId: string;
  orgId?: string;
  budgetName: string;
  fiscalYear: string;
  department?: string;
  budgetItems: Array<{
    category: string;
    accountId?: string;
    budgetAmount: number;
    actualAmount: number;
    forecast?: number;
    variance?: number;
  }>;
  totalBudget: number;
  totalActual: number;
  totalForecast?: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  currency: string;
  createdBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    budgetName: { type: String, required: true },
    fiscalYear: { type: String, required: true },
    department: { type: String },
    budgetItems: [
      {
        category: { type: String, required: true },
        accountId: { type: String },
        budgetAmount: { type: Number, required: true, min: 0 },
        actualAmount: { type: Number, default: 0 },
        forecast: { type: Number },
        variance: { type: Number },
      },
    ],
    totalBudget: { type: Number, required: true, default: 0 },
    totalActual: { type: Number, default: 0 },
    totalForecast: { type: Number },
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'closed'],
      default: 'draft',
    },
    currency: { type: String, default: 'INR' },
    createdBy: { type: String, required: true },
    approvedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Budget ||
  mongoose.model<IBudget>('Budget', BudgetSchema);
