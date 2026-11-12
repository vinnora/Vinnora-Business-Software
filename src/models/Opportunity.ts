import mongoose, { Schema, Document } from 'mongoose';

export type OpportunityStage =
  | 'Prospecting'
  | 'Qualification'
  | 'Needs Analysis'
  | 'Value Proposition'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  Prospecting: 10,
  Qualification: 20,
  'Needs Analysis': 35,
  'Value Proposition': 50,
  Proposal: 70,
  Negotiation: 85,
  'Closed Won': 100,
  'Closed Lost': 0,
};

export interface IOpportunity extends Document {
  userId: string;
  orgId?: string;
  name: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  amount: number;
  currency: string;
  stage: OpportunityStage;
  probability: number;
  closeDate: Date;
  type?: 'New Business' | 'Existing Business' | 'Renewal';
  leadSource?: string;
  ownerId?: string;
  ownerName?: string;
  nextStep?: string;
  description?: string;
  competitors?: string[];
  tags?: string[];
  custom?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    accountId: { type: String, index: true },
    accountName: { type: String },
    contactId: { type: String },
    contactName: { type: String },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },
    stage: {
      type: String,
      enum: [
        'Prospecting',
        'Qualification',
        'Needs Analysis',
        'Value Proposition',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost',
      ],
      default: 'Prospecting',
    },
    probability: { type: Number, default: 10, min: 0, max: 100 },
    closeDate: { type: Date, required: true },
    type: {
      type: String,
      enum: ['New Business', 'Existing Business', 'Renewal'],
    },
    leadSource: { type: String },
    ownerId: { type: String },
    ownerName: { type: String },
    nextStep: { type: String },
    description: { type: String },
    competitors: [{ type: String }],
    tags: [{ type: String }],
    // Values of custom fields defined in Setup → Object Manager, keyed by api name.
    custom: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

OpportunitySchema.pre('save', function () {
  if (this.isModified('stage')) {
    this.probability = STAGE_PROBABILITY[this.stage as OpportunityStage] ?? this.probability;
  }
});

export { STAGE_PROBABILITY };

export default mongoose.models.Opportunity ||
  mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
