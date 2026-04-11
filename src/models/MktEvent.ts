import mongoose, { Schema, Document } from 'mongoose';

export interface IMktEvent extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  venue?: string;
  isOnline: boolean;
  meetingUrl?: string;
  startDate: Date;
  endDate: Date;
  capacity?: number;
  ticketPrice?: number;
  registrationCount: number;
  attendeeCount: number;
  imageUrl?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktEventSchema = new Schema<IMktEvent>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['Webinar', 'Conference', 'Workshop', 'Meetup', 'Trade Show', 'Other'],
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Draft',
    },
    venue: { type: String },
    isOnline: { type: Boolean, default: false },
    meetingUrl: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    capacity: { type: Number },
    ticketPrice: { type: Number, default: 0 },
    registrationCount: { type: Number, default: 0 },
    attendeeCount: { type: Number, default: 0 },
    imageUrl: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktEvent ||
  mongoose.model<IMktEvent>('MktEvent', MktEventSchema);
