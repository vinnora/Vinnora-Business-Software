import mongoose, { Schema, Document } from 'mongoose';

export interface IMktAutomationStep {
  stepId: string;
  order: number;
  type: 'sendEmail' | 'sendSms' | 'wait' | 'condition' | 'updateLead' | 'addTag' | 'notifyOwner' | 'pushToSales';
  config: Record<string, any>;
}

export interface IMktAutomation extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault?: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  steps: IMktAutomationStep[];
  enrolledCount: number;
  completedCount: number;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MktAutomationSchema = new Schema<IMktAutomation>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    triggerType: {
      type: String,
      enum: [
        'formSubmission',
        'leadCreated',
        'leadScoreReached',
        'emailOpened',
        'emailClicked',
        'eventRegistered',
        'tagAdded',
        'manual',
      ],
      required: true,
    },
    triggerConfig: { type: Schema.Types.Mixed, default: {} },
    steps: [
      {
        stepId: { type: String, required: true },
        order: { type: Number, required: true },
        type: {
          type: String,
          enum: ['sendEmail', 'sendSms', 'wait', 'condition', 'updateLead', 'addTag', 'notifyOwner', 'pushToSales'],
          required: true,
        },
        config: { type: Schema.Types.Mixed, default: {} },
      },
    ],
    enrolledCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.MktAutomation ||
  mongoose.model<IMktAutomation>('MktAutomation', MktAutomationSchema);
