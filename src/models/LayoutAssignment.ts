import mongoose, { Schema, Document } from 'mongoose';

/** Which page layout a profile sees for an object. */
export interface ILayoutAssignment extends Document {
  orgId: string;
  objectApiName: string;
  profileId: string;
  layoutId: string;
}

const LayoutAssignmentSchema = new Schema<ILayoutAssignment>(
  {
    orgId: { type: String, required: true, index: true },
    objectApiName: { type: String, required: true },
    profileId: { type: String, required: true },
    layoutId: { type: String, required: true },
  },
  { timestamps: true }
);

LayoutAssignmentSchema.index({ orgId: 1, objectApiName: 1, profileId: 1 }, { unique: true });

export default mongoose.models.LayoutAssignment ||
  mongoose.model<ILayoutAssignment>('LayoutAssignment', LayoutAssignmentSchema);
