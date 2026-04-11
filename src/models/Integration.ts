import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationType = 'webhook' | 'api-token' | 'bank-feed' | 'tally' | 'zoho' | 'quickbooks';

export interface IIntegration extends Document {
  userId: string;
  orgId?: string;
  name: string;
  type: IntegrationType;
  active: boolean;
  config: Record<string, any>;
  events?: string[];
  lastUsedAt?: Date;
  callCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['webhook', 'api-token', 'bank-feed', 'tally', 'zoho', 'quickbooks'],
      required: true,
    },
    active: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
    events: [{ type: String }],
    lastUsedAt: { type: Date },
    callCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Integration ||
  mongoose.model<IIntegration>('Integration', IntegrationSchema);
