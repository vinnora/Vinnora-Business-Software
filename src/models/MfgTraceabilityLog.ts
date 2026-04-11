import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgTraceabilityLog extends Document {
  userId: string;
  orgId?: string;
  batchNumber: string;
  productName?: string;
  productId?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  stage?: string;
  materialLots: Array<{
    materialName?: string;
    lotNumber?: string;
    supplier?: string;
    receivedDate?: Date;
  }>;
  qualityCheckId?: string;
  dispatchDate?: Date;
  dispatchTo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgTraceabilityLogSchema = new Schema<IMfgTraceabilityLog>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    batchNumber: { type: String, required: true },
    productName: { type: String },
    productId: { type: String },
    workOrderId: { type: String },
    workOrderNumber: { type: String },
    stage: {
      type: String,
      enum: ['Procurement', 'Production', 'Quality Check', 'Packaging', 'Dispatch'],
    },
    materialLots: [{
      materialName: { type: String },
      lotNumber: { type: String },
      supplier: { type: String },
      receivedDate: { type: Date },
    }],
    qualityCheckId: { type: String },
    dispatchDate: { type: Date },
    dispatchTo: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgTraceabilityLogSchema.index({ userId: 1, batchNumber: 1 }, { unique: true });
MfgTraceabilityLogSchema.index({ userId: 1, workOrderId: 1 });

export default mongoose.models.MfgTraceabilityLog ||
  mongoose.model<IMfgTraceabilityLog>('MfgTraceabilityLog', MfgTraceabilityLogSchema);
