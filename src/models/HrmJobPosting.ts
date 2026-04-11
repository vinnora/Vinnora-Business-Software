import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmJobPosting extends Document {
  userId: string;
  orgId?: string;
  title: string;
  department: string;
  location?: string;
  type: string;
  description?: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: string;
  openings: number;
  applicantCount: number;
  postedAt?: Date;
  closingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HrmJobPostingSchema = new Schema<IHrmJobPosting>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String },
    type: {
      type: String,
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'],
      default: 'Full-Time',
    },
    description: { type: String },
    requirements: { type: String },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    status: {
      type: String,
      enum: ['Draft', 'Open', 'On Hold', 'Closed', 'Filled'],
      default: 'Draft',
    },
    openings: { type: Number, default: 1 },
    applicantCount: { type: Number, default: 0 },
    postedAt: { type: Date },
    closingDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.HrmJobPosting ||
  mongoose.model<IHrmJobPosting>('HrmJobPosting', HrmJobPostingSchema);
