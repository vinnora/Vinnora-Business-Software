import mongoose, { Schema, Document } from 'mongoose';

/**
 * A profile is the baseline set of permissions every user has exactly one of.
 * objectPermissions: { [objectApiName]: { create, read, edit, delete, viewAll, modifyAll } }
 * fieldPermissions:  { [objectApiName]: { [fieldApiName]: { read, edit } } } — only overrides are stored
 */
export interface IProfile extends Document {
  orgId: string;
  name: string;
  description?: string;
  key?: string;
  isSystem: boolean;
  appAccess: string[];
  objectPermissions: Record<string, unknown>;
  fieldPermissions: Record<string, unknown>;
  systemPermissions: Record<string, boolean>;
  defaultObjectAccess: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    key: { type: String },
    isSystem: { type: Boolean, default: false },
    appAccess: [{ type: String }],
    objectPermissions: { type: Schema.Types.Mixed, default: {} },
    fieldPermissions: { type: Schema.Types.Mixed, default: {} },
    systemPermissions: { type: Schema.Types.Mixed, default: {} },
    defaultObjectAccess: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

ProfileSchema.index({ orgId: 1, name: 1 }, { unique: true });

export default mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema);
