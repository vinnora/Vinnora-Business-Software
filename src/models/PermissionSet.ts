import mongoose, { Schema, Document } from 'mongoose';

/** Additive permissions granted on top of a user's profile. Same shape as Profile. */
export interface IPermissionSet extends Document {
  orgId: string;
  name: string;
  apiName: string;
  description?: string;
  appAccess: string[];
  objectPermissions: Record<string, unknown>;
  fieldPermissions: Record<string, unknown>;
  systemPermissions: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSetSchema = new Schema<IPermissionSet>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    apiName: { type: String, required: true },
    description: { type: String },
    appAccess: [{ type: String }],
    objectPermissions: { type: Schema.Types.Mixed, default: {} },
    fieldPermissions: { type: Schema.Types.Mixed, default: {} },
    systemPermissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

PermissionSetSchema.index({ orgId: 1, apiName: 1 }, { unique: true });

export default mongoose.models.PermissionSet ||
  mongoose.model<IPermissionSet>('PermissionSet', PermissionSetSchema);
