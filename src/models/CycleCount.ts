import mongoose, { Schema, Document } from 'mongoose';

export type CycleCountStatus = 'scheduled' | 'in-progress' | 'completed' | 'skipped';
export type CycleCountClass = 'A' | 'B' | 'C';

export interface ICycleCountLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  abcClass?: CycleCountClass;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  status: 'pending' | 'counted' | 'reconciled';
}

export interface ICycleCount extends Document {
  userId: string;
  orgId?: string;
  countNumber: string;
  warehouseId: string;
  warehouseName: string;
  scheduledDate: Date;
  completedAt?: Date;
  status: CycleCountStatus;
  abcClassFilter?: CycleCountClass;
  categoryFilter?: string;
  lines: ICycleCountLine[];
  itemsCounted: number;
  itemsWithVariance: number;
  countedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CycleCountSchema = new Schema<ICycleCount>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    countNumber: { type: String, required: true, unique: true },
    warehouseId: { type: String, required: true, index: true },
    warehouseName: { type: String, required: true },
    scheduledDate: { type: Date, default: Date.now },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'skipped'],
      default: 'scheduled',
    },
    abcClassFilter: { type: String, enum: ['A', 'B', 'C'] },
    categoryFilter: { type: String },
    lines: [
      {
        itemId: { type: String, required: true },
        itemCode: { type: String, required: true },
        itemName: { type: String, required: true },
        abcClass: { type: String, enum: ['A', 'B', 'C'] },
        systemQuantity: { type: Number, default: 0 },
        countedQuantity: { type: Number, default: 0 },
        variance: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['pending', 'counted', 'reconciled'],
          default: 'pending',
        },
      },
    ],
    itemsCounted: { type: Number, default: 0 },
    itemsWithVariance: { type: Number, default: 0 },
    countedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.CycleCount ||
  mongoose.model<ICycleCount>('CycleCount', CycleCountSchema);
