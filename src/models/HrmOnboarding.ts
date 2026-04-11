import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmOnboarding extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  type: string;
  status: string;
  startDate: Date;
  completedDate?: Date;
  tasks: Array<{ taskId: string; title: string; assignee?: string; status: string; dueDate?: Date; completedAt?: Date }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HrmOnboardingSchema = new Schema<IHrmOnboarding>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    type: {
      type: String,
      enum: ['Onboarding', 'Offboarding'],
      default: 'Onboarding',
    },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Not Started',
    },
    startDate: { type: Date, required: true },
    completedDate: { type: Date },
    tasks: [{
      taskId: { type: String, required: true },
      title: { type: String, required: true },
      assignee: { type: String },
      status: { type: String, enum: ['Pending', 'Done', 'Skipped'], default: 'Pending' },
      dueDate: { type: Date },
      completedAt: { type: Date },
    }],
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.HrmOnboarding ||
  mongoose.model<IHrmOnboarding>('HrmOnboarding', HrmOnboardingSchema);
