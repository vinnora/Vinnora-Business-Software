import mongoose, { Schema, Document } from 'mongoose';

/**
 * A user's profile / permission sets inside a sandbox environment.
 * (In production these live on the User document.)
 */
export interface IUserAssignment extends Document {
  orgId: string;
  userId: string;
  profileId?: string | null;
  permissionSetIds: string[];
  permissionSetGroupIds: string[];
}

const UserAssignmentSchema = new Schema<IUserAssignment>(
  {
    orgId: { type: String, required: true },
    userId: { type: String, required: true },
    profileId: { type: String, default: null },
    permissionSetIds: [{ type: String }],
    permissionSetGroupIds: [{ type: String }],
  },
  { timestamps: true }
);

UserAssignmentSchema.index({ orgId: 1, userId: 1 }, { unique: true });

export default mongoose.models.UserAssignment ||
  mongoose.model<IUserAssignment>('UserAssignment', UserAssignmentSchema);
