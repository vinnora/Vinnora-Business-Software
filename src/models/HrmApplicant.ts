import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmApplicant extends Document {
  userId: string;
  orgId?: string;
  jobPostingId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  source?: string;
  stage: string;
  rating?: number;
  interviewDate?: Date;
  interviewNotes?: string;
  offeredSalary?: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HrmApplicantSchema = new Schema<IHrmApplicant>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    jobPostingId: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    resumeUrl: { type: String },
    coverLetter: { type: String },
    source: {
      type: String,
      enum: ['Portal', 'Referral', 'LinkedIn', 'Campus', 'Agency', 'Walk-In', 'Other'],
      default: 'Other',
    },
    stage: {
      type: String,
      enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn'],
      default: 'Applied',
    },
    rating: { type: Number, min: 1, max: 5 },
    interviewDate: { type: Date },
    interviewNotes: { type: String },
    offeredSalary: { type: Number },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.HrmApplicant ||
  mongoose.model<IHrmApplicant>('HrmApplicant', HrmApplicantSchema);
