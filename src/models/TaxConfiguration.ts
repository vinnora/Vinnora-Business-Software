import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxConfiguration extends Document {
  userId: string;
  orgId?: string;
  taxType: 'gst' | 'vat' | 'sales-tax' | 'income-tax' | 'tds';
  taxRate: number;
  applicableFrom: Date;
  applicableTo?: Date;
  description?: string;
  jurisdiction: string;
  taxCode?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaxConfigurationSchema = new Schema<ITaxConfiguration>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    taxType: {
      type: String,
      enum: ['gst', 'vat', 'sales-tax', 'income-tax', 'tds'],
      required: true,
    },
    taxRate: { type: Number, required: true, min: 0, max: 100 },
    applicableFrom: { type: Date, required: true },
    applicableTo: { type: Date },
    description: { type: String },
    jurisdiction: { type: String, required: true },
    taxCode: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.TaxConfiguration ||
  mongoose.model<ITaxConfiguration>(
    'TaxConfiguration',
    TaxConfigurationSchema
  );
