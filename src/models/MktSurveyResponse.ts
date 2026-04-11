import mongoose, { Schema, Document } from 'mongoose';

export interface IMktSurveyResponse extends Document {
  userId: string;
  orgId?: string;
  surveyId: string;
  respondentEmail?: string;
  respondentName?: string;
  leadId?: string;
  answers: Array<{
    questionId: string;
    value: any;
  }>;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MktSurveyResponseSchema = new Schema<IMktSurveyResponse>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    surveyId: { type: String, required: true, index: true },
    respondentEmail: { type: String },
    respondentName: { type: String },
    leadId: { type: String },
    answers: [
      {
        questionId: { type: String, required: true },
        value: { type: Schema.Types.Mixed },
      },
    ],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.MktSurveyResponse ||
  mongoose.model<IMktSurveyResponse>('MktSurveyResponse', MktSurveyResponseSchema);
