import mongoose, { Schema, Document } from 'mongoose';

export type VinnoraApp = 'sales-service' | 'accounting' | 'inventory' | 'marketing' | 'hrm' | 'manufacturing';

export interface IAppConnection extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  active: boolean;
  isDefault: boolean;
  sourceApp: VinnoraApp;
  sourceObject: string;
  sourceEvent: string;
  targetApp: VinnoraApp;
  targetAction: string;
  fieldMapping: Array<{ sourceField: string; targetField: string }>;
  conditions?: Array<{ field: string; operator: string; value?: any }>;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AppConnectionSchema = new Schema<IAppConnection>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    sourceApp: {
      type: String,
      enum: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'],
      required: true,
    },
    sourceObject: { type: String, required: true },
    sourceEvent: { type: String, required: true },
    targetApp: {
      type: String,
      enum: ['sales-service', 'accounting', 'inventory', 'marketing', 'hrm', 'manufacturing'],
      required: true,
    },
    targetAction: { type: String, required: true },
    fieldMapping: [{
      sourceField: { type: String, required: true },
      targetField: { type: String, required: true },
    }],
    conditions: [{
      field: { type: String },
      operator: { type: String },
      value: { type: Schema.Types.Mixed },
    }],
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
  },
  { timestamps: true }
);

AppConnectionSchema.index({ userId: 1, sourceApp: 1, sourceEvent: 1 });

export default mongoose.models.AppConnection ||
  mongoose.model<IAppConnection>('AppConnection', AppConnectionSchema);
