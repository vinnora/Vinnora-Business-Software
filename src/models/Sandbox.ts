import mongoose, { Schema, Document } from 'mongoose';

export type SandboxType = 'developer' | 'partial' | 'full';
export type SandboxStatus = 'creating' | 'ready' | 'failed';

/**
 * A sandbox is a separate environment of an organisation.
 * Everything inside it is stored under `tenant` (= "sbx:<_id>") instead of the org id.
 */
export interface ISandbox extends Document {
  orgId: string;
  name: string;
  description?: string;
  type: SandboxType;
  tenant: string;
  status: SandboxStatus;
  statusMessage?: string;
  /** Partial copy: max records copied per object. */
  sampleSize: number;
  /** Users (besides owner/admins) allowed to switch into this sandbox. */
  userIds: string[];
  createdBy: string;
  createdByName?: string;
  lastRefreshedAt?: Date;
  copied?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const SandboxSchema = new Schema<ISandbox>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['developer', 'partial', 'full'], default: 'developer' },
    tenant: { type: String, required: true, unique: true },
    status: { type: String, enum: ['creating', 'ready', 'failed'], default: 'creating' },
    statusMessage: { type: String },
    sampleSize: { type: Number, default: 100 },
    userIds: [{ type: String }],
    createdBy: { type: String, required: true },
    createdByName: { type: String },
    lastRefreshedAt: { type: Date },
    copied: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SandboxSchema.index({ orgId: 1, name: 1 }, { unique: true });

export default mongoose.models.Sandbox || mongoose.model<ISandbox>('Sandbox', SandboxSchema);
