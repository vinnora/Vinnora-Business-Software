import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgPurchaseRequisition extends Document {
  userId: string;
  orgId?: string;
  requisitionNumber: string;
  requestedBy?: string;
  department?: string;
  status: string;
  items: Array<{
    materialId?: string;
    materialName?: string;
    quantity?: number;
    unit?: string;
    estimatedCost?: number;
    supplierId?: string;
    supplierName?: string;
  }>;
  totalEstimatedCost: number;
  requiredByDate?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgPurchaseRequisitionSchema = new Schema<IMfgPurchaseRequisition>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    requisitionNumber: { type: String, required: true },
    requestedBy: { type: String },
    department: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received', 'Cancelled'],
      default: 'Draft',
    },
    items: [{
      materialId: { type: String },
      materialName: { type: String },
      quantity: { type: Number },
      unit: { type: String },
      estimatedCost: { type: Number },
      supplierId: { type: String },
      supplierName: { type: String },
    }],
    totalEstimatedCost: { type: Number, default: 0 },
    requiredByDate: { type: Date },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgPurchaseRequisitionSchema.index({ userId: 1, requisitionNumber: 1 }, { unique: true });

export default mongoose.models.MfgPurchaseRequisition ||
  mongoose.model<IMfgPurchaseRequisition>('MfgPurchaseRequisition', MfgPurchaseRequisitionSchema);
