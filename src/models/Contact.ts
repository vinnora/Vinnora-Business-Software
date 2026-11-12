import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  userId: string;
  orgId?: string;
  firstName: string;
  lastName: string;
  title?: string;
  accountId?: string;
  accountName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  department?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingCountry?: string;
  ownerId?: string;
  ownerName?: string;
  leadSource?: string;
  description?: string;
  tags?: string[];
  custom?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    title: { type: String },
    accountId: { type: String, index: true },
    accountName: { type: String },
    email: { type: String, index: true },
    phone: { type: String },
    mobile: { type: String },
    department: { type: String },
    mailingStreet: { type: String },
    mailingCity: { type: String },
    mailingState: { type: String },
    mailingCountry: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    leadSource: { type: String },
    description: { type: String },
    tags: [{ type: String }],
    // Values of custom fields defined in Setup → Object Manager, keyed by api name.
    custom: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

export default mongoose.models.Contact ||
  mongoose.model<IContact>('Contact', ContactSchema);
