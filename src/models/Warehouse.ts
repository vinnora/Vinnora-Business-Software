import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouse extends Document {
  userId: string;
  orgId?: string;
  name: string;
  code: string;
  type: 'main' | 'branch' | 'transit' | 'virtual' | 'returns';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  manager?: string;
  active: boolean;
  capacity?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    type: {
      type: String,
      enum: ['main', 'branch', 'transit', 'virtual', 'returns'],
      default: 'main',
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    postalCode: { type: String },
    contactPerson: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    manager: { type: String },
    active: { type: Boolean, default: true },
    capacity: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

WarehouseSchema.index({ userId: 1, code: 1 }, { unique: true });

export default mongoose.models.Warehouse || mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
