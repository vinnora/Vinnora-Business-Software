import mongoose, { Schema, Document } from 'mongoose';

/** A bundle of permission sets assigned together. */
export interface IPermissionSetGroup extends Document {
  orgId: string;
  name: string;
  apiName: string;
  description?: string;
  permissionSetIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSetGroupSchema = new Schema<IPermissionSetGroup>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    apiName: { type: String, required: true },
    description: { type: String },
    permissionSetIds: [{ type: String }],
  },
  { timestamps: true }
);

PermissionSetGroupSchema.index({ orgId: 1, apiName: 1 }, { unique: true });

export default mongoose.models.PermissionSetGroup ||
  mongoose.model<IPermissionSetGroup>('PermissionSetGroup', PermissionSetGroupSchema);
