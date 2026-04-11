import mongoose, { Schema, Document } from 'mongoose';

export interface IMfgMachine extends Document {
  userId: string;
  orgId?: string;
  machineCode: string;
  name: string;
  type?: string;
  department?: string;
  location?: string;
  status: string;
  manufacturer?: string;
  modelName?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  hoursOperated: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MfgMachineSchema = new Schema<IMfgMachine>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    machineCode: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String },
    department: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: ['Operational', 'Under Maintenance', 'Idle', 'Decommissioned'],
      default: 'Operational',
    },
    manufacturer: { type: String },
    modelName: { type: String },
    serialNumber: { type: String },
    purchaseDate: { type: Date },
    lastMaintenanceDate: { type: Date },
    nextMaintenanceDate: { type: Date },
    hoursOperated: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

MfgMachineSchema.index({ userId: 1, machineCode: 1 }, { unique: true });

export default mongoose.models.MfgMachine ||
  mongoose.model<IMfgMachine>('MfgMachine', MfgMachineSchema);
