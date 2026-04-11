import mongoose, { Schema, Document } from 'mongoose';

export interface IHrmDepartment extends Document {
  userId: string;
  orgId?: string;
  name: string;
  code?: string;
  headId?: string;
  headName?: string;
  parentDepartment?: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HrmDepartmentSchema = new Schema<IHrmDepartment>(
  {
    userId: { type: String, required: true, index: true },
    orgId: { type: String, index: true },
    name: { type: String, required: true },
    code: { type: String },
    headId: { type: String },
    headName: { type: String },
    parentDepartment: { type: String },
    description: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.HrmDepartment ||
  mongoose.model<IHrmDepartment>('HrmDepartment', HrmDepartmentSchema);
