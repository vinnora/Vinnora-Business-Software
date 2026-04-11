import mongoose, { Schema, Document } from 'mongoose';

export interface IMktTask extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: Date;
  completedAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktTaskSchema = new Schema<IMktTask>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Review', 'Done'],
      default: 'To Do',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    assigneeId: { type: String },
    assigneeName: { type: String },
    dueDate: { type: Date },
    completedAt: { type: Date },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktTask ||
  mongoose.model<IMktTask>('MktTask', MktTaskSchema);
