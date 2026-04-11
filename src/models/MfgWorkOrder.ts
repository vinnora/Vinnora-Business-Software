import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgWorkOrder extends Document {
  userId: string;
  orgId?: string;
  workOrderNumber: string;
  productName: string;
  productId?: string;
  bomId?: string;
  quantity: number;
  completedQty: number;
  unit: string;
  status: string;
  priority: string;
  startDate?: Date;
  dueDate?: Date;
  completedDate?: Date;
  assignedTo?: string;
  assignedToName?: string;
  department?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MfgWorkOrderSchema = new Schema<IMfgWorkOrder>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    workOrderNumber: { type: String, required: true },
    productName: { type: String, required: true },
    productId: { type: String },
    bomId: { type: String },
    quantity: { type: Number, required: true },
    completedQty: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' },
    status: {
      type: String,
      enum: ['Draft', 'Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    priority: {
      type: String,
      enum: ['Low', 'Normal', 'High', 'Urgent'],
      default: 'Normal',
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedDate: { type: Date },
    assignedTo: { type: String },
    assignedToName: { type: String },
    department: { type: String },
    notes: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

MfgWorkOrderSchema.index({ userId: 1, workOrderNumber: 1 }, { unique: true });

export default mongoose.models.MfgWorkOrder ||
  mongoose.model<IMfgWorkOrder>('MfgWorkOrder', MfgWorkOrderSchema);
