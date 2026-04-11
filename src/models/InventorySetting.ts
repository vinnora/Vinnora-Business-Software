import mongoose, { Schema, Document } from 'mongoose';

/**
 * Customizable picklist values + flags for the Inventory module Setup page.
 * picklistKey examples:
 *   item.category, item.brand, item.unit, item.type
 *   warehouse.type, supplier.paymentTerms
 *   barcode.format, label.size
 */
export interface IInventorySetting extends Document {
  userId: string;
  orgId?: string;
  picklistKey: string;
  value: string;
  label: string;
  order: number;
  isDefault: boolean;
  active: boolean;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySettingSchema = new Schema<IInventorySetting>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    picklistKey: { type: String, required: true, index: true },
    value: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.InventorySetting ||
  mongoose.model<IInventorySetting>('InventorySetting', InventorySettingSchema);
