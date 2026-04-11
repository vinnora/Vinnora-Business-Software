import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectBudget {
  phase: string;
  budgetAmount: number;
  actualSpent: number;
  variance?: number;
}

export interface IProject extends Document {
  userId: string;
  orgId?: string;
  projectName: string;
  projectCode: string;
  clientId: string;
  clientName: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  projectManager?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  budget: IProjectBudget[];
  totalBudget: number;
  totalSpent: number;
  currency: string;
  milestones?: Array<{
    milestoneName: string;
    milestoneDate: Date;
    budgetAmount: number;
    invoiced: boolean;
    invoiceAmount?: number;
  }>;
  expenses?: Array<{
    date: Date;
    category: string;
    amount: number;
    description: string;
    accountId?: string;
  }>;
  revenue?: number;
  profitMargin?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    projectName: { type: String, required: true },
    projectCode: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    projectManager: { type: String },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    budget: [
      {
        phase: { type: String, required: true },
        budgetAmount: { type: Number, required: true, min: 0 },
        actualSpent: { type: Number, default: 0 },
        variance: { type: Number },
      },
    ],
    totalBudget: { type: Number, required: true, default: 0 },
    totalSpent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    milestones: [
      {
        milestoneName: { type: String },
        milestoneDate: { type: Date },
        budgetAmount: { type: Number },
        invoiced: { type: Boolean, default: false },
        invoiceAmount: { type: Number },
      },
    ],
    expenses: [
      {
        date: { type: Date, default: Date.now },
        category: { type: String },
        amount: { type: Number, required: true },
        description: { type: String },
        accountId: { type: String },
      },
    ],
    revenue: { type: Number },
    profitMargin: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Project ||
  mongoose.model<IProject>('Project', ProjectSchema);
