import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
  orgId: string;
  name: string;
  apiName: string;
  description?: string;
  /** public = everyone in the org can run it; private = owner only. */
  folder: 'public' | 'private';
  ownerId: string;
  ownerName?: string;
  objectApiName: string;
  format: 'tabular' | 'summary' | 'matrix';
  columns: string[];
  filters: { field: string; operator: string; value?: string }[];
  filterLogic?: string;
  /** all = every record the user can see; mine = records they own. */
  scope: 'all' | 'mine';
  groupings: { field: string; granularity?: string }[];
  columnGrouping?: { field: string; granularity?: string } | null;
  aggregates: { field: string; fn: 'sum' | 'avg' | 'min' | 'max' | 'count' }[];
  sort?: { field: string; dir: 'asc' | 'desc' } | null;
  rowLimit?: number;
  chart?: { type: string; aggregateIndex?: number } | null;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    apiName: { type: String, required: true },
    description: { type: String },
    folder: { type: String, enum: ['public', 'private'], default: 'private' },
    ownerId: { type: String, required: true },
    ownerName: { type: String },
    objectApiName: { type: String, required: true },
    format: { type: String, enum: ['tabular', 'summary', 'matrix'], default: 'tabular' },
    columns: [{ type: String }],
    filters: [{ _id: false, field: String, operator: String, value: String }],
    filterLogic: { type: String },
    scope: { type: String, enum: ['all', 'mine'], default: 'all' },
    groupings: [{ _id: false, field: String, granularity: String }],
    columnGrouping: { type: Schema.Types.Mixed, default: null },
    aggregates: [{ _id: false, field: String, fn: String }],
    sort: { type: Schema.Types.Mixed, default: null },
    rowLimit: { type: Number },
    chart: { type: Schema.Types.Mixed, default: null },
    lastRunAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);

ReportSchema.index({ orgId: 1, apiName: 1 }, { unique: true });

export default mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);
