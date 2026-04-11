import mongoose, { Schema, Document } from 'mongoose';

export type LabelType = 'product' | 'shelf' | 'shipping' | 'qr' | 'barcode' | 'price-tag';
export type LabelSize = '38x25' | '50x25' | '50x40' | '75x50' | '100x50' | '100x150' | 'A4' | 'custom';
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'CODE93' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF' | 'QR';

export interface ILabelField {
  name: string;
  type: 'text' | 'barcode' | 'qr' | 'image' | 'price' | 'sku';
  source: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ILabelTemplate extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  type: LabelType;
  size: LabelSize;
  customWidth?: number;
  customHeight?: number;
  unit: 'mm' | 'in';
  barcodeFormat: BarcodeFormat;
  printsPerSheet: 1 | 2 | 3 | 4 | 8 | 12 | 24 | 65;
  fields: ILabelField[];
  showBorder: boolean;
  backgroundColor?: string;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LabelTemplateSchema = new Schema<ILabelTemplate>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['product', 'shelf', 'shipping', 'qr', 'barcode', 'price-tag'],
      default: 'product',
    },
    size: {
      type: String,
      enum: ['38x25', '50x25', '50x40', '75x50', '100x50', '100x150', 'A4', 'custom'],
      default: '50x25',
    },
    customWidth: { type: Number },
    customHeight: { type: Number },
    unit: { type: String, enum: ['mm', 'in'], default: 'mm' },
    barcodeFormat: {
      type: String,
      enum: ['CODE128', 'CODE39', 'CODE93', 'EAN13', 'EAN8', 'UPC', 'ITF', 'QR'],
      default: 'CODE128',
    },
    printsPerSheet: { type: Number, default: 1 },
    fields: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'barcode', 'qr', 'image', 'price', 'sku'],
          required: true,
        },
        source: { type: String, required: true },
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        fontSize: { type: Number, default: 10 },
        fontWeight: { type: String, default: 'normal' },
        align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      },
    ],
    showBorder: { type: Boolean, default: false },
    backgroundColor: { type: String, default: '#ffffff' },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.LabelTemplate ||
  mongoose.model<ILabelTemplate>('LabelTemplate', LabelTemplateSchema);
