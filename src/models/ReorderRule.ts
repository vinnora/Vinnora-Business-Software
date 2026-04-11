import mongoose, { Schema, Document } from 'mongoose';

export type ReorderStrategy = 'fixed' | 'consumption-based' | 'demand-forecast' | 'economic-order';
export type ReorderFrequency = 'on-trigger' | 'daily' | 'weekly' | 'monthly';

export interface IReorderRule extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  appliesTo: 'all' | 'category' | 'item';
  categoryFilter?: string;
  itemIds: string[];
  warehouseId?: string;
  strategy: ReorderStrategy;
  reorderPoint: number;
  reorderQuantity: number;
  maxStock?: number;
  preferredSupplierId?: string;
  preferredSupplierName?: string;
  consumptionWindowDays?: number;
  safetyStockDays?: number;
  autoCreatePO: boolean;
  requireApproval: boolean;
  frequency: ReorderFrequency;
  active: boolean;
  lastTriggeredAt?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReorderRuleSchema = new Schema<IReorderRule>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    appliesTo: {
      type: String,
      enum: ['all', 'category', 'item'],
      default: 'all',
    },
    categoryFilter: { type: String },
    itemIds: [{ type: String }],
    warehouseId: { type: String },
    strategy: {
      type: String,
      enum: ['fixed', 'consumption-based', 'demand-forecast', 'economic-order'],
      default: 'fixed',
    },
    reorderPoint: { type: Number, required: true, default: 10 },
    reorderQuantity: { type: Number, required: true, default: 50 },
    maxStock: { type: Number },
    preferredSupplierId: { type: String },
    preferredSupplierName: { type: String },
    consumptionWindowDays: { type: Number, default: 30 },
    safetyStockDays: { type: Number, default: 7 },
    autoCreatePO: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['on-trigger', 'daily', 'weekly', 'monthly'],
      default: 'on-trigger',
    },
    active: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date },
    triggerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.ReorderRule ||
  mongoose.model<IReorderRule>('ReorderRule', ReorderRuleSchema);
