import mongoose, { Schema, Document } from 'mongoose';

export interface ISLA extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  appliesToPriority?: ('Low' | 'Medium' | 'High' | 'Critical')[];
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SLASchema = new Schema<ISLA>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    appliesToPriority: [
      { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    ],
    firstResponseMinutes: { type: Number, required: true, default: 60 },
    resolutionMinutes: { type: Number, required: true, default: 1440 },
    businessHoursOnly: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.SLA ||
  mongoose.model<ISLA>('SLA', SLASchema);
