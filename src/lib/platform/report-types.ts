/** Report & dashboard types shared by server and client. */
import type { Condition, FieldDescribe } from './types';

export type ReportFormat = 'tabular' | 'summary' | 'matrix';
export type AggregateFn = 'sum' | 'avg' | 'min' | 'max' | 'count';
export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ChartType = 'none' | 'bar' | 'column' | 'stackedColumn' | 'line' | 'donut' | 'funnel';

export const CHART_LABELS: Record<ChartType, string> = {
  none: 'No chart',
  bar: 'Horizontal bar',
  column: 'Vertical column',
  stackedColumn: 'Stacked column',
  line: 'Line',
  donut: 'Donut',
  funnel: 'Funnel',
};

export const AGG_LABELS: Record<AggregateFn, string> = { sum: 'Sum', avg: 'Average', min: 'Min', max: 'Max', count: 'Record count' };

export interface Grouping {
  field: string;
  granularity?: DateGranularity;
}

export interface Aggregate {
  field: string;
  fn: AggregateFn;
}

export interface ReportDefinition {
  _id?: string;
  name: string;
  apiName?: string;
  description?: string;
  folder: 'public' | 'private';
  objectApiName: string;
  format: ReportFormat;
  columns: string[];
  filters: Condition[];
  filterLogic?: string;
  scope: 'all' | 'mine';
  groupings: Grouping[];
  columnGrouping?: Grouping | null;
  aggregates: Aggregate[];
  sort?: { field: string; dir: 'asc' | 'desc' } | null;
  rowLimit?: number;
  /** aggregateIndex: -1 = record count, otherwise index into aggregates. */
  chart?: { type: ChartType; aggregateIndex?: number } | null;
  ownerId?: string;
  ownerName?: string;
  canEdit?: boolean;
  updatedAt?: string;
}

export interface GroupNode {
  key: string;
  label: string;
  count: number;
  values: (number | null)[];
  children?: GroupNode[];
  rows?: Record<string, unknown>[];
}

export interface ReportResult {
  objectLabel: string;
  columns: FieldDescribe[];
  rows: Record<string, unknown>[];
  groups: GroupNode[];
  matrix: {
    rows: { key: string; label: string }[];
    cols: { key: string; label: string }[];
    cells: Record<string, Record<string, { count: number; values: (number | null)[] }>>;
    rowTotals: Record<string, { count: number; values: (number | null)[] }>;
    colTotals: Record<string, { count: number; values: (number | null)[] }>;
  } | null;
  totals: { count: number; values: (number | null)[] };
  /** Chart series from the first grouping (and column grouping for stacked charts). */
  chart: { label: string; value: number; series?: Record<string, number> }[];
  chartSeries: string[];
  aggregateLabels: string[];
  truncated: boolean;
  totalRecords: number;
  hiddenFields: string[];
}

export interface DashboardComponentDTO {
  id: string;
  reportId: string;
  title?: string;
  kind: 'metric' | 'chart' | 'table';
  chartType?: ChartType;
  size: number;
  aggregateIndex?: number;
}

/** Per report: its definition and result as run for the viewer, or why it couldn't run. */
export type HomeDataMap = Record<string, { report?: ReportDefinition; result?: ReportResult; error?: string }>;

/** An app's Home dashboard: report components shown under the app's default metrics. */
export interface HomeDashboardDTO {
  components: DashboardComponentDTO[];
  /** Viewer may add/remove components (needs "Manage Public Reports"). */
  canEdit: boolean;
  data: HomeDataMap;
  updatedAt?: string;
}
