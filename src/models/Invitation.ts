import mongoose, { Schema, Document } from 'mongoose';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type OrgRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface IInvitation extends Document {
  orgId: string;
  email: string;
  orgRole: OrgRole;
  appRoles?: Record<string, string>;
  invitedBy: string;
  token: string;
  status: InviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    orgId: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    orgRole: {
      type: String,
      enum: ['admin', 'manager', 'member', 'viewer'],
      default: 'member',
    },
    appRoles: { type: Schema.Types.Mixed },
    invitedBy: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

InvitationSchema.index({ orgId: 1, email: 1 });

export default mongoose.models.Invitation ||
  mongoose.model<IInvitation>('Invitation', InvitationSchema);
