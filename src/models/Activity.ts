import mongoose, { Schema, Document } from 'mongoose';

export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Task' | 'Note';
export type ActivityStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
export type RelatedToType = 'Account' | 'Contact' | 'Lead' | 'Opportunity' | 'Case';

export interface IActivity extends Document {
  userId: string;
  orgId?: string;
  type: ActivityType;
  subject: string;
  status: ActivityStatus;
  priority?: 'Low' | 'Normal' | 'High';
  dueDate?: Date;
  completedAt?: Date;
  durationMinutes?: number;
  relatedToType?: RelatedToType;
  relatedToId?: string;
  relatedToName?: string;
  contactId?: string;
  contactName?: string;
  ownerId?: string;
  ownerName?: string;
  description?: string;
  emailFrom?: string;
  emailTo?: string[];
  callOutcome?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Task', 'Note'],
      required: true,
    },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Open',
    },
    priority: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
    dueDate: { type: Date },
    completedAt: { type: Date },
    durationMinutes: { type: Number, default: 0 },
    relatedToType: {
      type: String,
      enum: ['Account', 'Contact', 'Lead', 'Opportunity', 'Case'],
    },
    relatedToId: { type: String, index: true },
    relatedToName: { type: String },
    contactId: { type: String },
    contactName: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    description: { type: String },
    emailFrom: { type: String },
    emailTo: [{ type: String }],
    callOutcome: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema);
