/** Sandbox lifecycle, data copy and deployments. Server-only. */
import mongoose, { type Model } from 'mongoose';
import dbConnect from '@/lib/mongodb';
import type { AuthContext } from '@/lib/auth-helpers';
import Sandbox, { type ISandbox } from '@/models/Sandbox';
import Deployment from '@/models/Deployment';
import Profile from '@/models/Profile';
import PermissionSet from '@/models/PermissionSet';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import ObjectDefinition from '@/models/ObjectDefinition';
import CustomRecord from '@/models/CustomRecord';
import User from '@/models/User';
import UserAssignment from '@/models/UserAssignment';
import { STANDARD_OBJECTS } from './registry';
import { describeObject, isSandboxTenant } from './metadata';
import {
  COMPONENT_ORDER,
  applyItems,
  copyAllComponents,
  deleteComponent,
  exportComponents,
  importComponent,
  validateSelection,
  type Actor,
  type ComponentType,
  type DiffItem,
} from './metadata-io';
import { BadRequestError } from './errors';
// Make sure every model with tenant data is registered before wiping a sandbox.
import '@/models/Report';
import '@/models/Dashboard';
import '@/models/Activity';
import '@/models/WorkOrder';
import '@/models/WorkflowRule';

type Data = Record<string, unknown>;

export function actorOf(ctx: AuthContext): Actor {
  return { userId: ctx.userId, userName: ctx.user?.name || ctx.user?.email || '' };
}

/** Delete everything stored under a sandbox tenant (every collection with an orgId). */
export async function wipeTenant(tenant: string) {
  if (!isSandboxTenant(tenant)) throw new Error(`Refusing to wipe non-sandbox tenant ${tenant}`);
  await dbConnect();
  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name);
    if (!model.schema.path('orgId')) continue;
    await model.deleteMany({ orgId: tenant });
  }
}

/* ------------------------------------------------------------------ */
/* User assignments                                                    */
/* ------------------------------------------------------------------ */

async function copyAssignments(ctx: AuthContext, prodTenant: string, sbxTenant: string) {
  if (!ctx.orgId) return;
  const users = await User.find({ orgId: ctx.orgId }).select('profileId permissionSetIds permissionSetGroupIds').lean();
  const [prodProfiles, sbxProfiles, prodSets, sbxSets, prodGroups, sbxGroups] = await Promise.all([
    Profile.find({ orgId: prodTenant }).lean(),
    Profile.find({ orgId: sbxTenant }).lean(),
    PermissionSet.find({ orgId: prodTenant }).lean(),
    PermissionSet.find({ orgId: sbxTenant }).lean(),
    PermissionSetGroup.find({ orgId: prodTenant }).lean(),
    PermissionSetGroup.find({ orgId: sbxTenant }).lean(),
  ]);
  const pKey = (p: Data) => (p.key ? `std:${p.key}` : String(p.name));
  const remap = (prod: Data[], sbx: Data[], keyOf: (d: Data) => string) => {
    const byKey = new Map(sbx.map((d) => [keyOf(d), String(d._id)]));
    return new Map(prod.map((d) => [String(d._id), byKey.get(keyOf(d))]));
  };
  const profileMap = remap(prodProfiles as Data[], sbxProfiles as Data[], pKey);
  const setMap = remap(prodSets as Data[], sbxSets as Data[], (d) => String(d.apiName));
  const groupMap = remap(prodGroups as Data[], sbxGroups as Data[], (d) => String(d.apiName));
  const docs = users
    .filter((u) => u.profileId || (u.permissionSetIds as string[])?.length || (u.permissionSetGroupIds as string[])?.length)
    .map((u) => ({
      orgId: sbxTenant,
      userId: String(u._id),
      profileId: u.profileId ? profileMap.get(String(u.profileId)) || null : null,
      permissionSetIds: ((u.permissionSetIds as string[]) || []).map((id) => setMap.get(id)).filter(Boolean),
      permissionSetGroupIds: ((u.permissionSetGroupIds as string[]) || []).map((id) => groupMap.get(id)).filter(Boolean),
    }));
  if (docs.length) await UserAssignment.insertMany(docs);
}

/* ------------------------------------------------------------------ */
/* Record copy                                                         */
/* ------------------------------------------------------------------ */

interface CopySource {
  apiName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  filter: Data;
  lookupPaths: string[];
  uniquePaths: string[];
}

function uniqueStringPaths(model: Model<unknown>): string[] {
  const indexes = model.schema.indexes() as [Record<string, unknown>, { unique?: boolean } | undefined][];
  return indexes
    .filter(([fields, opts]) => opts?.unique && Object.keys(fields).length === 1)
    .map(([fields]) => Object.keys(fields)[0])
    .filter((p: string) => p !== '_id' && model.schema.path(p)?.instance === 'String');
}

function getPath(doc: Data, path: string): unknown {
  return path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Data)[k] : undefined), doc);
}

function setPath(doc: Data, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = doc;
  for (const p of parts.slice(0, -1)) {
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Data;
  }
  if (value === undefined) delete cur[parts[parts.length - 1]];
  else cur[parts[parts.length - 1]] = value;
}

async function copyRecords(ctx: AuthContext, sbx: ISandbox, prodTenant: string): Promise<Record<string, number>> {
  const memberEmails = ctx.orgId ? (await User.find({ orgId: ctx.orgId }).select('email').lean()).map((u) => u.email as string) : [];
  const prodScope = { $or: [{ orgId: prodTenant }, { orgId: null, userId: { $in: memberEmails } }] };
  const sources: CopySource[] = [];
  for (const std of STANDARD_OBJECTS.filter((o) => o.enforced)) {
    const d = await describeObject(prodTenant, std.apiName);
    sources.push({
      apiName: std.apiName,
      model: std.model,
      filter: prodScope,
      lookupPaths: d.fields.filter((f) => f.type === 'lookup').map((f) => f.path),
      uniquePaths: uniqueStringPaths(std.model),
    });
  }
  for (const o of await ObjectDefinition.find({ orgId: prodTenant }).lean()) {
    const d = await describeObject(prodTenant, String(o.apiName));
    sources.push({
      apiName: String(o.apiName),
      model: CustomRecord,
      filter: { orgId: prodTenant, objectApiName: o.apiName },
      lookupPaths: d.fields.filter((f) => f.type === 'lookup').map((f) => f.path),
      uniquePaths: [],
    });
  }

  const limit = sbx.type === 'partial' ? Math.max(1, Math.min(sbx.sampleSize || 100, 10000)) : 0;
  const suffix = `-${String(sbx._id).slice(-4)}`;
  const idMap = new Map<string, string>();
  const loaded: { src: CopySource; docs: Data[] }[] = [];

  // Pass 1: load and allocate new ids
  for (const src of sources) {
    let q = src.model.find(src.filter).sort({ updatedAt: -1 }).lean();
    if (limit) q = q.limit(limit);
    const docs = (await q) as Data[];
    for (const d of docs) idMap.set(String(d._id), String(new mongoose.Types.ObjectId()));
    loaded.push({ src, docs });
  }

  // Pass 2: rewrite ids, lookups, unique values and tenant; insert
  const counts: Record<string, number> = {};
  for (const { src, docs } of loaded) {
    const out = docs.map((d) => {
      const copy: Data = { ...d, _id: new mongoose.Types.ObjectId(idMap.get(String(d._id))), orgId: sbx.tenant };
      delete copy.__v;
      for (const p of src.lookupPaths) {
        const v = getPath(copy, p);
        if (v === undefined || v === null || v === '') continue;
        // References to records that weren't copied (partial copy) are cleared.
        setPath(copy, p, idMap.get(String(v)) ?? undefined);
      }
      for (const p of src.uniquePaths) {
        const v = getPath(copy, p);
        if (typeof v === 'string' && v) setPath(copy, p, `${v}${suffix}`);
      }
      return copy;
    });
    if (out.length) await src.model.collection.insertMany(out);
    counts[src.apiName] = out.length;
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

/** Fill a (wiped) sandbox from production according to its type. */
export async function populateSandbox(ctx: AuthContext, sbx: ISandbox, prodTenant: string) {
  await dbConnect();
  try {
    const components = await copyAllComponents(prodTenant, sbx.tenant, actorOf(ctx));
    await copyAssignments(ctx, prodTenant, sbx.tenant);
    const copied: Record<string, number> = { configuration: components };
    if (sbx.type !== 'developer') Object.assign(copied, await copyRecords(ctx, sbx, prodTenant));
    sbx.status = 'ready';
    sbx.statusMessage = undefined;
    sbx.copied = copied;
    sbx.lastRefreshedAt = new Date();
    await sbx.save();
  } catch (e) {
    console.error('Sandbox copy failed', e);
    sbx.status = 'failed';
    sbx.statusMessage = (e as Error).message;
    await sbx.save();
  }
  return sbx;
}

export async function refreshSandbox(ctx: AuthContext, sbx: ISandbox, prodTenant: string) {
  sbx.status = 'creating';
  await sbx.save();
  await wipeTenant(sbx.tenant);
  return populateSandbox(ctx, sbx, prodTenant);
}

export async function deleteSandbox(sbx: ISandbox) {
  await wipeTenant(sbx.tenant);
  await Sandbox.deleteOne({ _id: sbx._id });
}

/* ------------------------------------------------------------------ */
/* Deploy & rollback                                                   */
/* ------------------------------------------------------------------ */

export async function compareSandbox(sbx: ISandbox, prodTenant: string) {
  const [source, target] = await Promise.all([exportComponents(sbx.tenant), exportComponents(prodTenant)]);
  return { source, target };
}

export async function deploySelection(
  ctx: AuthContext,
  sbx: ISandbox,
  prodTenant: string,
  selected: { type: ComponentType; key: string }[],
) {
  const { source, target } = await compareSandbox(sbx, prodTenant);
  const result = validateSelection(source, target, selected);
  if (!result.ok) {
    throw new BadRequestError(`Validation failed: ${result.errors.map((e) => `${e.key}: ${e.message}`).join('; ')}`);
  }
  const snapshot = result.items.map((it) => ({ type: it.type, key: it.key, data: it.before }));
  const log: string[] = [];
  const actor = actorOf(ctx);
  let applied: DiffItem[] = [];
  let status: 'succeeded' | 'failed' = 'succeeded';
  try {
    applied = await applyItems(prodTenant, result.items, actor, log);
  } catch (e) {
    status = 'failed';
    log.push(`Error: ${(e as Error).message}. Reverting ${applied.length} applied change(s)…`);
    await restoreSnapshot(prodTenant, snapshot, actor, log);
  }
  const dep = await Deployment.create({
    orgId: prodTenant,
    sandboxId: String(sbx._id),
    sandboxName: sbx.name,
    status,
    items: result.items.map((i) => ({ type: i.type, key: i.key, label: i.label, action: i.action })),
    snapshot,
    log,
    deployedBy: ctx.userId,
    deployedByName: actor.userName,
  });
  return { deployment: dep, warnings: result.warnings };
}

async function restoreSnapshot(tenant: string, snapshot: { type: ComponentType; key: string; data: unknown }[], actor: Actor, log: string[]) {
  const order = (t: ComponentType) => COMPONENT_ORDER.indexOf(t);
  // Remove things that didn't exist before (reverse order), then restore previous versions.
  for (const s of [...snapshot].filter((x) => x.data === null).sort((a, b) => order(b.type) - order(a.type))) {
    await deleteComponent(tenant, s.type, s.key);
    log.push(`Removed ${s.type} ${s.key}`);
  }
  for (const s of [...snapshot].filter((x) => x.data !== null).sort((a, b) => order(a.type) - order(b.type))) {
    await importComponent(tenant, { type: s.type, key: s.key, label: s.key, data: s.data as Data }, actor);
    log.push(`Restored ${s.type} ${s.key}`);
  }
}

export async function rollbackDeployment(ctx: AuthContext, deploymentId: string, prodTenant: string) {
  if (!mongoose.isValidObjectId(deploymentId)) throw new BadRequestError('Deployment not found');
  const dep = await Deployment.findOne({ _id: deploymentId, orgId: prodTenant });
  if (!dep) throw new BadRequestError('Deployment not found');
  if (dep.status !== 'succeeded') throw new BadRequestError('Only successful deployments can be rolled back');
  const later = await Deployment.exists({ orgId: prodTenant, status: 'succeeded', createdAt: { $gt: dep.createdAt } });
  if (later) throw new BadRequestError('Roll back newer deployments first (most recent first).');
  const log: string[] = [...dep.log, `--- Rollback by ${actorOf(ctx).userName} ---`];
  await restoreSnapshot(prodTenant, dep.snapshot as { type: ComponentType; key: string; data: unknown }[], actorOf(ctx), log);
  dep.status = 'rolledBack';
  dep.rolledBackAt = new Date();
  dep.rolledBackBy = ctx.userId;
  dep.log = log;
  await dep.save();
  return dep;
}
