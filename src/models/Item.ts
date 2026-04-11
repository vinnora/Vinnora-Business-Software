import mongoose, { Schema, Document } from 'mongoose';

export type ItemType = 'finished' | 'raw' | 'service' | 'consumable';
export type ItemStatus = 'active' | 'inactive' | 'discontinued';

export interface IItemVariant {
  variantId: string;
  sku: string;
  variantName: string;
  attributes: Record<string, string>;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  barcode?: string;
  stock: number;
  reorderPoint?: number;
  imageUrl?: string;
}

export interface IWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  binLocation?: string;
  quantity: number;
  reservedQuantity: number;
}

export interface ISupplierMapping {
  supplierId: string;
  supplierName: string;
  supplierSku?: string;
  leadTimeDays: number;
  costPrice: number;
  minOrderQty: number;
  isPreferred: boolean;
}

export interface IItem extends Document {
  userId: string;
  orgId?: string;
  itemCode: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  hsnCode?: string;
  unit: string;
  type: ItemType;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  barcode?: string;
  barcodeFormat?: string;
  imageUrls: string[];
  variants: IItemVariant[];
  warehouseStocks: IWarehouseStock[];
  suppliers: ISupplierMapping[];
  totalStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  expiryDate?: Date;
  manufactureDate?: Date;
  shelfLifeDays?: number;
  batchNumber?: string;
  weight?: number;
  dimensions?: string;
  tags: string[];
  status: ItemStatus;
  attachments: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    itemCode: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, index: true },
    brand: { type: String },
    hsnCode: { type: String },
    unit: { type: String, default: 'pcs' },
    type: {
      type: String,
      enum: ['finished', 'raw', 'service', 'consumable'],
      default: 'finished',
      index: true,
    },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    barcode: { type: String, index: true },
    barcodeFormat: { type: String, default: 'CODE128' },
    imageUrls: [{ type: String }],
    variants: [
      {
        variantId: { type: String, required: true },
        sku: { type: String, required: true },
        variantName: { type: String, required: true },
        attributes: { type: Schema.Types.Mixed, default: {} },
        costPrice: { type: Number, default: 0 },
        sellingPrice: { type: Number, default: 0 },
        mrp: { type: Number, default: 0 },
        barcode: { type: String },
        stock: { type: Number, default: 0 },
        reorderPoint: { type: Number },
        imageUrl: { type: String },
      },
    ],
    warehouseStocks: [
      {
        warehouseId: { type: String, required: true },
        warehouseName: { type: String, required: true },
        binLocation: { type: String },
        quantity: { type: Number, default: 0 },
        reservedQuantity: { type: Number, default: 0 },
      },
    ],
    suppliers: [
      {
        supplierId: { type: String, required: true },
        supplierName: { type: String, required: true },
        supplierSku: { type: String },
        leadTimeDays: { type: Number, default: 7 },
        costPrice: { type: Number, default: 0 },
        minOrderQty: { type: Number, default: 1 },
        isPreferred: { type: Boolean, default: false },
      },
    ],
    totalStock: { type: Number, default: 0 },
    reorderPoint: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    expiryDate: { type: Date },
    manufactureDate: { type: Date },
    shelfLifeDays: { type: Number },
    batchNumber: { type: String },
    weight: { type: Number },
    dimensions: { type: String },
    tags: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'inactive', 'discontinued'],
      default: 'active',
    },
    attachments: [{ type: String }],
    notes: { type: String },
  },
  { timestamps: true }
);

ItemSchema.index({ userId: 1, itemCode: 1 }, { unique: true });

ItemSchema.pre('save', function () {
  if (this.warehouseStocks && this.warehouseStocks.length > 0) {
    this.totalStock = this.warehouseStocks.reduce((s, w) => s + (w.quantity || 0), 0);
  }
});

export default mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);
