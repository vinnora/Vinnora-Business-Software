import mongoose, { Schema, Document } from 'mongoose';

export interface ITechnician extends Document {
  userId: string;
  orgId?: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string[];
  territories: string[];
  active: boolean;
  hourlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianSchema = new Schema<ITechnician>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    skills: [{ type: String }],
    territories: [{ type: String }],
    active: { type: Boolean, default: true },
    hourlyRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Technician ||
  mongoose.model<ITechnician>('Technician', TechnicianSchema);
