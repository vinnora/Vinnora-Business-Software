import mongoose, { Schema, Document } from 'mongoose';

export type EWayBillStatus = 'draft' | 'generated' | 'in-transit' | 'delivered' | 'cancelled' | 'expired';
export type EWayBillSubType =
  | 'supply'
  | 'export'
  | 'job-work'
  | 'sko'
  | 'recipient-not-known'
  | 'for-own-use'
  | 'exhibition'
  | 'line-sales'
  | 'others';

export interface IEWayBillItem {
  itemId?: string;
  itemName: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  taxableValue: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
}

export interface IEWayBill extends Document {
  userId: string;
  orgId?: string;
  ewayBillNumber: string;
  ewbDate: Date;
  validUntil?: Date;
  documentType: 'invoice' | 'bill-of-supply' | 'delivery-challan' | 'credit-note';
  documentNumber: string;
  documentDate: Date;
  subType: EWayBillSubType;
  fromGstin: string;
  fromName: string;
  fromAddress: string;
  fromPincode: string;
  fromState: string;
  toGstin: string;
  toName: string;
  toAddress: string;
  toPincode: string;
  toState: string;
  transporterId?: string;
  transporterName?: string;
  vehicleNumber?: string;
  vehicleType?: 'regular' | 'over-dimensional';
  transportMode: 'road' | 'rail' | 'air' | 'ship';
  transportDocNumber?: string;
  transportDocDate?: Date;
  distanceKm: number;
  items: IEWayBillItem[];
  totalValue: number;
  totalTaxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  status: EWayBillStatus;
  linkedTransferId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EWayBillSchema = new Schema<IEWayBill>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    ewayBillNumber: { type: String, required: true, unique: true },
    ewbDate: { type: Date, default: Date.now },
    validUntil: { type: Date },
    documentType: {
      type: String,
      enum: ['invoice', 'bill-of-supply', 'delivery-challan', 'credit-note'],
      default: 'invoice',
    },
    documentNumber: { type: String, required: true },
    documentDate: { type: Date, required: true },
    subType: {
      type: String,
      enum: [
        'supply',
        'export',
        'job-work',
        'sko',
        'recipient-not-known',
        'for-own-use',
        'exhibition',
        'line-sales',
        'others',
      ],
      default: 'supply',
    },
    fromGstin: { type: String, required: true },
    fromName: { type: String, required: true },
    fromAddress: { type: String },
    fromPincode: { type: String, required: true },
    fromState: { type: String, required: true },
    toGstin: { type: String, required: true },
    toName: { type: String, required: true },
    toAddress: { type: String },
    toPincode: { type: String, required: true },
    toState: { type: String, required: true },
    transporterId: { type: String },
    transporterName: { type: String },
    vehicleNumber: { type: String },
    vehicleType: { type: String, enum: ['regular', 'over-dimensional'], default: 'regular' },
    transportMode: { type: String, enum: ['road', 'rail', 'air', 'ship'], default: 'road' },
    transportDocNumber: { type: String },
    transportDocDate: { type: Date },
    distanceKm: { type: Number, default: 0 },
    items: [
      {
        itemId: { type: String },
        itemName: { type: String, required: true },
        hsnCode: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, default: 'pcs' },
        taxableValue: { type: Number, required: true },
        cgstRate: { type: Number, default: 0 },
        sgstRate: { type: Number, default: 0 },
        igstRate: { type: Number, default: 0 },
        cessRate: { type: Number, default: 0 },
      },
    ],
    totalValue: { type: Number, default: 0 },
    totalTaxableValue: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    cessAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'generated', 'in-transit', 'delivered', 'cancelled', 'expired'],
      default: 'draft',
    },
    linkedTransferId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.EWayBill || mongoose.model<IEWayBill>('EWayBill', EWayBillSchema);
