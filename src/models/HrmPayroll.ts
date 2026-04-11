import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmPayroll extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  period: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowances: number;
  grossEarnings: number;
  pf: number;
  esi: number;
  tds: number;
  professionalTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HrmPayrollSchema = new Schema<IHrmPayroll>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    period: { type: String, required: true },
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    grossEarnings: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Processing', 'Processed', 'Paid', 'On Hold'],
      default: 'Draft',
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

HrmPayrollSchema.index({ userId: 1, employeeId: 1, period: 1 });

export default mongoose.models.HrmPayroll ||
  mongoose.model<IHrmPayroll>('HrmPayroll', HrmPayrollSchema);
