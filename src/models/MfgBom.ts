import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgBom extends Document {
  userId: string;
  orgId?: string;
  name: string;
  productName: string;
  productId?: string;
  version: string;
  status: string;
  items: Array<{
    materialName: string;
    materialId?: string;
    quantity: number;
    unit?: string;
    costPerUnit?: number;
    notes?: string;
  }>;
  totalCost: number;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MfgBomSchema = new Schema<IMfgBom>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    productName: { type: String, required: true },
    productId: { type: String },
    version: { type: String, default: '1.0' },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Obsolete'],
      default: 'Draft',
    },
    items: [{
      materialName: { type: String },
      materialId: { type: String },
      quantity: { type: Number },
      unit: { type: String },
      costPerUnit: { type: Number },
      notes: { type: String },
    }],
    totalCost: { type: Number, default: 0 },
    description: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

MfgBomSchema.index({ userId: 1, name: 1 });

export default mongoose.models.MfgBom ||
  mongoose.model<IMfgBom>('MfgBom', MfgBomSchema);
