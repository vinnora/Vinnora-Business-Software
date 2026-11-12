/**
 * Data Loader: bulk insert / update / upsert / delete and CSV export for
 * "connected" objects (enforced standard objects + all custom objects). Server-only.
 *
 * Every row goes through the same pipeline as the record APIs (permissions, FLS,
 * type coercion, required/unique checks, validation rules, restriction rules) and
 * the same server-side hooks as the module APIs (case numbers, SLAs, opportunity
 * probability, workflow rules).
 */
import mongoose from 'mongoose';
import { ForbiddenError, type AuthContext } from '@/lib/auth-helpers';
import { buildCreateDoc, buildUpdate, getObjectAccess, type ObjectAccess, type PreparedWrite } from './access';
import { conditionsToMongo, LogicError } from './conditions';
import { csvValue, toCsv } from './csv';
import { BadRequestError, NotFoundError, ValidationError } from './errors';
import { fieldsByApi, legacyOwnerKey, tenantOf } from './metadata';
import { getStandardObject, type StandardObject } from './registry';
import type { Condition, FieldDescribe, FieldError } from './types';
import CustomRecord from '@/models/CustomRecord';
import SLA from '@/models/SLA';
import { STAGE_PROBABILITY, type OpportunityStage } from '@/models/Opportunity';
import DataLoadJob, { type DataLoadOperation } from '@/models/DataLoadJob';
import { runWorkflows } from '@/lib/workflows';
import type { WorkflowObject } from '@/models/WorkflowRule';

type Doc = Record<string, unknown>;
type RecordModel = StandardObject['model'];

export type ImportOperation = Exclude<DataLoadOperation, 'export'>;
export const IMPORT_OPERATIONS: ImportOperation[] = ['insert', 'update', 'upsert', 'delete'];
export const MAX_BATCH_ROWS = 200;
export const MAX_EXPORT_ROWS = 50_000;
/** Cell value that clears a field on update / upsert (blank cells leave the field unchanged). */
export const CLEAR_VALUE = '#N/A';

export interface RowResult {
  index: number;
  success: boolean;
  id?: string;
  /** true = inserted, false = updated / deleted. */
  created?: boolean;
  errors?: FieldError[];
}

/* ------------------------------------------------------------------ */
/* Object resolution                                                   */
/* ------------------------------------------------------------------ */

/** Access for a connected object; 400 if the object isn't connected to the platform. */
export async function connectedAccess(ctx: AuthContext, objectApiName: string): Promise<ObjectAccess> {
  if (!objectApiName || typeof objectApiName !== 'string') throw new BadRequestError('objectApiName is required');
  const std = getStandardObject(objectApiName);
  if (std && !std.enforced) {
    throw new BadRequestError(`${std.pluralLabel} aren't connected to the platform yet and can't be used with the Data Loader.`);
  }
  let access: ObjectAccess;
  try {
    access = await getObjectAccess(ctx, std ? std.apiName : objectApiName);
  } catch (e) {
    if (e instanceof NotFoundError) throw new BadRequestError(`Object ${objectApiName} not found.`);
    throw e;
  }
  if (!access.object.enforced) {
    throw new BadRequestError(`${access.object.pluralLabel} aren't connected to the platform yet and can't be used with the Data Loader.`);
  }
  return access;
}

export function modelFor(access: ObjectAccess): RecordModel {
  if (access.object.isCustom) return CustomRecord as RecordModel;
  const model = getStandardObject(access.object.apiName)?.model;
  if (!model) throw new BadRequestError('Unknown object');
  return model;
}

/** Fields usable to find existing records on update / upsert. */
export function isMatchableField(access: ObjectAccess, apiName: string): boolean {
  if (apiName === '_id') return true;
  const f = access.field(apiName);
  return Boolean(f && f.type !== 'formula' && f.active !== false && access.fieldPerm(f).read);
}

/* ------------------------------------------------------------------ */
/* Per-object hooks (mirror the module APIs)                           */
/* ------------------------------------------------------------------ */

const WORKFLOW_OBJECTS = new Set<string>(['Lead', 'Opportunity', 'Case']);

function generateCaseNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CASE-${year}-${random}`;
}

/** Server-supplied values for a new record. */
async function createExtras(access: ObjectAccess, prepared: PreparedWrite): Promise<Doc> {
  const ctx = access.ctx;
  if (access.object.isCustom) {
    return { objectApiName: access.object.apiName, createdById: ctx.userId, lastModifiedById: ctx.userId };
  }
  switch (access.object.apiName) {
    case 'Case': {
      const priority = (prepared.set.priority as string) || 'Medium';
      const extra: Doc = { caseNumber: generateCaseNumber(), priority };
      const sla = await SLA.findOne({
        $or: [{ orgId: tenantOf(ctx) }, { userId: legacyOwnerKey(ctx) }],
        active: true,
        appliesToPriority: priority,
      });
      if (sla) {
        extra.slaId = String(sla._id);
        extra.slaDueAt = new Date(Date.now() + Number(sla.resolutionMinutes) * 60 * 1000);
      }
      return extra;
    }
    case 'Opportunity': {
      const stage = ((prepared.set.stage as string) || 'Prospecting') as OpportunityStage;
      return { stage, probability: STAGE_PROBABILITY[stage] ?? 10 };
    }
    default:
      return {};
  }
}

/** Server-maintained values for an update. */
function updateExtras(access: ObjectAccess, prepared: PreparedWrite): Doc {
  if (access.object.isCustom) return { lastModifiedById: access.ctx.userId };
  const extra: Doc = {};
  switch (access.object.apiName) {
    case 'Opportunity':
      if (prepared.set.stage !== undefined && prepared.set.stage !== null) {
        extra.probability = STAGE_PROBABILITY[prepared.set.stage as OpportunityStage] ?? 10;
      }
      break;
    case 'Case':
      if (prepared.set.status === 'Resolved') extra.resolvedAt = new Date();
      if (prepared.set.status === 'Closed') extra.closedAt = new Date();
      break;
  }
  return extra;
}

async function fireWorkflows(access: ObjectAccess, record: unknown, event: 'created' | 'fieldChanged', changed?: string[]) {
  if (access.object.isCustom || !WORKFLOW_OBJECTS.has(access.object.apiName)) return;
  try {
    await runWorkflows({
      objectType: access.object.apiName as WorkflowObject,
      event,
      record,
      userId: legacyOwnerKey(access.ctx),
      orgId: tenantOf(access.ctx),
      changedFields: changed,
    });
  } catch (e) {
    console.error('[data-loader] workflow error', e);
  }
}

function isDuplicateKey(e: unknown, path?: string): boolean {
  if (!e || typeof e !== 'object' || (e as { code?: number }).code !== 11000) return false;
  if (!path) return true;
  const kp = (e as { keyPattern?: Doc }).keyPattern;
  return Boolean(kp && path in kp);
}

async function insertRecord(access: ObjectAccess, model: RecordModel, prepared: PreparedWrite) {
  const extra = await createExtras(access, prepared);
  // Case numbers are random; retry on the (rare) unique collision.
  for (let attempt = 0; ; attempt++) {
    try {
      const created = await model.create(buildCreateDoc(access, prepared, extra));
      await fireWorkflows(access, created, 'created');
      return created;
    } catch (e) {
      if (access.object.apiName === 'Case' && attempt < 4 && isDuplicateKey(e, 'caseNumber')) {
        extra.caseNumber = generateCaseNumber();
        continue;
      }
      throw e;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Row helpers                                                         */
/* ------------------------------------------------------------------ */

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on', 'x', 'checked']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off', 'unchecked']);

function cell(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Turn a CSV row into a write payload.
 * - blank cells are skipped (insert: field not provided; update: leave unchanged)
 * - `#N/A` clears the field on update/upsert and is ignored on insert
 * - checkbox values accept true/false, yes/no, 1/0 (any case)
 */
function rowPayload(access: ObjectAccess, row: Doc, isCreate: boolean): { payload: Doc; errors: FieldError[] } {
  const payload: Doc = {};
  const errors: FieldError[] = [];
  for (const [key, raw] of Object.entries(row)) {
    if (key === '_id') continue;
    const f = access.field(key);
    let v = cell(raw);
    if (f?.type !== 'textarea') v = v.trim();
    if (v === '') continue;
    if (v.toUpperCase() === CLEAR_VALUE) {
      if (!isCreate) payload[key] = '';
      continue;
    }
    if (f?.type === 'checkbox') {
      const lower = v.toLowerCase();
      if (TRUE_VALUES.has(lower)) v = 'true';
      else if (FALSE_VALUES.has(lower)) v = 'false';
      else {
        errors.push({ field: key, message: `${f.label} must be true or false.` });
        continue;
      }
    }
    payload[key] = v;
  }
  return { payload, errors };
}

/** Coerce a match value to the stored type of the field. */
function matchValue(f: FieldDescribe | undefined, raw: string): unknown {
  switch (f?.type) {
    case 'number':
    case 'currency':
    case 'percent': {
      const n = Number(raw.replace(/,/g, ''));
      return Number.isNaN(n) ? raw : n;
    }
    case 'checkbox':
      return TRUE_VALUES.has(raw.toLowerCase());
    case 'date':
    case 'datetime': {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? raw : d;
    }
    default:
      return raw;
  }
}

type Located = { doc: Doc & { _id: unknown } } | { doc: null; blank: true } | { error: FieldError };

/** Find the single visible record a row refers to. */
async function locate(access: ObjectAccess, model: RecordModel, visible: Doc, row: Doc, key: string): Promise<Located> {
  const raw = cell(row[key]).trim();
  if (!raw) return { doc: null, blank: true };
  if (key === '_id') {
    if (!mongoose.isValidObjectId(raw)) return { error: { field: '_id', message: `'${raw}' is not a valid record ID.` } };
    const doc = await model.findOne({ $and: [{ _id: raw }, visible] });
    if (!doc) return { error: { field: '_id', message: `Record ${raw} not found or you don't have access to it.` } };
    return { doc };
  }
  const f = access.field(key);
  const label = f?.label || key;
  const q = { $and: [{ [f?.path || key]: matchValue(f, raw) }, visible] };
  const docs = await model.find(q).limit(2);
  if (docs.length === 0) return { doc: null, blank: true };
  if (docs.length > 1) {
    const n = await model.countDocuments(q);
    return { error: { field: key, message: `${label} '${raw}' matches ${n} records.` } };
  }
  return { doc: docs[0] };
}

function errorsOf(e: unknown): FieldError[] {
  if (e instanceof ValidationError) return e.errors;
  if (e instanceof mongoose.Error.ValidationError) {
    return Object.values(e.errors).map((x) => ({ field: x.path, message: x.message }));
  }
  if (e instanceof mongoose.Error.CastError) return [{ field: e.path, message: `Invalid value for ${e.path}.` }];
  if (isDuplicateKey(e)) return [{ message: 'Duplicate value: a record with this value already exists.' }];
  if (e instanceof ForbiddenError || e instanceof NotFoundError || e instanceof BadRequestError) return [{ message: e.message }];
  console.error('[data-loader] row error', e);
  return [{ message: e instanceof Error ? e.message : 'Unexpected error' }];
}

/* ------------------------------------------------------------------ */
/* Batch processing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Process up to MAX_BATCH_ROWS rows. Each row is { fieldApiName: csvValue } (plus optional `_id`).
 * A failing row never stops the batch; results are returned in row order.
 */
export async function processBatch(
  ctx: AuthContext,
  objectApiName: string,
  operation: ImportOperation,
  rows: Doc[],
  matchField?: string,
): Promise<RowResult[]> {
  if (!IMPORT_OPERATIONS.includes(operation)) throw new BadRequestError(`Unsupported operation ${operation}`);
  if (rows.length > MAX_BATCH_ROWS) throw new BadRequestError(`A batch can contain at most ${MAX_BATCH_ROWS} rows.`);
  const access = await connectedAccess(ctx, objectApiName);
  const model = modelFor(access);
  const key = matchField || '_id';
  if (!isMatchableField(access, key)) throw new BadRequestError(`${key} can't be used to match records.`);

  // Object-level checks fail every row with the same message (but still per-row results).
  try {
    if (operation === 'insert') access.assert('create');
    else if (operation === 'update') access.assert('edit');
    else if (operation === 'delete') access.assert('delete');
    else access.assert('read');
  } catch (e) {
    const errors = errorsOf(e);
    return rows.map((_, index) => ({ index, success: false, errors }));
  }
  const visible = await access.readFilter();
  const results: RowResult[] = [];

  const insert = async (row: Doc, index: number): Promise<RowResult> => {
    const { payload, errors } = rowPayload(access, row, true);
    if (errors.length) return { index, success: false, errors };
    const prepared = await access.prepareWrite(payload, undefined, { passthrough: false });
    const created = await insertRecord(access, model, prepared);
    return { index, success: true, id: String(created._id), created: true };
  };

  const update = async (existing: Doc & { _id: unknown }, row: Doc, index: number): Promise<RowResult> => {
    const { payload, errors } = rowPayload(access, row, false);
    if (errors.length) return { index, success: false, errors };
    const prepared = await access.prepareWrite(payload, existing, { passthrough: false });
    const id = String(existing._id);
    if (prepared.changed.length) {
      const updated = await model.findOneAndUpdate(
        { _id: existing._id },
        buildUpdate(access, prepared, updateExtras(access, prepared)),
        { returnDocument: 'after' },
      );
      if (!updated) return { index, success: false, errors: [{ message: 'Record was deleted while loading.' }] };
      await fireWorkflows(access, updated, 'fieldChanged', prepared.changed);
    }
    return { index, success: true, id, created: false };
  };

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] && typeof rows[index] === 'object' ? rows[index] : {};
    try {
      switch (operation) {
        case 'insert':
          results.push(await insert(row, index));
          break;
        case 'update': {
          // The match field, falling back to _id when the row has one.
          const k = cell(row[key]).trim() || key === '_id' ? key : '_id';
          const found = await locate(access, model, visible, row, k);
          if ('error' in found) results.push({ index, success: false, errors: [found.error] });
          else if (!found.doc) {
            const label = k === '_id' ? 'Record ID' : access.field(k)?.label || k;
            const msg = cell(row[k]).trim() ? `No record found with ${label} '${cell(row[k]).trim()}'.` : `${label} is required to update a record.`;
            results.push({ index, success: false, errors: [{ field: k, message: msg }] });
          } else results.push(await update(found.doc, row, index));
          break;
        }
        case 'upsert': {
          // 0 matches → insert (blank Id = new record); 1 → update; >1 → error. An unknown Id is an error.
          const found = await locate(access, model, visible, row, key);
          if ('error' in found) results.push({ index, success: false, errors: [found.error] });
          else if (found.doc) results.push(await update(found.doc, row, index));
          else if (key !== '_id' && !cell(row[key]).trim()) {
            const label = access.field(key)?.label || key;
            results.push({ index, success: false, errors: [{ field: key, message: `${label} is required to match records.` }] });
          } else results.push(await insert(row, index));
          break;
        }
        case 'delete': {
          if (!cell(row._id).trim()) {
            results.push({ index, success: false, errors: [{ field: '_id', message: 'Record ID is required to delete a record.' }] });
            break;
          }
          const found = await locate(access, model, visible, row, '_id');
          if ('error' in found) results.push({ index, success: false, errors: [found.error] });
          else if (found.doc) {
            await model.deleteOne({ _id: found.doc._id });
            results.push({ index, success: true, id: String(found.doc._id), created: false });
          }
          break;
        }
      }
    } catch (e) {
      results.push({ index, success: false, errors: errorsOf(e) });
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export interface ExportOptions {
  fields?: string[];
  filters?: Condition[];
  filterLogic?: string;
}

export interface ExportResult {
  csv: string;
  count: number;
  truncated: boolean;
  fileName: string;
  access: ObjectAccess;
}

function exportValue(f: FieldDescribe | undefined, v: unknown): string {
  if (f?.type === 'date' && v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (f?.type === 'date' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  return csvValue(v);
}

export async function exportRecords(ctx: AuthContext, objectApiName: string, opts: ExportOptions = {}): Promise<ExportResult> {
  const access = await connectedAccess(ctx, objectApiName);
  access.assert('read');
  const model = modelFor(access);
  const readable = access.object.fields.filter((f) => f.active !== false && access.fieldPerm(f).read);
  const readableSet = new Set(readable.map((f) => f.apiName));

  let fields: string[];
  if (opts.fields && opts.fields.length) {
    const bad = opts.fields.filter((f) => f !== '_id' && !readableSet.has(f));
    if (bad.length) throw new BadRequestError(`Unknown or hidden field(s): ${bad.join(', ')}`);
    fields = [...new Set(opts.fields)];
  } else {
    fields = ['_id', ...readable.filter((f) => !f.isSystem).map((f) => f.apiName)];
  }

  const filters = (opts.filters || []).filter((c) => c && c.field);
  let filter: Doc = {};
  if (filters.length) {
    for (const c of filters) {
      const f = access.field(c.field);
      if (!f || !readableSet.has(c.field)) throw new BadRequestError(`Can't filter on ${c.field}.`);
      if (f.type === 'formula') throw new BadRequestError(`Formula fields (${f.label}) can't be used in export filters.`);
    }
    try {
      filter = conditionsToMongo(filters, opts.filterLogic || undefined, fieldsByApi(access.object), access.perms.userTokens);
    } catch (e) {
      if (e instanceof LogicError) throw new BadRequestError(e.message);
      throw e;
    }
  }
  const visible = await access.readFilter();
  const query = Object.keys(filter).length ? { $and: [visible, filter] } : visible;
  const docs = await model.find(query).sort({ _id: 1 }).limit(MAX_EXPORT_ROWS + 1).lean();
  const truncated = docs.length > MAX_EXPORT_ROWS;
  const slice = truncated ? docs.slice(0, MAX_EXPORT_ROWS) : docs;

  const rows = slice.map((d) => {
    const shaped = access.shape(d);
    return fields.map((api) => exportValue(access.field(api), shaped[api]));
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    csv: toCsv(rows, fields),
    count: rows.length,
    truncated,
    fileName: `${access.object.apiName}-export-${stamp}.csv`,
    access,
  };
}

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

export async function createJob(
  ctx: AuthContext,
  access: ObjectAccess,
  data: { operation: DataLoadOperation; fileName?: string; matchField?: string; total?: number; status?: 'running' | 'completed'; succeeded?: number },
) {
  return DataLoadJob.create({
    orgId: tenantOf(ctx),
    userId: ctx.userId,
    userName: ctx.user?.name || ctx.user?.email || '',
    objectApiName: access.object.apiName,
    objectLabel: access.object.label,
    operation: data.operation,
    fileName: (data.fileName || '').slice(0, 255),
    matchField: data.matchField || undefined,
    total: Math.max(0, Math.floor(Number(data.total) || 0)),
    succeeded: data.succeeded || 0,
    failed: 0,
    status: data.status || 'running',
  });
}

export function jobDTO(j: Doc) {
  return {
    _id: String(j._id),
    userId: j.userId,
    userName: j.userName,
    objectApiName: j.objectApiName,
    objectLabel: j.objectLabel,
    operation: j.operation,
    fileName: j.fileName,
    matchField: j.matchField,
    total: j.total,
    succeeded: j.succeeded,
    failed: j.failed,
    status: j.status,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}
