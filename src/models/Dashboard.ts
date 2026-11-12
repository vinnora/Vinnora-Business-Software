import mongoose, { Schema, Document } from 'mongoose';

export interface IDashboardComponent {
  id: string;
  reportId: string;
  title?: string;
  /** metric = single number, chart = report chart, table = grouped table. */
  kind: 'metric' | 'chart' | 'table';
  chartType?: string;
  /** Width in grid columns (1–3). */
  size: number;
  aggregateIndex?: number;
}

/**
 * One shared Home dashboard per app (appKey): the app's Home page shows its
 * default metrics followed by these report components. Dashboards without an
 * appKey are from the retired standalone Dashboards feature and are unused.
 */
export interface IDashboard extends Document {
  orgId: string;
  appKey?: string;
  name: string;
  apiName: string;
  description?: string;
  folder: 'public' | 'private';
  ownerId: string;
  ownerName?: string;
  components: IDashboardComponent[];
  createdAt: Date;
  updatedAt: Date;
}

const DashboardSchema = new Schema<IDashboard>(
  {
    orgId: { type: String, required: true, index: true },
    appKey: { type: String },
    name: { type: String, required: true },
    apiName: { type: String, required: true },
    description: { type: String },
    folder: { type: String, enum: ['public', 'private'], default: 'private' },
    ownerId: { type: String, required: true },
    ownerName: { type: String },
    components: [
      {
        _id: false,
        id: { type: String, required: true },
        reportId: { type: String, required: true },
        title: { type: String },
        kind: { type: String, enum: ['metric', 'chart', 'table'], default: 'chart' },
        chartType: { type: String },
        size: { type: Number, default: 1 },
        aggregateIndex: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

DashboardSchema.index({ orgId: 1, apiName: 1 }, { unique: true });
DashboardSchema.index({ orgId: 1, appKey: 1 });

export default mongoose.models.Dashboard || mongoose.model<IDashboard>('Dashboard', DashboardSchema);
