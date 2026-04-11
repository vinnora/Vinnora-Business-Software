import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgQualityCheck extends Document {
  userId: string;
  orgId?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  productName?: string;
  inspectorName?: string;
  inspectionDate: Date;
  type: string;
  status: string;
  parameters: Array<{
    name: string;
    target?: string;
    actual?: string;
    unit?: string;
    passed?: boolean;
  }>;
  overallResult?: string;
  defectsFound: number;
  defectDescription?: string;
  correctiveAction?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgQualityCheckSchema = new Schema<IMfgQualityCheck>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    workOrderId: { type: String },
    workOrderNumber: { type: String },
    productName: { type: String },
    inspectorName: { type: String },
    inspectionDate: { type: Date, required: true },
    type: {
      type: String,
      enum: ['Incoming', 'In-Process', 'Final', 'Random'],
      default: 'Final',
    },
    status: {
      type: String,
      enum: ['Pending', 'Passed', 'Failed', 'Conditional'],
      default: 'Pending',
    },
    parameters: [{
      name: { type: String },
      target: { type: String },
      actual: { type: String },
      unit: { type: String },
      passed: { type: Boolean },
    }],
    overallResult: { type: String },
    defectsFound: { type: Number, default: 0 },
    defectDescription: { type: String },
    correctiveAction: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgQualityCheckSchema.index({ userId: 1, workOrderId: 1 });

export default mongoose.models.MfgQualityCheck ||
  mongoose.model<IMfgQualityCheck>('MfgQualityCheck', MfgQualityCheckSchema);
