import mongoose from 'mongoose';

const StockAdjustmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  adjustmentType: {
    type: String,
    enum: ['received', 'issued', 'damaged', 'lost', 'counted', 'returned', 'adjustment'],
    required: true,
  },
  quantityChanged: {
    type: Number,
    required: true,
  },
  quantityBefore: {
    type: Number,
    required: true,
  },
  quantityAfter: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
  },
  referenceNumber: {
    type: String,
  },
  notes: {
    type: String,
  },
  location: {
    type: String,
  },
  createdBy: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.StockAdjustment || mongoose.model('StockAdjustment', StockAdjustmentSchema);
