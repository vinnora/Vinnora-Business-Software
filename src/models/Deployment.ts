import mongoose, { Schema, Document } from 'mongoose';

export interface IDeploymentItem {
  type: string;
  key: string;
  label: string;
  action: 'add' | 'change' | 'delete';
}

/** A deployment of configuration from a sandbox to production (with rollback snapshot). */
export interface IDeployment extends Document {
  orgId: string;
  sandboxId: string;
  sandboxName: string;
  status: 'succeeded' | 'failed' | 'rolledBack';
  items: IDeploymentItem[];
  /** Production state of every touched component before the deploy (null = didn't exist). */
  snapshot: { type: string; key: string; data: unknown }[];
  log: string[];
  deployedBy: string;
  deployedByName?: string;
  rolledBackAt?: Date;
  rolledBackBy?: string;
  createdAt: Date;
}

const DeploymentSchema = new Schema<IDeployment>(
  {
    orgId: { type: String, required: true, index: true },
    sandboxId: { type: String, required: true },
    sandboxName: { type: String, required: true },
    status: { type: String, enum: ['succeeded', 'failed', 'rolledBack'], required: true },
    items: [
      {
        _id: false,
        type: { type: String },
        key: { type: String },
        label: { type: String },
        action: { type: String },
      },
    ],
    snapshot: { type: Schema.Types.Mixed, default: [] },
    log: [{ type: String }],
    deployedBy: { type: String, required: true },
    deployedByName: { type: String },
    rolledBackAt: { type: Date },
    rolledBackBy: { type: String },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.Deployment || mongoose.model<IDeployment>('Deployment', DeploymentSchema);
