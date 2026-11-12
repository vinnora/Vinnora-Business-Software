/**
 * Configuration ("metadata") export / import / compare between environments. Server-only.
 *
 * Every component is identified by a natural key (api names / names), never by database id,
 * because ids differ between production and each sandbox. Cross-references (profile on a
 * layout assignment, permission sets in a group, report on a dashboard…) are serialised by key
 * and resolved to ids in the target environment on import.
 */
import dbConnect from '@/lib/mongodb';
import ObjectDefinition from '@/models/ObjectDefinition';
import FieldDefinition from '@/models/FieldDefinition';
import ValidationRule from '@/models/ValidationRule';
import RestrictionRule from '@/models/RestrictionRule';
import PageLayout from '@/models/PageLayout';
import LayoutAssignment from '@/models/LayoutAssignment';
import Profile from '@/models/Profile';
import PermissionSet from '@/models/PermissionSet';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import CustomRecord from '@/models/CustomRecord';
import User from '@/models/User';
import UserAssignment from '@/models/UserAssignment';
import Report from '@/models/Report';
import Dashboard from '@/models/Dashboard';
import { ensureSystemProfiles } from './access';
import { checkFormula } from './formula';
import { getStandardObject, standardFields } from './registry';
import { isSandboxTenant } from './metadata';

export type ComponentType =
  | 'object'
  | 'field'
  | 'profile'
  | 'permissionSet'
  | 'permissionSetGroup'
  | 'validationRule'
  | 'restrictionRule'
  | 'layout'
  | 'layoutAssignment'
  | 'report'
  | 'dashboard';

/** Dependency order for applying adds/changes (deletes run in reverse). */
export const COMPONENT_ORDER: ComponentType[] = [
  'object',
  'field',
  'profile',
  'permissionSet',
  'permissionSetGroup',
  'validationRule',
  'restrictionRule',
  'layout',
  'layoutAssignment',
  'report',
  'dashboard',
];

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  object: 'Custom Module',
  field: 'Field',
  profile: 'Role',
  permissionSet: 'Access Pack',
  permissionSetGroup: 'Access Pack Group',
  validationRule: 'Check Rule',
  restrictionRule: 'Record Filter',
  layout: 'Form Layout',
  layoutAssignment: 'Form Layout Assignment',
  report: 'Report',
  dashboard: 'Dashboard',
};

type Data = Record<string, unknown>;

export interface Component {
  type: ComponentType;
  key: string;
  label: string;
  data: Data;
}

export interface DiffItem {
  type: ComponentType;
  key: string;
  label: string;
  action: 'add' | 'change' | 'delete';
  before: Data | null;
  after: Data | null;
}

export interface Issue {
  type: ComponentType;
  key: string;
  message: string;
}

const OMIT = new Set(['_id', '__v', 'orgId', 'createdAt', 'updatedAt']);

function clean(doc: Data, extraOmit: string[] = []): Data {
  const out: Data = {};
  for (const [k, v] of Object.entries(doc)) {
    if (OMIT.has(k) || extraOmit.includes(k)) continue;
    out[k] = v;
  }
  return JSON.parse(JSON.stringify(out));
}

/** JSON with sorted keys (stable comparison). */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  const o = v as Data;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}

const profileKey = (p: Data) => (p.key ? `std:${p.key}` : String(p.name));
const mapKey = (type: ComponentType, key: string) => `${type}|${key}`;

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export async function exportComponents(tenant: string): Promise<Component[]> {
  await dbConnect();
  await ensureSystemProfiles(tenant);
  const q = { orgId: tenant };
  const [objects, fields, profiles, sets, groups, vrs, rrs, layouts, assignments, reports, dashboards] = await Promise.all([
    ObjectDefinition.find(q).lean(),
    FieldDefinition.find(q).lean(),
    Profile.find(q).lean(),
    PermissionSet.find(q).lean(),
    PermissionSetGroup.find(q).lean(),
    ValidationRule.find(q).lean(),
    RestrictionRule.find(q).lean(),
    PageLayout.find(q).lean(),
    LayoutAssignment.find(q).lean(),
    Report.find({ ...q, folder: 'public' }).lean(),
    Dashboard.find({ ...q, folder: 'public' }).lean(),
  ]);
  const profById = new Map(profiles.map((p) => [String(p._id), profileKey(p as Data)]));
  const setById = new Map(sets.map((s) => [String(s._id), String(s.apiName)]));
  const layoutById = new Map(layouts.map((l) => [String(l._id), String(l.name)]));
  const reportById = new Map(reports.map((r) => [String(r._id), String(r.apiName)]));

  const out: Component[] = [];
  for (const o of objects) {
    out.push({ type: 'object', key: String(o.apiName), label: String(o.label), data: clean(o as Data, ['createdBy']) });
  }
  for (const f of fields) {
    const key = `${f.objectApiName}.${f.apiName}`;
    out.push({ type: 'field', key, label: `${f.objectApiName}.${f.label}${f.isOverride ? ' (built-in)' : ''}`, data: clean(f as Data) });
  }
  for (const p of profiles) {
    out.push({ type: 'profile', key: profileKey(p as Data), label: String(p.name), data: clean(p as Data) });
  }
  for (const s of sets) {
    out.push({ type: 'permissionSet', key: String(s.apiName), label: String(s.name), data: clean(s as Data) });
  }
  for (const g of groups) {
    const data = clean(g as Data, ['permissionSetIds']);
    data.permissionSets = ((g.permissionSetIds as string[]) || []).map((id) => setById.get(id)).filter(Boolean).sort();
    out.push({ type: 'permissionSetGroup', key: String(g.apiName), label: String(g.name), data });
  }
  for (const v of vrs) {
    out.push({ type: 'validationRule', key: `${v.objectApiName}.${v.name}`, label: `${v.objectApiName}: ${v.name}`, data: clean(v as Data) });
  }
  for (const r of rrs) {
    const data = clean(r as Data, ['appliesToIds']);
    const ids = (r.appliesToIds as string[]) || [];
    data.appliesTo_refs = (
      r.appliesTo === 'profiles'
        ? ids.map((id) => profById.get(id))
        : r.appliesTo === 'permissionSets'
          ? ids.map((id) => setById.get(id))
          : ids
    )
      .filter(Boolean)
      .sort();
    out.push({ type: 'restrictionRule', key: `${r.objectApiName}.${r.name}`, label: `${r.objectApiName}: ${r.name}`, data });
  }
  for (const l of layouts) {
    out.push({ type: 'layout', key: `${l.objectApiName}.${l.name}`, label: `${l.objectApiName}: ${l.name}`, data: clean(l as Data) });
  }
  for (const a of assignments) {
    const prof = profById.get(String(a.profileId));
    const layout = layoutById.get(String(a.layoutId));
    if (!prof || !layout) continue;
    out.push({
      type: 'layoutAssignment',
      key: `${a.objectApiName}.${prof}`,
      label: `${a.objectApiName}: ${prof.replace(/^std:/, '')} → ${layout}`,
      data: { objectApiName: a.objectApiName, profile: prof, layout },
    });
  }
  for (const r of reports) {
    out.push({ type: 'report', key: String(r.apiName), label: String(r.name), data: clean(r as Data, ['ownerId', 'ownerName', 'lastRunAt']) });
  }
  for (const d of dashboards) {
    const data = clean(d as Data, ['ownerId', 'ownerName']);
    data.components = ((d.components as Data[]) || []).map((c) => {
      const { reportId, ...rest } = c;
      return { ...rest, report: reportById.get(String(reportId)) || `missing:${reportId}` };
    });
    out.push({ type: 'dashboard', key: String(d.apiName), label: String(d.name), data });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Import (upsert by natural key)                                      */
/* ------------------------------------------------------------------ */

export interface Actor {
  userId: string;
  userName?: string;
}

async function profileIdByKey(tenant: string, key: string): Promise<string | null> {
  const p = key.startsWith('std:')
    ? await Profile.findOne({ orgId: tenant, key: key.slice(4) }).select('_id').lean()
    : await Profile.findOne({ orgId: tenant, name: key }).select('_id').lean();
  return p ? String(p._id) : null;
}

async function setIdsByApi(tenant: string, apiNames: string[]): Promise<string[]> {
  if (!apiNames.length) return [];
  const sets = await PermissionSet.find({ orgId: tenant, apiName: { $in: apiNames } }).select('_id').lean();
  return sets.map((s) => String(s._id));
}

export async function importComponent(tenant: string, c: Component, actor: Actor): Promise<void> {
  await dbConnect();
  const d = { ...c.data };
  const opts = { upsert: true };
  switch (c.type) {
    case 'object':
      await ObjectDefinition.updateOne(
        { orgId: tenant, apiName: d.apiName },
        { $set: d, $setOnInsert: { createdBy: actor.userId } },
        opts,
      );
      return;
    case 'field':
      await FieldDefinition.updateOne({ orgId: tenant, objectApiName: d.objectApiName, apiName: d.apiName }, { $set: d }, opts);
      return;
    case 'profile': {
      await ensureSystemProfiles(tenant);
      const filter = d.key ? { orgId: tenant, key: d.key } : { orgId: tenant, name: d.name };
      await Profile.updateOne(filter, { $set: d }, opts);
      return;
    }
    case 'permissionSet':
      await PermissionSet.updateOne({ orgId: tenant, apiName: d.apiName }, { $set: d }, opts);
      return;
    case 'permissionSetGroup': {
      const permissionSetIds = await setIdsByApi(tenant, (d.permissionSets as string[]) || []);
      delete d.permissionSets;
      await PermissionSetGroup.updateOne({ orgId: tenant, apiName: d.apiName }, { $set: { ...d, permissionSetIds } }, opts);
      return;
    }
    case 'validationRule':
      await ValidationRule.updateOne({ orgId: tenant, objectApiName: d.objectApiName, name: d.name }, { $set: d }, opts);
      return;
    case 'restrictionRule': {
      const refs = (d.appliesTo_refs as string[]) || [];
      delete d.appliesTo_refs;
      let appliesToIds: string[] = refs;
      if (d.appliesTo === 'profiles') {
        appliesToIds = (await Promise.all(refs.map((k) => profileIdByKey(tenant, k)))).filter((x): x is string => Boolean(x));
      } else if (d.appliesTo === 'permissionSets') {
        appliesToIds = await setIdsByApi(tenant, refs);
      }
      await RestrictionRule.updateOne(
        { orgId: tenant, objectApiName: d.objectApiName, name: d.name },
        { $set: { ...d, appliesToIds } },
        opts,
      );
      return;
    }
    case 'layout': {
      if (d.isDefault) {
        await PageLayout.updateMany({ orgId: tenant, objectApiName: d.objectApiName, name: { $ne: d.name } }, { $set: { isDefault: false } });
      }
      await PageLayout.updateOne({ orgId: tenant, objectApiName: d.objectApiName, name: d.name }, { $set: d }, opts);
      return;
    }
    case 'layoutAssignment': {
      const profileId = await profileIdByKey(tenant, String(d.profile));
      const layout = await PageLayout.findOne({ orgId: tenant, objectApiName: d.objectApiName, name: d.layout }).select('_id').lean();
      if (!profileId || !layout) throw new Error(`Form layout assignment ${c.key}: role or form layout missing in target`);
      await LayoutAssignment.updateOne(
        { orgId: tenant, objectApiName: d.objectApiName, profileId },
        { $set: { layoutId: String(layout._id) } },
        opts,
      );
      return;
    }
    case 'report':
      await Report.updateOne(
        { orgId: tenant, apiName: d.apiName },
        { $set: { ...d, folder: 'public' }, $setOnInsert: { ownerId: actor.userId, ownerName: actor.userName || '' } },
        opts,
      );
      return;
    case 'dashboard': {
      const comps = (d.components as Data[]) || [];
      const apiNames = comps.map((x) => String(x.report));
      const reports = await Report.find({ orgId: tenant, apiName: { $in: apiNames } }).select('_id apiName').lean();
      const idByApi = new Map(reports.map((r) => [String(r.apiName), String(r._id)]));
      const components = comps
        .filter((x) => idByApi.has(String(x.report)))
        .map((x) => {
          const { report, ...rest } = x;
          return { ...rest, reportId: idByApi.get(String(report)) };
        });
      delete d.components;
      await Dashboard.updateOne(
        { orgId: tenant, apiName: d.apiName },
        { $set: { ...d, components, folder: 'public' }, $setOnInsert: { ownerId: actor.userId, ownerName: actor.userName || '' } },
        opts,
      );
      return;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

function splitKey(key: string): [string, string] {
  const i = key.indexOf('.');
  return [key.slice(0, i), key.slice(i + 1)];
}

/** Production users (or sandbox assignments) holding a reference that must be cleared. */
async function pullFromAssignments(tenant: string, update: Data, filter: Data = {}) {
  if (isSandboxTenant(tenant)) await UserAssignment.updateMany({ orgId: tenant, ...filter }, update);
  else await User.updateMany({ orgId: tenant, ...filter }, update);
}

export async function deleteComponent(tenant: string, type: ComponentType, key: string): Promise<void> {
  await dbConnect();
  switch (type) {
    case 'object': {
      const scope = { orgId: tenant, objectApiName: key };
      await Promise.all([
        FieldDefinition.deleteMany(scope),
        ValidationRule.deleteMany(scope),
        RestrictionRule.deleteMany(scope),
        PageLayout.deleteMany(scope),
        LayoutAssignment.deleteMany(scope),
        CustomRecord.deleteMany(scope),
      ]);
      await ObjectDefinition.deleteOne({ orgId: tenant, apiName: key });
      return;
    }
    case 'field': {
      const [obj, api] = splitKey(key);
      const def = await FieldDefinition.findOne({ orgId: tenant, objectApiName: obj, apiName: api }).lean();
      if (!def) return;
      await FieldDefinition.deleteOne({ _id: def._id });
      if (def.isOverride) return;
      const unset = { $unset: { [`custom.${api}`]: 1 } };
      if (getStandardObject(obj)) await getStandardObject(obj)!.model.updateMany({ orgId: tenant }, unset);
      else await CustomRecord.updateMany({ orgId: tenant, objectApiName: obj }, unset);
      const layouts = await PageLayout.find({ orgId: tenant, objectApiName: obj });
      for (const l of layouts) {
        for (const s of l.sections) s.items = s.items.filter((i: { field: string }) => i.field !== api);
        l.markModified('sections');
        await l.save();
      }
      const fp = { $unset: { [`fieldPermissions.${obj}.${api}`]: 1 } };
      await Profile.updateMany({ orgId: tenant }, fp);
      await PermissionSet.updateMany({ orgId: tenant }, fp);
      return;
    }
    case 'profile': {
      if (key.startsWith('std:')) return; // built-in profiles are never deleted
      const p = await Profile.findOne({ orgId: tenant, name: key }).lean();
      if (!p) return;
      const id = String(p._id);
      await pullFromAssignments(tenant, { $set: { profileId: null } }, { profileId: id });
      await LayoutAssignment.deleteMany({ orgId: tenant, profileId: id });
      await RestrictionRule.updateMany({ orgId: tenant }, { $pull: { appliesToIds: id } });
      await Profile.deleteOne({ _id: p._id });
      return;
    }
    case 'permissionSet': {
      const s = await PermissionSet.findOne({ orgId: tenant, apiName: key }).lean();
      if (!s) return;
      const id = String(s._id);
      await pullFromAssignments(tenant, { $pull: { permissionSetIds: id } });
      await PermissionSetGroup.updateMany({ orgId: tenant }, { $pull: { permissionSetIds: id } });
      await RestrictionRule.updateMany({ orgId: tenant }, { $pull: { appliesToIds: id } });
      await PermissionSet.deleteOne({ _id: s._id });
      return;
    }
    case 'permissionSetGroup': {
      const g = await PermissionSetGroup.findOne({ orgId: tenant, apiName: key }).lean();
      if (!g) return;
      await pullFromAssignments(tenant, { $pull: { permissionSetGroupIds: String(g._id) } });
      await PermissionSetGroup.deleteOne({ _id: g._id });
      return;
    }
    case 'validationRule': {
      const [obj, name] = splitKey(key);
      await ValidationRule.deleteOne({ orgId: tenant, objectApiName: obj, name });
      return;
    }
    case 'restrictionRule': {
      const [obj, name] = splitKey(key);
      await RestrictionRule.deleteOne({ orgId: tenant, objectApiName: obj, name });
      return;
    }
    case 'layout': {
      const [obj, name] = splitKey(key);
      const l = await PageLayout.findOne({ orgId: tenant, objectApiName: obj, name }).lean();
      if (!l) return;
      await LayoutAssignment.deleteMany({ orgId: tenant, layoutId: String(l._id) });
      await PageLayout.deleteOne({ _id: l._id });
      return;
    }
    case 'layoutAssignment': {
      const [obj, prof] = splitKey(key);
      const profileId = await profileIdByKey(tenant, prof);
      if (profileId) await LayoutAssignment.deleteOne({ orgId: tenant, objectApiName: obj, profileId });
      return;
    }
    case 'report': {
      const r = await Report.findOne({ orgId: tenant, apiName: key }).lean();
      if (!r) return;
      await Dashboard.updateMany({ orgId: tenant }, { $pull: { components: { reportId: String(r._id) } } });
      await Report.deleteOne({ _id: r._id });
      return;
    }
    case 'dashboard':
      await Dashboard.deleteOne({ orgId: tenant, apiName: key });
      return;
  }
}

/* ------------------------------------------------------------------ */
/* Compare                                                             */
/* ------------------------------------------------------------------ */

export function toMap(components: Component[]): Map<string, Component> {
  return new Map(components.map((c) => [mapKey(c.type, c.key), c]));
}

/** Differences between a source (sandbox) and target (production). */
export function diffComponents(source: Component[], target: Component[]): DiffItem[] {
  const src = toMap(source);
  const tgt = toMap(target);
  const items: DiffItem[] = [];
  for (const [k, s] of src) {
    const t = tgt.get(k);
    if (!t) items.push({ type: s.type, key: s.key, label: s.label, action: 'add', before: null, after: s.data });
    else if (stableStringify(s.data) !== stableStringify(t.data)) {
      items.push({ type: s.type, key: s.key, label: s.label, action: 'change', before: t.data, after: s.data });
    }
  }
  for (const [k, t] of tgt) {
    if (src.has(k)) continue;
    // Built-in profiles always exist in both; never propose deleting them.
    if (t.type === 'profile' && t.key.startsWith('std:')) continue;
    items.push({ type: t.type, key: t.key, label: t.label, action: 'delete', before: t.data, after: null });
  }
  const order = (t: ComponentType) => COMPONENT_ORDER.indexOf(t);
  return items.sort((a, b) => order(a.type) - order(b.type) || a.label.localeCompare(b.label));
}

/* ------------------------------------------------------------------ */
/* Validation (simulate the deployment, report new breakage)           */
/* ------------------------------------------------------------------ */

const CUSTOM_OBJECT_BASE_FIELDS = ['name', 'ownerName', 'ownerId', 'userId', 'createdAt', 'updatedAt'];

function objectExists(api: string, m: Map<string, Component>) {
  return Boolean(getStandardObject(api)) || m.has(mapKey('object', api));
}

function fieldNames(api: string, m: Map<string, Component>): string[] {
  const std = getStandardObject(api);
  const base = std ? standardFields(std).map((f) => f.apiName) : CUSTOM_OBJECT_BASE_FIELDS;
  const custom = [...m.values()]
    .filter((c) => c.type === 'field' && c.data.objectApiName === api && !c.data.isOverride)
    .map((c) => String(c.data.apiName));
  return [...base, ...custom];
}

function issuesFor(m: Map<string, Component>): Issue[] {
  const issues: Issue[] = [];
  const add = (c: Component, message: string) => issues.push({ type: c.type, key: c.key, message });
  for (const c of m.values()) {
    const d = c.data;
    const obj = String(d.objectApiName ?? '');
    switch (c.type) {
      case 'field': {
        if (!objectExists(obj, m)) {
          add(c, `Module ${obj} doesn't exist`);
          break;
        }
        if (d.type === 'lookup' && d.referenceTo && !objectExists(String(d.referenceTo), m)) {
          add(c, `Links to ${d.referenceTo}, which doesn't exist`);
        }
        if (d.type === 'formula' && d.formula) {
          const r = checkFormula(String(d.formula), fieldNames(obj, m));
          if (!r.ok) add(c, `Formula: ${r.error}`);
        }
        break;
      }
      case 'validationRule':
      case 'restrictionRule': {
        if (!objectExists(obj, m)) {
          add(c, `Module ${obj} doesn't exist`);
          break;
        }
        const names = new Set(fieldNames(obj, m).map((n) => n.toLowerCase()));
        for (const cond of (d.conditions as Data[]) || []) {
          if (!names.has(String(cond.field).toLowerCase())) add(c, `Uses field ${cond.field}, which doesn't exist`);
        }
        if (c.type === 'validationRule' && d.mode === 'formula' && d.formula) {
          const r = checkFormula(String(d.formula), fieldNames(obj, m));
          if (!r.ok) add(c, `Formula: ${r.error}`);
        }
        if (c.type === 'restrictionRule') {
          for (const ref of (d.appliesTo_refs as string[]) || []) {
            if (d.appliesTo === 'profiles' && !ref.startsWith('std:') && !m.has(mapKey('profile', ref))) add(c, `Applies to role ${ref}, which doesn't exist`);
            if (d.appliesTo === 'permissionSets' && !m.has(mapKey('permissionSet', ref))) add(c, `Applies to access pack ${ref}, which doesn't exist`);
          }
        }
        break;
      }
      case 'layout': {
        if (!objectExists(obj, m)) {
          add(c, `Module ${obj} doesn't exist`);
          break;
        }
        const names = new Set(fieldNames(obj, m));
        const missing = ((d.sections as Data[]) || [])
          .flatMap((s) => ((s.items as Data[]) || []).map((i) => String(i.field)))
          .filter((f) => !names.has(f));
        if (missing.length) add(c, `Places fields that don't exist: ${missing.join(', ')}`);
        break;
      }
      case 'layoutAssignment':
        if (!String(d.profile).startsWith('std:') && !m.has(mapKey('profile', String(d.profile)))) add(c, `Role ${d.profile} doesn't exist`);
        if (!m.has(mapKey('layout', `${obj}.${d.layout}`))) add(c, `Form layout ${d.layout} doesn't exist`);
        break;
      case 'permissionSetGroup':
        for (const s of (d.permissionSets as string[]) || []) {
          if (!m.has(mapKey('permissionSet', s))) add(c, `Includes access pack ${s}, which doesn't exist`);
        }
        break;
      case 'report': {
        if (!objectExists(obj, m)) {
          add(c, `Module ${obj} doesn't exist`);
          break;
        }
        const names = new Set(fieldNames(obj, m));
        const used = [
          ...((d.columns as string[]) || []),
          ...((d.filters as Data[]) || []).map((f) => String(f.field)),
          ...((d.groupings as Data[]) || []).map((g) => String(g.field)),
          ...((d.aggregates as Data[]) || []).filter((a) => a.fn !== 'count').map((a) => String(a.field)),
          ...(d.columnGrouping ? [String((d.columnGrouping as Data).field)] : []),
        ];
        const missing = [...new Set(used.filter((f) => f && f !== '_id' && !names.has(f)))];
        if (missing.length) add(c, `Uses fields that don't exist: ${missing.join(', ')}`);
        break;
      }
      case 'dashboard':
        for (const comp of (d.components as Data[]) || []) {
          if (!m.has(mapKey('report', String(comp.report)))) add(c, `Shows report ${comp.report}, which isn't a public report here`);
        }
        break;
    }
  }
  return issues;
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  items: DiffItem[];
}

/** Check what deploying `selected` from source into target would do. */
export function validateSelection(source: Component[], target: Component[], selected: { type: ComponentType; key: string }[]): ValidationResult {
  const diff = diffComponents(source, target);
  const byKey = new Map(diff.map((d) => [mapKey(d.type, d.key), d]));
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const items: DiffItem[] = [];
  for (const s of selected) {
    const item = byKey.get(mapKey(s.type, s.key));
    if (!item) {
      errors.push({ type: s.type, key: s.key, message: 'No longer differs from production — refresh the comparison.' });
      continue;
    }
    items.push(item);
  }

  const targetMap = toMap(target);
  const simulated = new Map(targetMap);
  for (const it of items) {
    const k = mapKey(it.type, it.key);
    if (it.action === 'delete') simulated.delete(k);
    else simulated.set(k, { type: it.type, key: it.key, label: it.label, data: it.after! });
  }

  // Only report breakage the deployment introduces.
  const before = new Set(issuesFor(targetMap).map((i) => `${mapKey(i.type, i.key)}|${i.message}`));
  for (const i of issuesFor(simulated)) {
    if (!before.has(`${mapKey(i.type, i.key)}|${i.message}`)) errors.push(i);
  }

  for (const it of items) {
    if (it.type === 'field' && it.action === 'change' && it.before?.type !== it.after?.type) {
      errors.push({ type: it.type, key: it.key, message: `Field type can't change on deploy (${it.before?.type} → ${it.after?.type})` });
    }
    if (it.action === 'delete' && (it.type === 'field' || it.type === 'object')) {
      warnings.push({
        type: it.type,
        key: it.key,
        message: it.type === 'object' ? 'Deletes this module and all of its records in production.' : "Deletes this field and its values on production records.",
      });
    }
  }
  return { ok: errors.length === 0, errors, warnings, items };
}

/** Apply diff items to a tenant in dependency order. Returns log lines; throws on the first failure. */
export async function applyItems(tenant: string, items: DiffItem[], actor: Actor, log: string[]): Promise<DiffItem[]> {
  const order = (t: ComponentType) => COMPONENT_ORDER.indexOf(t);
  const upserts = items.filter((i) => i.action !== 'delete').sort((a, b) => order(a.type) - order(b.type));
  const deletes = items.filter((i) => i.action === 'delete').sort((a, b) => order(b.type) - order(a.type));
  const applied: DiffItem[] = [];
  for (const it of [...upserts, ...deletes]) {
    if (it.action === 'delete') await deleteComponent(tenant, it.type, it.key);
    else await importComponent(tenant, { type: it.type, key: it.key, label: it.label, data: it.after! }, actor);
    applied.push(it);
    log.push(`${it.action === 'add' ? 'Added' : it.action === 'change' ? 'Updated' : 'Deleted'} ${COMPONENT_LABELS[it.type]} ${it.label}`);
  }
  return applied;
}

/** Copy every component of `source` into an empty target tenant (sandbox create/refresh). */
export async function copyAllComponents(sourceTenant: string, targetTenant: string, actor: Actor): Promise<number> {
  const comps = await exportComponents(sourceTenant);
  await ensureSystemProfiles(targetTenant);
  const order = (t: ComponentType) => COMPONENT_ORDER.indexOf(t);
  for (const c of [...comps].sort((a, b) => order(a.type) - order(b.type))) {
    await importComponent(targetTenant, c, actor);
  }
  return comps.length;
}

export function isValidComponentType(t: unknown): t is ComponentType {
  return typeof t === 'string' && (COMPONENT_ORDER as string[]).includes(t);
}
