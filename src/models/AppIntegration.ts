import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationApp = 'sales-service' | 'accounting' | 'inventory' | 'marketing' | 'hrm' | 'manufacturing' | 'global';

export interface IAppIntegration extends Document {
  userId: string;
  orgId?: string;
  app: IntegrationApp;
  name: string;
  type: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  config: Record<string, any>;
  events?: string[];
  callCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppIntegrationSchema = new Schema<IAppIntegration>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    app: {
      type: String,
      enum: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing', 'global'],
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'whatsapp', 'email-smtp', 'webhook',
        'zoho-crm', 'freshdesk',
        'tally', 'zoho-books', 'quickbooks', 'bank-feed',
        'shiprocket', 'delhivery',
        'mailchimp', 'sendgrid',
        'slack', 'teams',
        'custom',
      ],
      required: true,
    },
    description: { type: String },
    active: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    events: [{ type: String }],
    callCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

AppIntegrationSchema.index({ userId: 1, app: 1 });

export default mongoose.models.AppIntegration ||
  mongoose.model<IAppIntegration>('AppIntegration', AppIntegrationSchema);
