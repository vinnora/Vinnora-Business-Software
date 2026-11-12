import mongoose, { Schema, Document } from 'mongoose';

export type DataLoadOperation = 'insert' | 'update' | 'upsert' | 'delete' | 'export';
export type DataLoadStatus = 'running' | 'completed';

/** One Data Loader run (import or export), shown in the History tab. */
export interface IDataLoadJob extends Document {
  /** Tenant key (org, sandbox or solo user). */
  orgId: string;
  userId: string;
  userName?: string;
  objectApiName: string;
  objectLabel?: string;
  operation: DataLoadOperation;
  fileName?: string;
  matchField?: string;
  total: number;
  succeeded: number;
  failed: number;
  status: DataLoadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const DataLoadJobSchema = new Schema<IDataLoadJob>(
  {
    orgId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String },
    objectApiName: { type: String, required: true },
    objectLabel: { type: String },
    operation: { type: String, enum: ['insert', 'update', 'upsert', 'delete', 'export'], required: true },
    fileName: { type: String },
    matchField: { type: String },
    total: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: { type: String, enum: ['running', 'completed'], default: 'running' },
  },
  { timestamps: true }
);

DataLoadJobSchema.index({ orgId: 1, createdAt: -1 });

export default mongoose.models.DataLoadJob || mongoose.model<IDataLoadJob>('DataLoadJob', DataLoadJobSchema);
