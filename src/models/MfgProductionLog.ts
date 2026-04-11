import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgProductionLog extends Document {
  userId: string;
  orgId?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  machineId?: string;
  machineName?: string;
  operatorName?: string;
  date: Date;
  shiftName?: string;
  quantityProduced: number;
  quantityRejected: number;
  downtimeMinutes: number;
  downtimeReason?: string;
  cycleTimeMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgProductionLogSchema = new Schema<IMfgProductionLog>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    workOrderId: { type: String },
    workOrderNumber: { type: String },
    machineId: { type: String },
    machineName: { type: String },
    operatorName: { type: String },
    date: { type: Date, required: true },
    shiftName: { type: String },
    quantityProduced: { type: Number, default: 0 },
    quantityRejected: { type: Number, default: 0 },
    downtimeMinutes: { type: Number, default: 0 },
    downtimeReason: { type: String },
    cycleTimeMinutes: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgProductionLogSchema.index({ userId: 1, workOrderId: 1 });
MfgProductionLogSchema.index({ userId: 1, date: 1 });

export default mongoose.models.MfgProductionLog ||
  mongoose.model<IMfgProductionLog>('MfgProductionLog', MfgProductionLogSchema);
