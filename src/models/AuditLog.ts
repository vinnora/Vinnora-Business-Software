import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  orgId: string;
  userId: string;
  action: string;
  target?: string;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AuditLogSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
