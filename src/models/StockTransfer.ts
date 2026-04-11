import mongoose, { Schema, Document } from 'mongoose';

export type StockTransferStatus =
  | 'draft'
  | 'in-transit'
  | 'partial-received'
  | 'received'
  | 'cancelled';

export interface IStockTransferLine {
  itemId: string;
  itemCode: string;
  itemName: string;
  variantId?: string;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  notes?: string;
}

export interface IStockTransfer extends Document {
  userId: string;
  orgId?: string;
  transferNumber: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  initiatedDate: Date;
  shippedDate?: Date;
  receivedDate?: Date;
  expectedDate?: Date;
  status: StockTransferStatus;
  lines: IStockTransferLine[];
  totalQuantity: number;
  carrier?: string;
  trackingNumber?: string;
  reason?: string;
  initiatedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    transferNumber: { type: String, required: true, unique: true },
    fromWarehouseId: { type: String, required: true, index: true },
    fromWarehouseName: { type: String, required: true },
    toWarehouseId: { type: String, required: true, index: true },
    toWarehouseName: { type: String, required: true },
    initiatedDate: { type: Date, default: Date.now },
    shippedDate: { type: Date },
    receivedDate: { type: Date },
    expectedDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'in-transit', 'partial-received', 'received', 'cancelled'],
      default: 'draft',
    },
    lines: [
      {
        itemId: { type: String, required: true },
        itemCode: { type: String, required: true },
        itemName: { type: String, required: true },
        variantId: { type: String },
        requestedQuantity: { type: Number, required: true, min: 0 },
        shippedQuantity: { type: Number, default: 0 },
        receivedQuantity: { type: Number, default: 0 },
        notes: { type: String },
      },
    ],
    totalQuantity: { type: Number, default: 0 },
    carrier: { type: String },
    trackingNumber: { type: String },
    reason: { type: String },
    initiatedBy: { type: String },
    approvedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);
