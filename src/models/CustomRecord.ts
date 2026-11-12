import mongoose, { Schema, Document } from 'mongoose';

/** A record of a custom object. Field values live in `custom` keyed by field api name. */
export interface ICustomRecord extends Document {
  orgId: string;
  userId: string;
  objectApiName: string;
  name: string;
  custom: Record<string, unknown>;
  ownerId?: string;
  ownerName?: string;
  createdById?: string;
  lastModifiedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomRecordSchema = new Schema<ICustomRecord>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    objectApiName: { type: String, required: true },
    name: { type: String, required: true },
    custom: { type: Schema.Types.Mixed, default: {} },
    ownerId: { type: String },
    ownerName: { type: String },
    createdById: { type: String },
    lastModifiedById: { type: String },
  },
  { timestamps: true, minimize: false }
);

CustomRecordSchema.index({ orgId: 1, objectApiName: 1, updatedAt: -1 });

export default mongoose.models.CustomRecord ||
  mongoose.model<ICustomRecord>('CustomRecord', CustomRecordSchema);
