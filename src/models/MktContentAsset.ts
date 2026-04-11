import mongoose, { Schema, Document } from 'mongoose';

export interface IMktContentAsset extends Document {
  userId: string;
  orgId?: string;
  name: string;
  description?: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  folder?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MktContentAssetSchema = new Schema<IMktContentAsset>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['Image', 'Document', 'Video', 'Template', 'Other'],
      default: 'Other',
    },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    thumbnailUrl: { type: String },
    folder: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.MktContentAsset ||
  mongoose.model<IMktContentAsset>('MktContentAsset', MktContentAssetSchema);
