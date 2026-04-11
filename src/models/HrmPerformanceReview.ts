import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmPerformanceReview extends Document {
  userId: string;
  orgId?: string;
  employeeId: string;
  employeeName: string;
  reviewerId?: string;
  reviewerName?: string;
  period: string;
  type: string;
  status: string;
  overallRating?: number;
  goals?: Array<{ goal: string; weight: number; rating?: number; comments?: string }>;
  competencies?: Array<{ name: string; rating?: number; comments?: string }>;
  selfComments?: string;
  managerComments?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HrmPerformanceReviewSchema = new Schema<IHrmPerformanceReview>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    reviewerId: { type: String },
    reviewerName: { type: String },
    period: { type: String, required: true },
    type: {
      type: String,
      enum: ['Annual', 'Mid-Year', 'Quarterly', 'Probation', '360-Degree'],
      default: 'Annual',
    },
    status: {
      type: String,
      enum: ['Draft', 'Self Review', 'Manager Review', 'Completed', 'Acknowledged'],
      default: 'Draft',
    },
    overallRating: { type: Number, min: 1, max: 5 },
    goals: [{
      goal: { type: String },
      weight: { type: Number, default: 0 },
      rating: { type: Number },
      comments: { type: String },
    }],
    competencies: [{
      name: { type: String },
      rating: { type: Number },
      comments: { type: String },
    }],
    selfComments: { type: String },
    managerComments: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.HrmPerformanceReview ||
  mongoose.model<IHrmPerformanceReview>('HrmPerformanceReview', HrmPerformanceReviewSchema);
