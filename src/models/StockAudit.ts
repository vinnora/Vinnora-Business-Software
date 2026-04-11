import mongoose, { Schema, Document } from 'mongoose';

export type StockAuditStatus = 'draft' | 'in-progress' | 'completed' | 'cancelled';

export interface IStockAuditLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  variantId?: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  varianceValue: number;
  reason?: string;
  countedBy?: string;
  countedAt?: Date;
}

export interface IStockAudit extends Document {
  userId: string;
  orgId?: string;
  auditNumber: string;
  warehouseId: string;
  warehouseName: string;
  type: 'full' | 'partial' | 'category' | 'cycle' | 'spot';
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: StockAuditStatus;
  lines: IStockAuditLine[];
  totalItemsAudited: number;
  itemsWithVariance: number;
  totalVarianceValue: number;
  conductedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockAuditSchema = new Schema<IStockAudit>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    auditNumber: { type: String, required: true, unique: true },
    warehouseId: { type: String, required: true, index: true },
    warehouseName: { type: String, required: true },
    type: {
      type: String,
      enum: ['full', 'partial', 'category', 'cycle', 'spot'],
      default: 'full',
    },
    scheduledDate: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'in-progress', 'completed', 'cancelled'],
      default: 'draft',
    },
    lines: [
      {
        itemId: { type: String, required: true },
        itemCode: { type: String, required: true },
        itemName: { type: String, required: true },
        variantId: { type: String },
        systemQuantity: { type: Number, default: 0 },
        countedQuantity: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        varianceValue: { type: Number, default: 0 },
        reason: { type: String },
        countedBy: { type: String },
        countedAt: { type: Date },
      },
    ],
    totalItemsAudited: { type: Number, default: 0 },
    itemsWithVariance: { type: Number, default: 0 },
    totalVarianceValue: { type: Number, default: 0 },
    conductedBy: { type: String },
    approvedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.StockAudit ||
  mongoose.model<IStockAudit>('StockAudit', StockAuditSchema);
