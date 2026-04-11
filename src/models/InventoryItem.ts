import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    enum: ['Raw Materials', 'Work in Process', 'Finished Goods', 'MRO Supplies'],
    default: 'Finished Goods',
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    default: 'pcs',
  },
  reorderPoint: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    min: 0,
  },
  location: {
    type: String,
  },
  supplier: {
    type: String,
  },
  purchaseDate: {
    type: Date,
  },
  expiryDate: {
    type: Date,
  },
  barcode: {
    type: String,
    unique: true,
  },
  batchNumber: {
    type: String,
  },
  minStock: {
    type: Number,
    default: 0,
  },
  maxStock: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-generate barcode if not provided
InventoryItemSchema.pre('save', function (next: any) {
  if (!this.barcode) {
    this.barcode = `VIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

export default mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);