import mongoose, { Schema, Document } from 'mongoose';

export interface IMktSurveyQuestion {
  questionId: string;
  type: 'text' | 'multiChoice' | 'rating' | 'yesNo' | 'scale';
  text: string;
  options?: string[];
  required: boolean;
}

export interface IMktSurvey extends Document {
  userId: string;
  orgId?: string;
  campaignId?: string;
  title: string;
  description?: string;
  status: string;
  questions: IMktSurveyQuestion[];
  responseCount: number;
  expiresAt?: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktSurveySchema = new Schema<IMktSurvey>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    campaignId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Closed'],
      default: 'Draft',
    },
    questions: [
      {
        questionId: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'multiChoice', 'rating', 'yesNo', 'scale'],
          required: true,
        },
        text: { type: String, required: true },
        options: [{ type: String }],
        required: { type: Boolean, default: false },
      },
    ],
    responseCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktSurvey ||
  mongoose.model<IMktSurvey>('MktSurvey', MktSurveySchema);
