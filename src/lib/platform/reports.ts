/** Report engine: validation, execution and aggregation. Server-only. */
import mongoose from 'mongoose';
import type { AuthContext } from '@/lib/auth-helpers';
import CustomRecord from '@/models/CustomRecord';
import Report from '@/models/Report';
import { getObjectAccess, getEffectivePermissions, type ObjectAccess } from './access';
import { conditionsToMongo, validateLogic } from './conditions';
import { recordName } from './describe';
import { getStandardObject } from './registry';
import { cleanConditions } from './rule-input';
import { BadRequestError, NotFoundError } from './errors';
import { toApiName, type FieldDescribe } from './types';
import type {
  Aggregate,
  AggregateFn,
  DateGranularity,
  GroupNode,
  Grouping,
  ReportDefinition,
  ReportResult,
} from './report-types';

type Rec = Record<string, unknown>;
const MAX_RECORDS = 50000;
const MAX_ROWS = 2000;
const NUMERIC = new Set(['number', 'currency', 'percent']);
const AGG_FNS: AggregateFn[] = ['sum', 'avg', 'min', 'max', 'count'];
const GRANULARITIES: DateGranularity[] = ['day', 'week', 'month', 'quarter', 'year'];

function effType(f?: FieldDescribe) {
  return f?.type === 'formula' ? f.returnType || 'text' : f?.type;
}

/* ------------------------------------------------------------------ */
/* Definition validation                                               */
/* ------------------------------------------------------------------ */

export async function cleanReportDefinition(ctx: AuthContext, body: Rec): Promise<ReportDefinition> {
  const objectApiName = String(body.objectApiName || '');
  const access = await getObjectAccess(ctx, objectApiName);
  access.assert('read');
  if (!access.object.enforced) throw new BadRequestError(`${access.object.label} isn't connected to the platform yet, so it can't be reported on.`);
  const fields = new Map(access.object.fields.map((f) => [f.apiName, f]));
  const known = (f: unknown) => typeof f === 'string' && (fields.has(f) || f === '_id');

  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) throw new BadRequestError('Report name is required');
  const format = (['tabular', 'summary', 'matrix'].includes(String(body.format)) ? body.format : 'tabular') as ReportDefinition['format'];

  const columns = (Array.isArray(body.columns) ? body.columns : []).filter(known).slice(0, 40) as string[];
  if (!columns.length) throw new BadRequestError('Add at least one column');

  const cleanGrouping = (g: unknown): Grouping | null => {
    const o = (g || {}) as Rec;
    if (!known(o.field)) return null;
    const f = fields.get(String(o.field));
    const isDate = ['date', 'datetime'].includes(effType(f) || '');
    const granularity = isDate && GRANULARITIES.includes(o.granularity as DateGranularity) ? (o.granularity as DateGranularity) : isDate ? 'month' : undefined;
    return { field: String(o.field), ...(granularity ? { granularity } : {}) };
  };
  let groupings = (Array.isArray(body.groupings) ? body.groupings : []).map(cleanGrouping).filter((g): g is Grouping => Boolean(g));
  let columnGrouping = format === 'matrix' ? cleanGrouping(body.columnGrouping) : null;
  if (format === 'tabular') groupings = [];
  if (format === 'summary') groupings = groupings.slice(0, 3);
  if (format === 'matrix') groupings = groupings.slice(0, 1);
  if (format !== 'tabular' && !groupings.length) throw new BadRequestError('Choose a field to group rows by');
  if (format === 'matrix' && !columnGrouping) throw new BadRequestError('Choose a field to group columns by');
  if (format !== 'matrix') columnGrouping = null;

  const aggregates: Aggregate[] = (Array.isArray(body.aggregates) ? body.aggregates : [])
    .map((a) => (a || {}) as Rec)
    .filter((a) => AGG_FNS.includes(a.fn as AggregateFn) && a.fn !== 'count' && known(a.field) && NUMERIC.has(effType(fields.get(String(a.field))) || ''))
    .slice(0, 6)
    .map((a) => ({ field: String(a.field), fn: a.fn as AggregateFn }));

  const filters = cleanConditions(body.filters, access.object, { allowFormula: false });
  const filterLogic = String(body.filterLogic || '').trim().slice(0, 300);
  if (filters.length > 1 && filterLogic) {
    const err = validateLogic(filterLogic, filters.length);
    if (err) throw new BadRequestError(err);
  }

  const sortRaw = (body.sort || null) as Rec | null;
  const sort = sortRaw && known(sortRaw.field) ? { field: String(sortRaw.field), dir: sortRaw.dir === 'asc' ? ('asc' as const) : ('desc' as const) } : null;
  const chartRaw = (body.chart || null) as Rec | null;
  const chartType = String(chartRaw?.type || 'none');
  const chart =
    format !== 'tabular' && chartType !== 'none' && ['bar', 'column', 'stackedColumn', 'line', 'donut', 'funnel'].includes(chartType)
      ? { type: chartType as NonNullable<ReportDefinition['chart']>['type'], aggregateIndex: Math.min(Number(chartRaw?.aggregateIndex ?? -1), aggregates.length - 1) }
      : null;

  return {
    name,
    description: String(body.description || '').slice(0, 1000),
    folder: body.folder === 'public' ? 'public' : 'private',
    objectApiName: access.object.apiName,
    format,
    columns,
    filters,
    filterLogic: filters.length > 1 ? filterLogic : '',
    scope: body.scope === 'mine' ? 'mine' : 'all',
    groupings,
    columnGrouping,
    aggregates,
    sort,
    rowLimit: Math.min(Math.max(Number(body.rowLimit) || MAX_ROWS, 1), MAX_ROWS),
    chart,
  };
}

export async function uniqueReportApiName(tenant: string, name: string, model: mongoose.Model<unknown> = Report as unknown as mongoose.Model<unknown>) {
  const base = toApiName(name);
  let api = base;
  for (let i = 2; await model.exists({ orgId: tenant, apiName: api }); i++) api = `${base}_${i}`;
  return api;
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

function bucket(value: unknown, f: FieldDescribe | undefined, g: Grouping): { key: string; sort: string | number } {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return { key: '', sort: '￿' };
  const t = effType(f);
  if ((t === 'date' || t === 'datetime') && g.granularity) {
    const d = new Date(String(value instanceof Date ? value.toISOString() : value));
    if (Number.isNaN(d.getTime())) return { key: String(value), sort: String(value) };
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    switch (g.granularity) {
      case 'year':
        return { key: `${y}`, sort: y };
      case 'quarter':
        return { key: `${y}-Q${Math.floor(m / 3) + 1}`, sort: y * 10 + Math.floor(m / 3) };
      case 'month':
        return { key: `${y}-${String(m + 1).padStart(2, '0')}`, sort: y * 100 + m };
      case 'week': {
        const day = Date.UTC(y, m, d.getUTCDate());
        const monday = new Date(day - ((new Date(day).getUTCDay() + 6) % 7) * 86400000);
        const k = monday.toISOString().slice(0, 10);
        return { key: k, sort: monday.getTime() };
      }
      default:
        return { key: d.toISOString().slice(0, 10), sort: d.getTime() };
    }
  }
  if (Array.isArray(value)) return { key: value.join(';'), sort: value.join(';') };
  if (t === 'checkbox') return { key: value ? 'true' : 'false', sort: value ? 0 : 1 };
  if (NUMERIC.has(t || '')) return { key: String(value), sort: Number(value) };
  return { key: String(value), sort: String(value).toLowerCase() };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labelFor(key: string, f: FieldDescribe | undefined, g: Grouping, names: Map<string, string>): string {
  if (key === '') return '(blank)';
  const t = effType(f);
  if (t === 'picklist') return f?.picklistValues?.find((p) => p.value === key)?.label || key;
  if (t === 'checkbox') return key === 'true' ? 'Yes' : 'No';
  if (t === 'lookup') return names.get(key) || key;
  if ((t === 'date' || t === 'datetime') && g.granularity === 'month') {
    const [y, m] = key.split('-');
    return `${MONTHS[Number(m) - 1]} ${y}`;
  }
  if ((t === 'date' || t === 'datetime') && g.granularity === 'week') return `Week of ${key}`;
  return key;
}

function aggregate(recs: Rec[], aggs: Aggregate[]): (number | null)[] {
  return aggs.map((a) => {
    const nums = recs.map((r) => r[a.field]).filter((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))).map(Number);
    if (!nums.length) return null;
    switch (a.fn) {
      case 'sum':
        return nums.reduce((s, n) => s + n, 0);
      case 'avg':
        return nums.reduce((s, n) => s + n, 0) / nums.length;
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
      default:
        return nums.length;
    }
  });
}

/** Names for lookup values used as group keys. */
async function lookupNames(ctx: AuthContext, f: FieldDescribe | undefined, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!f || f.type !== 'lookup' || !f.referenceTo) return out;
  const valid = ids.filter((id) => mongoose.isValidObjectId(id));
  if (!valid.length) return out;
  try {
    const ref = await getObjectAccess(ctx, f.referenceTo);
    if (!ref.perm.read) return out;
    const model = ref.object.isCustom ? CustomRecord : getStandardObject(ref.object.apiName)?.model;
    if (!model) return out;
    const docs = await model.find({ $and: [{ _id: { $in: valid } }, await ref.readFilter()] }).limit(valid.length);
    for (const d of docs) {
      const r = ref.shape(d);
      out.set(String(r._id), recordName(ref, r));
    }
  } catch {
    /* names are cosmetic */
  }
  return out;
}

export async function runReport(ctx: AuthContext, def: ReportDefinition): Promise<ReportResult> {
  const access: ObjectAccess = await getObjectAccess(ctx, def.objectApiName);
  access.assert('read');
  const byApi = Object.fromEntries(access.object.fields.map((f) => [f.apiName, f]));
  const fieldPerm = (api: string) => (api === '_id' ? true : byApi[api] ? access.fieldPerm(byApi[api]).read : false);

  // Fields the user can't read are dropped from the report (field-level security).
  const used = [...def.columns, ...def.groupings.map((g) => g.field), ...def.aggregates.map((a) => a.field), ...(def.columnGrouping ? [def.columnGrouping.field] : [])];
  const hiddenFields = [...new Set(used.filter((f) => !fieldPerm(f)))];
  const columns = def.columns.filter((c) => fieldPerm(c) && byApi[c]).map((c) => byApi[c]);
  const groupings = def.groupings.filter((g) => fieldPerm(g.field));
  const colGroup = def.columnGrouping && fieldPerm(def.columnGrouping.field) ? def.columnGrouping : null;
  const aggregates = def.aggregates.filter((a) => fieldPerm(a.field));
  const filters = def.filters.filter((c) => fieldPerm(c.field));

  const and: Rec[] = [await access.readFilter()];
  if (filters.length) {
    const logic = filters.length === def.filters.length ? def.filterLogic : '';
    and.push(conditionsToMongo(filters, logic, byApi, access.perms.userTokens));
  }
  if (def.scope === 'mine') {
    if (!byApi.ownerId) throw new BadRequestError(`${access.object.label} has no owner field, so "My records" isn't available.`);
    and.push({ [byApi.ownerId.path]: ctx.userId });
  }
  const model = access.object.isCustom ? CustomRecord : getStandardObject(access.object.apiName)?.model;
  if (!model) throw new NotFoundError('Unknown object');

  const sortPath = def.sort && fieldPerm(def.sort.field) ? (byApi[def.sort.field]?.path ?? def.sort.field) : 'updatedAt';
  const sortDir = def.sort?.dir === 'asc' ? 1 : -1;
  const totalRecords = await model.countDocuments({ $and: and });
  const docs = await model.find({ $and: and }).sort({ [sortPath]: sortDir, _id: 1 }).limit(MAX_RECORDS);
  const recs = access.shapeMany(docs);
  const truncated = totalRecords > recs.length;

  const totals = { count: recs.length, values: aggregate(recs, aggregates) };
  const aggregateLabels = aggregates.map((a) => `${a.fn === 'avg' ? 'Average' : a.fn[0].toUpperCase() + a.fn.slice(1)} of ${byApi[a.field]?.label || a.field}`);

  // Lookup names for grouped lookup fields
  const names = new Map<string, string>();
  for (const g of [...groupings, ...(colGroup ? [colGroup] : [])]) {
    const f = byApi[g.field];
    if (f?.type === 'lookup') {
      const ids = [...new Set(recs.map((r) => r[g.field]).filter(Boolean).map(String))];
      for (const [k, v] of await lookupNames(ctx, f, ids)) names.set(k, v);
    }
  }

  const rowLimit = def.rowLimit || MAX_ROWS;
  let rowsLeft = rowLimit;
  const build = (items: Rec[], level: number): GroupNode[] => {
    const g = groupings[level];
    const f = byApi[g.field];
    const buckets = new Map<string, { sort: string | number; items: Rec[] }>();
    for (const r of items) {
      const b = bucket(r[g.field], f, g);
      const cur = buckets.get(b.key) || { sort: b.sort, items: [] };
      cur.items.push(r);
      buckets.set(b.key, cur);
    }
    return [...buckets.entries()]
      .sort((a, b) => (a[1].sort < b[1].sort ? -1 : a[1].sort > b[1].sort ? 1 : 0))
      .map(([key, v]) => {
        const node: GroupNode = { key, label: labelFor(key, f, g, names), count: v.items.length, values: aggregate(v.items, aggregates) };
        if (level + 1 < groupings.length) node.children = build(v.items, level + 1);
        else if (def.format === 'summary') {
          node.rows = v.items.slice(0, Math.max(rowsLeft, 0));
          rowsLeft -= node.rows.length;
        }
        return node;
      });
  };

  let groups: GroupNode[] = [];
  let matrix: ReportResult['matrix'] = null;
  if (def.format !== 'tabular' && groupings.length) groups = build(recs, 0);

  const chartIdx = def.chart?.aggregateIndex ?? -1;
  const chartValue = (n: { count: number; values: (number | null)[] }) => (chartIdx >= 0 && chartIdx < aggregates.length ? n.values[chartIdx] ?? 0 : n.count);
  let chart: ReportResult['chart'] = groups.map((g) => ({ label: g.label, value: chartValue(g) }));
  let chartSeries: string[] = [];

  if (def.format === 'matrix' && colGroup && groupings.length) {
    const rf = byApi[groupings[0].field];
    const cf = byApi[colGroup.field];
    const rowKeys = new Map<string, string | number>();
    const colKeys = new Map<string, string | number>();
    const cellItems = new Map<string, Rec[]>();
    for (const r of recs) {
      const rb = bucket(r[groupings[0].field], rf, groupings[0]);
      const cb = bucket(r[colGroup.field], cf, colGroup);
      rowKeys.set(rb.key, rb.sort);
      colKeys.set(cb.key, cb.sort);
      const k = `${rb.key}\u0000${cb.key}`;
      cellItems.set(k, [...(cellItems.get(k) || []), r]);
    }
    const ordered = (m: Map<string, string | number>) => [...m.entries()].sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map(([k]) => k);
    const rk = ordered(rowKeys);
    const ck = ordered(colKeys);
    const cells: NonNullable<ReportResult['matrix']>['cells'] = {};
    const rowTotals: NonNullable<ReportResult['matrix']>['rowTotals'] = {};
    const colTotals: NonNullable<ReportResult['matrix']>['colTotals'] = {};
    for (const r of rk) {
      cells[r] = {};
      for (const c of ck) {
        const items = cellItems.get(`${r}\u0000${c}`) || [];
        if (items.length) cells[r][c] = { count: items.length, values: aggregate(items, aggregates) };
      }
      const rowItems = recs.filter((x) => bucket(x[groupings[0].field], rf, groupings[0]).key === r);
      rowTotals[r] = { count: rowItems.length, values: aggregate(rowItems, aggregates) };
    }
    for (const c of ck) {
      const colItems = recs.filter((x) => bucket(x[colGroup.field], cf, colGroup).key === c);
      colTotals[c] = { count: colItems.length, values: aggregate(colItems, aggregates) };
    }
    matrix = {
      rows: rk.map((k) => ({ key: k, label: labelFor(k, rf, groupings[0], names) })),
      cols: ck.map((k) => ({ key: k, label: labelFor(k, cf, colGroup, names) })),
      cells,
      rowTotals,
      colTotals,
    };
    chartSeries = matrix.cols.map((c) => c.label);
    chart = matrix.rows.map((r) => ({
      label: r.label,
      value: chartValue(rowTotals[r.key]),
      series: Object.fromEntries(matrix!.cols.map((c) => [c.label, cells[r.key][c.key] ? chartValue(cells[r.key][c.key]) : 0])),
    }));
  }

  return {
    objectLabel: access.object.pluralLabel,
    columns,
    rows: def.format === 'tabular' ? recs.slice(0, rowLimit) : [],
    groups,
    matrix,
    totals,
    chart,
    chartSeries,
    aggregateLabels,
    truncated,
    totalRecords,
    hiddenFields,
  };
}

/* ------------------------------------------------------------------ */
/* Access to saved reports / dashboards                                */
/* ------------------------------------------------------------------ */

export async function canManagePublic(ctx: AuthContext) {
  return (await getEffectivePermissions(ctx)).system.manageReports;
}

/** Viewable = public, or private and owned by the user. */
export function canView(ctx: AuthContext, doc: { folder: string; ownerId: string }) {
  return doc.folder === 'public' || doc.ownerId === ctx.userId;
}

export async function canEdit(ctx: AuthContext, doc: { folder: string; ownerId: string }) {
  if (doc.folder === 'private') return doc.ownerId === ctx.userId;
  return canManagePublic(ctx);
}

/** Saved report document → definition. */
export function toDefinition(doc: Rec): ReportDefinition {
  return {
    _id: String(doc._id),
    name: String(doc.name),
    apiName: String(doc.apiName),
    description: (doc.description as string) || '',
    folder: doc.folder as ReportDefinition['folder'],
    objectApiName: String(doc.objectApiName),
    format: doc.format as ReportDefinition['format'],
    columns: (doc.columns as string[]) || [],
    filters: (doc.filters as ReportDefinition['filters']) || [],
    filterLogic: (doc.filterLogic as string) || '',
    scope: (doc.scope as ReportDefinition['scope']) || 'all',
    groupings: (doc.groupings as Grouping[]) || [],
    columnGrouping: (doc.columnGrouping as Grouping | null) || null,
    aggregates: (doc.aggregates as Aggregate[]) || [],
    sort: (doc.sort as ReportDefinition['sort']) || null,
    rowLimit: (doc.rowLimit as number) || MAX_ROWS,
    chart: (doc.chart as ReportDefinition['chart']) || null,
    ownerId: String(doc.ownerId),
    ownerName: (doc.ownerName as string) || '',
    updatedAt: doc.updatedAt ? new Date(String(doc.updatedAt)).toISOString() : undefined,
  };
}
