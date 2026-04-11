import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset extends Document {
  userId: string;
  orgId?: string;
  assetName: string;
  assetNumber: string;
  category: string;
  description?: string;
  originalCost: number;
  purchaseDate: Date;
  usefulLife: number;
  depreciation: number;
  bookValue: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  location?: string;
  assignedTo?: string;
  depreciationMethod: 'straight-line' | 'declining-balance' | 'units-of-production';
  salvageValue: number;
  status: 'active' | 'inactive' | 'disposed' | 'pending-disposal';
  accountId?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  notes?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    assetName: { type: String, required: true },
    assetNumber: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String },
    originalCost: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date, required: true },
    usefulLife: { type: Number, required: true, min: 1 },
    depreciation: { type: Number, default: 0 },
    bookValue: { type: Number, required: true },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good',
    },
    location: { type: String },
    assignedTo: { type: String },
    depreciationMethod: {
      type: String,
      enum: ['straight-line', 'declining-balance', 'units-of-production'],
      default: 'straight-line',
    },
    salvageValue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'disposed', 'pending-disposal'],
      default: 'active',
    },
    accountId: { type: String },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    notes: { type: String },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Asset ||
  mongoose.model<IAsset>('Asset', AssetSchema);
