import mongoose, { Schema, Document } from 'mongoose';

export interface IMktAudienceSegment extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  type: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  staticLeadIds?: string[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MktAudienceSegmentSchema = new Schema<IMktAudienceSegment>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['Static', 'Dynamic'],
      default: 'Dynamic',
    },
    filters: [
      {
        field: { type: String },
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 'in', 'notIn'],
        },
        value: { type: Schema.Types.Mixed },
      },
    ],
    staticLeadIds: [{ type: String }],
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.MktAudienceSegment ||
  mongoose.model<IMktAudienceSegment>('MktAudienceSegment', MktAudienceSegmentSchema);
