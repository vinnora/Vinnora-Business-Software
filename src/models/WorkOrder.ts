import mongoose, { Schema, Document } from 'mongoose';

export type WorkOrderStatus = 'New' | 'Scheduled' | 'Dispatched' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IWorkOrderLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IWorkOrder extends Document {
  userId: string;
  orgId?: string;
  workOrderNumber: string;
  subject: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  caseId?: string;
  caseNumber?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  serviceAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  technicianId?: string;
  technicianName?: string;
  lineItems: IWorkOrderLineItem[];
  subtotal: number;
  total: number;
  signatureUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema<IWorkOrder>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    workOrderNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['New', 'Scheduled', 'Dispatched', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
      default: 'New',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    caseId: { type: String, index: true },
    caseNumber: { type: String },
    accountId: { type: String, index: true },
    accountName: { type: String },
    contactId: { type: String },
    contactName: { type: String },
    contactPhone: { type: String },
    serviceAddress: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    postalCode: { type: String },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    actualStart: { type: Date },
    actualEnd: { type: Date },
    technicianId: { type: String, index: true },
    technicianName: { type: String },
    lineItems: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    signatureUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.WorkOrder ||
  mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
