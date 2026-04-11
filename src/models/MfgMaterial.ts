import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgMaterial extends Document {
  userId: string;
  orgId?: string;
  materialCode: string;
  name: string;
  category?: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  reorderQty: number;
  costPerUnit: number;
  supplier?: string;
  supplierName?: string;
  warehouseLocation?: string;
  status: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MfgMaterialSchema = new Schema<IMfgMaterial>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    materialCode: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String },
    unit: { type: String, default: 'pcs' },
    currentStock: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    supplier: { type: String },
    supplierName: { type: String },
    warehouseLocation: { type: String },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Discontinued'],
      default: 'Active',
    },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

MfgMaterialSchema.index({ userId: 1, materialCode: 1 }, { unique: true });

export default mongoose.models.MfgMaterial ||
  mongoose.model<IMfgMaterial>('MfgMaterial', MfgMaterialSchema);
