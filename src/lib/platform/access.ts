/**
 * Permission resolution and record-level enforcement. Server-only.
 *
 * Effective access = Profile ∪ Permission Sets ∪ Permission Set Groups (grants only ever add).
 * Org owners and the dev fallback user are treated as System Administrators.
 */
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { ForbiddenError, ModuleAccessError, type AuthContext } from '@/lib/auth-helpers';
import Profile from '@/models/Profile';
import PermissionSet from '@/models/PermissionSet';
import PermissionSetGroup from '@/models/PermissionSetGroup';
import ValidationRule from '@/models/ValidationRule';
import RestrictionRule from '@/models/RestrictionRule';
import { describeObject, fieldsByApi, isSandboxTenant, legacyOwnerKey, tenantOf } from './metadata';
import UserAssignment from '@/models/UserAssignment';
import { evaluateBoolean, evaluateFormula, coerceFormulaResult, FormulaError } from './formula';
import { conditionsToMongo, evaluateConditions } from './conditions';
import { ValidationError } from './errors';
import {
  ALL_APP_KEYS,
  EMPTY_OBJECT_PERMISSION,
  FULL_OBJECT_PERMISSION,
  normalizeObjectPermission,
  type AppKey,
  type Condition,
  type FieldDescribe,
  type FieldError,
  type FieldPermission,
  type ObjectDescribe,
  type ObjectPermission,
  type PermissionBundle,
  type SystemPermissionKey,
  type UserObjectAccess,
} from './types';

/* ------------------------------------------------------------------ */
/* Built-in profiles                                                   */
/* ------------------------------------------------------------------ */

export const SYSTEM_PROFILE_KEYS = ['system_admin', 'standard_user', 'read_only'] as const;
export type SystemProfileKey = (typeof SYSTEM_PROFILE_KEYS)[number];

const ALL_SYSTEM_PERMS: Record<SystemPermissionKey, boolean> = {
  viewSetup: true,
  customizeApplication: true,
  manageProfilesPermissionSets: true,
  manageUsers: true,
  viewAllData: true,
  modifyAllData: true,
  exportData: true,
  importData: true,
  manageReports: true,
  manageSandboxes: true,
  manageBilling: true,
};

export const SYSTEM_PROFILES: Record<SystemProfileKey, {
  name: string;
  description: string;
  defaultObjectAccess: ObjectPermission;
  systemPermissions: Partial<Record<SystemPermissionKey, boolean>>;
}> = {
  system_admin: {
    name: 'System Administrator',
    description: 'Full access to every app, object, field and Setup page.',
    defaultObjectAccess: FULL_OBJECT_PERMISSION,
    systemPermissions: ALL_SYSTEM_PERMS,
  },
  standard_user: {
    name: 'Standard User',
    description: 'Create, read, edit and delete records. No access to Setup.',
    defaultObjectAccess: { ...EMPTY_OBJECT_PERMISSION, create: true, read: true, edit: true, delete: true },
    systemPermissions: { exportData: true },
  },
  read_only: {
    name: 'Read Only',
    description: 'View records only.',
    defaultObjectAccess: { ...EMPTY_OBJECT_PERMISSION, read: true },
    systemPermissions: {},
  },
};

/** Profile a user gets when none is assigned, based on their org role. */
export function defaultProfileKeyForRole(orgRole: string | undefined): SystemProfileKey {
  if (orgRole === 'owner' || orgRole === 'admin') return 'system_admin';
  if (orgRole === 'viewer') return 'read_only';
  return 'standard_user';
}

/** Create the built-in profiles for a tenant if they don't exist yet. */
export async function ensureSystemProfiles(tenant: string) {
  await dbConnect();
  const existing = await Profile.find({ orgId: tenant, key: { $in: SYSTEM_PROFILE_KEYS } }).select('key').lean();
  const have = new Set(existing.map((p) => p.key));
  for (const key of SYSTEM_PROFILE_KEYS) {
    if (have.has(key)) continue;
    const def = SYSTEM_PROFILES[key];
    try {
      await Profile.create({
        orgId: tenant,
        key,
        isSystem: true,
        name: def.name,
        description: def.description,
        appAccess: ALL_APP_KEYS,
        objectPermissions: {},
        fieldPermissions: {},
        systemPermissions: def.systemPermissions,
        defaultObjectAccess: def.defaultObjectAccess,
      });
    } catch (e) {
      // Concurrent request created it first.
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Effective permissions                                               */
/* ------------------------------------------------------------------ */

export interface EffectivePermissions {
  tenant: string;
  isSuperUser: boolean;
  profileId: string;
  profileKey?: string;
  profileName: string;
  permissionSetIds: string[];
  apps: Set<AppKey>;
  system: Record<SystemPermissionKey, boolean>;
  objectPerm(objectApiName: string): ObjectPermission;
  fieldPerm(objectApiName: string, field: FieldDescribe): FieldPermission;
  userTokens: Record<string, unknown>;
}

type Bundle = PermissionBundle & { defaultObjectAccess?: Partial<ObjectPermission> };

function asBundle(doc: Record<string, unknown> | null | undefined): Bundle {
  return {
    appAccess: ((doc?.appAccess as AppKey[]) || []).filter(Boolean),
    objectPermissions: (doc?.objectPermissions as Bundle['objectPermissions']) || {},
    fieldPermissions: (doc?.fieldPermissions as Bundle['fieldPermissions']) || {},
    systemPermissions: (doc?.systemPermissions as Bundle['systemPermissions']) || {},
    defaultObjectAccess: (doc?.defaultObjectAccess as Partial<ObjectPermission>) || undefined,
  };
}

const permCache = new WeakMap<AuthContext, Promise<EffectivePermissions>>();

export function getEffectivePermissions(ctx: AuthContext): Promise<EffectivePermissions> {
  let p = permCache.get(ctx);
  if (!p) {
    p = computeEffectivePermissions(ctx);
    permCache.set(ctx, p);
  }
  return p;
}

function planApps(ctx: AuthContext): Set<AppKey> {
  if (ctx.orgId === 'dev-org-id') return new Set(ALL_APP_KEYS);
  return new Set(((ctx.org?.apps as AppKey[]) || []).filter(Boolean));
}

async function computeEffectivePermissions(ctx: AuthContext): Promise<EffectivePermissions> {
  await dbConnect();
  const tenant = tenantOf(ctx);
  const isDev = ctx.userId === 'dev-user-id';
  const isOwner = ctx.orgRole === 'owner';
  await ensureSystemProfiles(tenant);

  // In a sandbox, assignments come from the sandbox's own records (profile ids differ per environment).
  const user = ctx.sandbox
    ? ((await UserAssignment.findOne({ orgId: tenant, userId: ctx.userId }).lean()) as Record<string, unknown> | null) || {}
    : ctx.user || {};
  let profileDoc: Record<string, unknown> | null = null;
  if (user.profileId && mongoose.isValidObjectId(user.profileId)) {
    profileDoc = await Profile.findOne({ _id: user.profileId, orgId: tenant }).lean();
  }
  if (!profileDoc) {
    const key = isDev || isOwner ? 'system_admin' : defaultProfileKeyForRole(ctx.orgRole);
    profileDoc = await Profile.findOne({ orgId: tenant, key }).lean();
  }
  const profile = asBundle(profileDoc);
  const profileKey = profileDoc?.key as string | undefined;
  const profileIsAdmin = profileKey === 'system_admin';

  // Permission sets (direct + via groups)
  const directIds: string[] = ((user.permissionSetIds as string[]) || []).filter((id) => mongoose.isValidObjectId(id));
  const groupIds: string[] = ((user.permissionSetGroupIds as string[]) || []).filter((id) => mongoose.isValidObjectId(id));
  let viaGroups: string[] = [];
  if (groupIds.length) {
    const groups = await PermissionSetGroup.find({ _id: { $in: groupIds }, orgId: tenant }).lean();
    viaGroups = groups.flatMap((g) => (g.permissionSetIds as string[]) || []);
  }
  const psIds = [...new Set([...directIds, ...viaGroups])].filter((id) => mongoose.isValidObjectId(id));
  const psDocs = psIds.length ? await PermissionSet.find({ _id: { $in: psIds }, orgId: tenant }).lean() : [];
  const sets = psDocs.map((d) => asBundle(d as Record<string, unknown>));

  const superUser = isDev || isOwner || profileIsAdmin;

  // System permissions
  const system = {} as Record<SystemPermissionKey, boolean>;
  for (const k of Object.keys(ALL_SYSTEM_PERMS) as SystemPermissionKey[]) {
    system[k] = superUser || Boolean(profile.systemPermissions[k]) || sets.some((s) => Boolean(s.systemPermissions[k]));
  }
  if (system.modifyAllData) system.viewAllData = true;
  if (system.customizeApplication || system.manageProfilesPermissionSets || system.manageUsers) system.viewSetup = true;

  // Apps = (profile ∪ sets) ∩ plan
  const plan = planApps(ctx);
  const granted = superUser
    ? new Set<AppKey>(ALL_APP_KEYS)
    : new Set<AppKey>([...profile.appAccess, ...sets.flatMap((s) => s.appAccess)]);
  const apps = new Set<AppKey>([...granted].filter((a) => plan.has(a)));

  const objectPerm = (api: string): ObjectPermission => {
    if (superUser || system.modifyAllData) return { ...FULL_OBJECT_PERMISSION };
    const base = normalizeObjectPermission(profile.objectPermissions[api] ?? profile.defaultObjectAccess ?? {});
    for (const s of sets) {
      const g = s.objectPermissions[api];
      if (!g) continue;
      for (const k of Object.keys(base) as (keyof ObjectPermission)[]) if (g[k]) base[k] = true;
    }
    if (system.viewAllData) {
      base.read = true;
      base.viewAll = true;
    }
    return normalizeObjectPermission(base);
  };

  const fieldPerm = (api: string, field: FieldDescribe): FieldPermission => {
    const readOnlyType = field.isSystem || field.type === 'formula';
    if (superUser || system.modifyAllData) return { read: true, edit: !readOnlyType };
    // Data-required fields can't be hidden, or nobody with this profile could save a record.
    if (field.required && !readOnlyType) return { read: true, edit: true };
    const p = profile.fieldPermissions[api]?.[field.apiName];
    let read = p?.read ?? true;
    let edit = p?.edit ?? true;
    for (const s of sets) {
      const g = s.fieldPermissions[api]?.[field.apiName];
      if (g?.read) read = true;
      if (g?.edit) {
        edit = true;
        read = true;
      }
    }
    if (!read) edit = false;
    if (readOnlyType) edit = false;
    return { read, edit };
  };

  return {
    tenant,
    isSuperUser: superUser,
    profileId: String(profileDoc?._id ?? ''),
    profileKey,
    profileName: (profileDoc?.name as string) || 'System Administrator',
    permissionSetIds: psIds,
    apps,
    system,
    objectPerm,
    fieldPerm,
    userTokens: {
      Id: ctx.userId,
      Email: ctx.user?.email || '',
      Name: ctx.user?.name || '',
      ProfileId: String(profileDoc?._id ?? ''),
      Role: ctx.orgRole,
    },
  };
}

export async function requireSystemPermission(ctx: AuthContext, ...keys: SystemPermissionKey[]) {
  const perms = await getEffectivePermissions(ctx);
  if (!keys.some((k) => perms.system[k])) {
    throw new ForbiddenError('You do not have permission to perform this Setup action.');
  }
  return perms;
}

/* ------------------------------------------------------------------ */
/* Object access (record pipeline)                                     */
/* ------------------------------------------------------------------ */

type Doc = Record<string, unknown>;
type Op = 'create' | 'read' | 'edit' | 'delete';

const OP_LABEL: Record<Op, string> = { create: 'create', read: 'view', edit: 'edit', delete: 'delete' };
const STRIP_ON_WRITE = new Set(['_id', '__v', 'orgId', 'userId', 'createdAt', 'updatedAt', 'custom', 'createdById', 'lastModifiedById']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlank(v: unknown) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function toPlain(doc: unknown): Doc {
  if (!doc) return {};
  const d = doc as { toObject?: (o?: unknown) => Doc };
  return typeof d.toObject === 'function' ? d.toObject({ flattenMaps: true }) : { ...(doc as Doc) };
}

export interface PreparedWrite {
  /** Mongo $set payload (paths, custom fields under custom.<api>). */
  set: Doc;
  /** Field api names that were written. */
  changed: string[];
}

export class ObjectAccess {
  readonly perm: ObjectPermission;
  private byApi: Record<string, FieldDescribe>;
  private vrCache?: Promise<Doc[]>;

  constructor(
    readonly ctx: AuthContext,
    readonly perms: EffectivePermissions,
    readonly object: ObjectDescribe,
  ) {
    this.perm = perms.objectPerm(object.apiName);
    this.byApi = fieldsByApi(object);
  }

  get tenant() {
    return this.perms.tenant;
  }

  field(api: string): FieldDescribe | undefined {
    return this.byApi[api];
  }

  fieldPerm(f: FieldDescribe): FieldPermission {
    return this.perms.fieldPerm(this.object.apiName, f);
  }

  /** Summary sent to the browser so forms can hide/lock fields. */
  userAccess(): UserObjectAccess {
    return {
      ...this.perm,
      fields: Object.fromEntries(this.object.fields.map((f) => [f.apiName, this.fieldPerm(f)])),
    };
  }

  assertApp() {
    if (!this.perms.apps.has(this.object.app)) {
      if (!planApps(this.ctx).has(this.object.app)) throw new ModuleAccessError(this.object.app);
      throw new ForbiddenError(`Your profile doesn't give you access to the ${this.object.app} app.`);
    }
  }

  assert(op: Op) {
    this.assertApp();
    if (!this.perm[op]) {
      throw new ForbiddenError(`You don't have permission to ${OP_LABEL[op]} ${this.object.pluralLabel}.`);
    }
  }

  /** Tenant scope: org records, plus the user's own records created before org-wide data. */
  baseFilter(): Doc {
    if (this.object.isCustom) return { orgId: this.tenant, objectApiName: this.object.apiName };
    // Sandboxes never see production records, including legacy per-user ones.
    if (isSandboxTenant(this.tenant)) return { orgId: this.tenant };
    return { $or: [{ orgId: this.tenant }, { orgId: null, userId: legacyOwnerKey(this.ctx) }] };
  }

  /** Base filter + restriction rules for this user. */
  async readFilter(): Promise<Doc> {
    const base = this.baseFilter();
    if (this.perm.viewAll || this.perms.system.viewAllData) return base;
    const rules = await RestrictionRule.find({ orgId: this.tenant, objectApiName: this.object.apiName, active: true }).lean();
    const applicable = rules.filter((r) => {
      const ids = (r.appliesToIds as string[]) || [];
      switch (r.appliesTo) {
        case 'all':
          return true;
        case 'profiles':
          return ids.includes(this.perms.profileId);
        case 'permissionSets':
          return ids.some((id) => this.perms.permissionSetIds.includes(id));
        case 'users':
          return ids.includes(this.ctx.userId);
        default:
          return false;
      }
    });
    if (!applicable.length) return base;
    const clauses = applicable.map((r) => {
      try {
        return conditionsToMongo(r.conditions as Condition[], r.logic as string | undefined, this.byApi, this.perms.userTokens);
      } catch (e) {
        console.error(`Restriction rule ${r.name} is invalid`, e);
        return { _id: { $exists: false } }; // fail closed
      }
    });
    return { $and: [base, clauses.length === 1 ? clauses[0] : { $or: clauses }] };
  }

  /** Record → API shape: custom fields flattened, formulas computed, unreadable fields removed. */
  shape(doc: unknown): Doc {
    const raw = this.flatten(doc);
    for (const f of this.object.fields) {
      if (f.type === 'formula' && f.formula) {
        try {
          raw[f.apiName] = coerceFormulaResult(
            evaluateFormula(f.formula, { record: raw, user: this.perms.userTokens }),
            f.returnType,
          );
        } catch {
          raw[f.apiName] = '#Error!';
        }
      }
    }
    for (const f of this.object.fields) {
      if (!this.fieldPerm(f).read) delete raw[f.apiName];
    }
    return raw;
  }

  shapeMany(docs: unknown[]): Doc[] {
    return docs.map((d) => this.shape(d));
  }

  /** Flatten without FLS (used internally for validation context). */
  private flatten(doc: unknown): Doc {
    const raw = toPlain(doc);
    const custom = (raw.custom as Doc) || {};
    delete raw.custom;
    for (const f of this.object.fields) {
      if (f.isCustom) raw[f.apiName] = custom[f.apiName] ?? null;
      else if (f.path.includes('.') && raw[f.apiName] === undefined) {
        raw[f.apiName] = f.path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Doc)[k] : undefined), raw);
      }
    }
    if (raw._id !== undefined) raw._id = String(raw._id);
    return raw;
  }

  private coerce(f: FieldDescribe, value: unknown, errors: FieldError[]): unknown {
    if (isBlank(value)) return f.type === 'checkbox' ? false : f.type === 'multipicklist' ? [] : null;
    const label = f.label;
    switch (f.type) {
      case 'number':
      case 'currency':
      case 'percent': {
        const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
        if (Number.isNaN(n)) {
          errors.push({ field: f.apiName, message: `${label} must be a number.` });
          return value;
        }
        if (f.scale !== undefined && f.scale !== null) return Number(n.toFixed(f.scale));
        return n;
      }
      case 'checkbox':
        return value === true || value === 1 || ['true', '1', 'on', 'yes', 'y'].includes(String(value).trim().toLowerCase());
      case 'date':
      case 'datetime': {
        const d = value instanceof Date ? value : new Date(String(value));
        if (Number.isNaN(d.getTime())) {
          errors.push({ field: f.apiName, message: `${label} must be a valid date.` });
          return value;
        }
        return d;
      }
      case 'email': {
        const s = String(value).trim();
        if (!EMAIL_RE.test(s)) errors.push({ field: f.apiName, message: `${label} must be a valid email address.` });
        return s;
      }
      case 'url': {
        const s = String(value).trim();
        if (/\s/.test(s) || !/\.|^https?:\/\/localhost/.test(s)) errors.push({ field: f.apiName, message: `${label} must be a valid URL.` });
        return s;
      }
      case 'picklist': {
        const s = String(value);
        if (f.picklistValues?.length && f.restrictedPicklist !== false) {
          const ok = f.picklistValues.some((p) => p.value === s && p.active !== false);
          if (!ok) errors.push({ field: f.apiName, message: `'${s}' is not a valid value for ${label}.` });
        }
        return s;
      }
      case 'multipicklist': {
        const list = Array.isArray(value) ? value.map(String) : String(value).split(';').map((x) => x.trim()).filter(Boolean);
        if (f.picklistValues?.length && f.restrictedPicklist !== false) {
          const bad = list.filter((v) => !f.picklistValues!.some((p) => p.value === v && p.active !== false));
          if (bad.length) errors.push({ field: f.apiName, message: `${bad.join(', ')} not valid for ${label}.` });
        }
        return list;
      }
      default: {
        const s = typeof value === 'string' ? value : String(value);
        if (f.length && s.length > f.length) {
          errors.push({ field: f.apiName, message: `${label} can be at most ${f.length} characters.` });
        }
        return s;
      }
    }
  }

  private async validationRules(): Promise<Doc[]> {
    if (!this.vrCache) {
      // .exec() gives a real (re-awaitable) promise; a cached Query would re-execute and throw.
      this.vrCache = ValidationRule.find({ orgId: this.tenant, objectApiName: this.object.apiName, active: true }).lean().exec() as Promise<Doc[]>;
    }
    return this.vrCache;
  }

  /**
   * Validate and transform an incoming payload.
   * @param input request body (api names; custom fields as `xyz__c`)
   * @param existing current record for updates (undefined for create)
   * @param opts.passthrough keep unknown (non-described) keys — built-in objects only
   */
  async prepareWrite(input: Doc, existing?: unknown, opts: { passthrough?: boolean } = {}): Promise<PreparedWrite> {
    const isCreate = existing === undefined;
    this.assert(isCreate ? 'create' : 'edit');
    const errors: FieldError[] = [];
    const prior = isCreate ? null : this.flatten(existing);
    const set: Doc = {};
    const changed: string[] = [];
    const merged: Doc = { ...(prior || {}) };

    for (const [key, value] of Object.entries(input)) {
      if (STRIP_ON_WRITE.has(key)) continue;
      const f = this.byApi[key];
      if (!f) {
        if (opts.passthrough && !this.object.isCustom && !key.startsWith('$')) {
          set[key] = value;
          merged[key] = value;
          changed.push(key);
        }
        continue;
      }
      if (f.type === 'formula' || f.active === false) continue;
      const fp = this.fieldPerm(f);
      const coerced = this.coerce(f, value, errors);
      // On create, blank input means "not provided" so schema / field defaults apply.
      if (isCreate && isBlank(coerced)) continue;
      const priorVal = prior ? prior[f.apiName] : undefined;
      const same =
        (isBlank(coerced) && isBlank(priorVal)) ||
        (coerced instanceof Date && priorVal instanceof Date && coerced.getTime() === priorVal.getTime()) ||
        JSON.stringify(coerced) === JSON.stringify(priorVal);
      if (!fp.edit) {
        if (f.isSystem) {
          // Only app-maintained denormalised fields (e.g. accountName) may be written by the app's pages.
          if (!f.appWritable || !fp.read) continue;
        } else {
          if (!same) errors.push({ field: f.apiName, message: `You don't have permission to edit ${f.label}.` });
          continue;
        }
      }
      if (!isCreate && same) continue;
      set[f.path] = coerced;
      merged[f.apiName] = coerced;
      changed.push(f.apiName);
    }

    // Defaults on create
    if (isCreate) {
      for (const f of this.object.fields) {
        if (f.isSystem || f.type === 'formula' || !isBlank(merged[f.apiName])) continue;
        const pickDefault = f.picklistValues?.find((p) => p.isDefault && p.active !== false)?.value;
        const dv = f.isCustom ? f.defaultValue ?? pickDefault : pickDefault;
        if (!isBlank(dv) && this.fieldPerm(f).edit) {
          const c = this.coerce(f, dv, errors);
          set[f.path] = c;
          merged[f.apiName] = c;
          changed.push(f.apiName);
        } else if (!f.isCustom && f.defaultValue !== undefined && f.defaultValue !== null) {
          merged[f.apiName] = f.defaultValue; // schema default, applied by Mongoose
        }
      }
      // Ownership
      if (this.byApi.ownerId && isBlank(merged.ownerId)) {
        set[this.byApi.ownerId.path] = this.ctx.userId;
        merged.ownerId = this.ctx.userId;
        if (this.byApi.ownerName && isBlank(merged.ownerName)) {
          set[this.byApi.ownerName.path] = this.ctx.user?.name || this.ctx.user?.email || '';
          merged.ownerName = set[this.byApi.ownerName.path];
        }
      }
    }

    // Required fields (all on create; touched ones on update)
    for (const f of this.object.fields) {
      if (!f.required || f.isSystem || f.type === 'formula' || f.type === 'checkbox') continue;
      if (!isCreate && !changed.includes(f.apiName)) continue;
      if (isBlank(merged[f.apiName])) {
        errors.push({ field: f.apiName, message: `${f.label} is required.` });
      }
    }

    if (errors.length) throw new ValidationError(errors);

    // Unique custom fields
    for (const f of this.object.fields) {
      if (!f.unique || !changed.includes(f.apiName) || isBlank(merged[f.apiName])) continue;
      const model = mongoose.models[this.object.isCustom ? 'CustomRecord' : this.object.apiName];
      if (!model) continue;
      const q: Doc = { $and: [this.baseFilter(), { [f.path]: merged[f.apiName] }] };
      if (prior?._id) (q.$and as Doc[]).push({ _id: { $ne: prior._id } });
      if (await model.exists(q)) {
        errors.push({ field: f.apiName, message: `${f.label} must be unique — '${merged[f.apiName]}' is already used.` });
      }
    }

    // Validation rules (TRUE = error)
    for (const rule of await this.validationRules()) {
      let failed = false;
      try {
        if (rule.mode === 'formula') {
          failed = evaluateBoolean(String(rule.formula || 'FALSE'), { record: merged, prior, user: this.perms.userTokens });
        } else {
          const conds = (rule.conditions as Condition[]) || [];
          failed = conds.length > 0 && evaluateConditions(conds, rule.logic as string | undefined, merged, this.byApi, this.perms.userTokens);
        }
      } catch (e) {
        const msg = e instanceof FormulaError ? e.message : 'evaluation error';
        errors.push({ message: `Validation rule "${rule.name}" could not be evaluated (${msg}). Ask your administrator to fix it.` });
        continue;
      }
      if (failed) errors.push({ field: (rule.errorField as string) || undefined, message: String(rule.errorMessage) });
    }

    if (errors.length) throw new ValidationError(errors);
    return { set, changed };
  }
}

const accessCache = new WeakMap<AuthContext, Map<string, Promise<ObjectAccess>>>();

/** Load metadata + permissions for one object for the current user. */
export function getObjectAccess(ctx: AuthContext, objectApiName: string): Promise<ObjectAccess> {
  let m = accessCache.get(ctx);
  if (!m) {
    m = new Map();
    accessCache.set(ctx, m);
  }
  let p = m.get(objectApiName);
  if (!p) {
    p = (async () => {
      const perms = await getEffectivePermissions(ctx);
      const object = await describeObject(perms.tenant, objectApiName);
      return new ObjectAccess(ctx, perms, object);
    })();
    m.set(objectApiName, p);
  }
  return p;
}

/** Build a `$set` update with `updatedAt` plus org stamp for legacy records. */
export function buildUpdate(access: ObjectAccess, prepared: PreparedWrite, extra: Doc = {}): Doc {
  const set: Doc = { ...prepared.set, ...extra };
  if (!access.object.isCustom) set.orgId = access.tenant;
  return { $set: set };
}

/** Expand a `$set` payload (with dotted custom.* paths) into a create document. */
export function buildCreateDoc(access: ObjectAccess, prepared: PreparedWrite, extra: Doc = {}): Doc {
  const doc: Doc = {};
  // Server-supplied `extra` values are applied last so clients can't override them.
  for (const [path, v] of Object.entries({ ...prepared.set, ...extra })) {
    if (path.startsWith('custom.')) {
      doc.custom = { ...((doc.custom as Doc) || {}), [path.slice(7)]: v };
    } else if (path.includes('.')) {
      const parts = path.split('.');
      let cur = doc;
      for (const p of parts.slice(0, -1)) {
        cur[p] = (cur[p] as Doc) || {};
        cur = cur[p] as Doc;
      }
      cur[parts[parts.length - 1]] = v;
    } else {
      doc[path] = v;
    }
  }
  doc.orgId = access.tenant;
  doc.userId = legacyOwnerKey(access.ctx);
  return doc;
}
