import mongoose, { Schema, Document } from 'mongoose';

export interface IMktEventRegistration extends Document {
  userId: string;
  orgId?: string;
  eventId: string;
  leadId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  ticketType?: string;
  amountPaid?: number;
  checkedInAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MktEventRegistrationSchema = new Schema<IMktEventRegistration>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    eventId: { type: String, required: true, index: true },
    leadId: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    company: { type: String },
    status: {
      type: String,
      enum: ['Registered', 'Confirmed', 'Attended', 'No Show', 'Cancelled'],
      default: 'Registered',
    },
    ticketType: { type: String },
    amountPaid: { type: Number, default: 0 },
    checkedInAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.MktEventRegistration ||
  mongoose.model<IMktEventRegistration>('MktEventRegistration', MktEventRegistrationSchema);
