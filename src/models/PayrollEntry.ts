import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollEntry extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  payrollPeriod: string;
  paymentDate: Date;
  baseSalary: number;
  hra?: number;
  da?: number;
  allowances: { [key: string]: number };
  deductions: { [key: string]: number };
  grossSalary: number;
  incomeTax?: number;
  providentFund?: number;
  otherDeductions?: number;
  netSalary: number;
  bankAccount?: string;
  currency: string;
  status: 'draft' | 'processed' | 'paid' | 'cancelled';
  panNumber?: string;
  aadharNumber?: string;
  bankName?: string;
  notes?: string;
  salarySlip?: string;
  form12b?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollEntrySchema = new Schema<IPayrollEntry>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    payrollPeriod: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    allowances: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    deductions: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    grossSalary: { type: Number, required: true },
    incomeTax: { type: Number, default: 0 },
    providentFund: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    bankAccount: { type: String },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['draft', 'processed', 'paid', 'cancelled'],
      default: 'draft',
    },
    panNumber: { type: String },
    aadharNumber: { type: String },
    bankName: { type: String },
    notes: { type: String },
    salarySlip: { type: String },
    form12b: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.PayrollEntry ||
  mongoose.model<IPayrollEntry>('PayrollEntry', PayrollEntrySchema);
