import mongoose, { Schema, Document } from 'mongoose';

export type CaseStatus = 'New' | 'Working' | 'Escalated' | 'Pending Customer' | 'Resolved' | 'Closed';
export type CasePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type CaseOrigin = 'Email' | 'Phone' | 'Web' | 'Chat' | 'Social' | 'Portal';

export interface ICaseComment {
  authorId?: string;
  authorName?: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface ICase extends Document {
  userId: string;
  orgId?: string;
  caseNumber: string;
  subject: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  origin: CaseOrigin;
  type?: 'Question' | 'Problem' | 'Feature Request' | 'Incident';
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  ownerId?: string;
  ownerName?: string;
  slaId?: string;
  slaDueAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  escalated: boolean;
  comments: ICaseComment[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema = new Schema<ICase>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    caseNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['New', 'Working', 'Escalated', 'Pending Customer', 'Resolved', 'Closed'],
      default: 'New',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    origin: {
      type: String,
      enum: ['Email', 'Phone', 'Web', 'Chat', 'Social', 'Portal'],
      default: 'Web',
    },
    type: {
      type: String,
      enum: ['Question', 'Problem', 'Feature Request', 'Incident'],
    },
    accountId: { type: String, index: true },
    accountName: { type: String },
    contactId: { type: String },
    contactName: { type: String },
    contactEmail: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    slaId: { type: String },
    slaDueAt: { type: Date },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    escalated: { type: Boolean, default: false },
    comments: [
      {
        authorId: { type: String },
        authorName: { type: String },
        body: { type: String, required: true },
        isInternal: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Case ||
  mongoose.model<ICase>('Case', CaseSchema);
