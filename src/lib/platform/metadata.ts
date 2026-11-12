/**
 * Object & field metadata: merges built-in objects (code registry) with
 * org-specific customisations (custom objects, custom fields, field overrides). Server-only.
 */
import dbConnect from '@/lib/mongodb';
import type { AuthContext } from '@/lib/auth-helpers';
import ObjectDefinition from '@/models/ObjectDefinition';
import FieldDefinition, { type IFieldDefinition } from '@/models/FieldDefinition';
import {
  STANDARD_OBJECTS,
  getStandardObject,
  standardFields,
  standardNameFields,
  supportsCustomFields,
} from './registry';
import type { AppKey, FieldDescribe, ObjectDescribe, ObjectSummary } from './types';
import { NotFoundError } from './errors';

/** Tenant key used to scope metadata and records: the org, or the solo user. */
export function tenantOf(ctx: AuthContext): string {
  return ctx.sandbox?.tenant || productionTenantOf(ctx);
}

/** The production tenant, regardless of which environment the user is in. */
export function productionTenantOf(ctx: AuthContext): string {
  return ctx.orgId || `user:${ctx.userId}`;
}

export function isSandboxTenant(tenant: string): boolean {
  return tenant.startsWith('sbx:');
}

/** Key that identified a user's records before org-wide data (records stored by email). */
export function legacyOwnerKey(ctx: AuthContext): string {
  if (ctx.userId === 'dev-user-id') return 'dev-user-id';
  return ctx.user?.email || ctx.userId;
}

export function isCustomApiName(apiName: string) {
  return /__c$/.test(apiName);
}

function customFieldToDescribe(def: IFieldDefinition): FieldDescribe {
  return {
    id: String(def._id),
    apiName: def.apiName,
    path: `custom.${def.apiName}`,
    label: def.label,
    type: def.type as FieldDescribe['type'],
    isCustom: true,
    isSystem: false,
    required: Boolean(def.required),
    unique: Boolean(def.unique),
    length: def.length,
    precision: def.precision,
    scale: def.scale,
    picklistValues: def.picklistValues?.map((p) => ({
      value: p.value,
      label: p.label || p.value,
      active: p.active !== false,
      isDefault: Boolean(p.isDefault),
      color: p.color,
    })),
    restrictedPicklist: def.restrictedPicklist !== false,
    referenceTo: def.referenceTo,
    formula: def.formula,
    returnType: def.returnType as FieldDescribe['returnType'],
    defaultValue: def.defaultValue,
    helpText: def.helpText,
    description: def.description,
    active: def.active !== false,
  };
}

function applyOverride(field: FieldDescribe, ov: IFieldDefinition): FieldDescribe {
  const out: FieldDescribe = { ...field, id: String(ov._id) };
  if (ov.label) out.label = ov.label;
  if (ov.helpText !== undefined) out.helpText = ov.helpText;
  if (ov.description !== undefined) out.description = ov.description;
  if (!field.requiredLocked && !field.isSystem) out.required = Boolean(ov.required);
  if (ov.defaultValue !== undefined && ov.defaultValue !== null && ov.defaultValue !== '') out.defaultValue = ov.defaultValue;
  if (ov.picklistValues?.length && field.picklistValues) {
    // Built-in picklists can be relabelled, reordered and deactivated — not extended.
    const allowed = new Set(field.picklistValues.map((p) => p.value));
    const ordered = ov.picklistValues
      .filter((p) => allowed.has(p.value))
      .map((p) => ({ value: p.value, label: p.label || p.value, active: p.active !== false, isDefault: Boolean(p.isDefault), color: p.color }));
    const missing = field.picklistValues.filter((p) => !ov.picklistValues!.some((o) => o.value === p.value));
    out.picklistValues = [...ordered, ...missing];
  }
  return out;
}

function customObjectBaseFields(nameFieldLabel: string): FieldDescribe[] {
  return [
    { apiName: 'name', path: 'name', label: nameFieldLabel || 'Name', type: 'text', isCustom: false, isSystem: false, required: true, requiredLocked: true, length: 255 },
    { apiName: 'ownerName', path: 'ownerName', label: 'Owner', type: 'text', isCustom: false, isSystem: true, required: false },
    { apiName: 'ownerId', path: 'ownerId', label: 'Owner ID', type: 'text', isCustom: false, isSystem: true, required: false },
    { apiName: 'userId', path: 'userId', label: 'Created By (Email)', type: 'email', isCustom: false, isSystem: true, required: false },
    { apiName: 'createdAt', path: 'createdAt', label: 'Created Date', type: 'datetime', isCustom: false, isSystem: true, required: false },
    { apiName: 'updatedAt', path: 'updatedAt', label: 'Last Modified Date', type: 'datetime', isCustom: false, isSystem: true, required: false },
  ];
}

export async function listObjects(tenant: string, app?: AppKey): Promise<ObjectSummary[]> {
  await dbConnect();
  const customObjs = await ObjectDefinition.find({ orgId: tenant, ...(app ? { app } : {}) }).sort({ label: 1 }).lean();
  const counts = await FieldDefinition.aggregate([
    { $match: { orgId: tenant, isOverride: { $ne: true } } },
    { $group: { _id: '$objectApiName', n: { $sum: 1 } } },
  ]);
  const countBy = new Map<string, number>(counts.map((c: { _id: string; n: number }) => [c._id, c.n]));

  const std: ObjectSummary[] = STANDARD_OBJECTS.filter((o) => !app || o.app === app).map((o) => ({
    apiName: o.apiName,
    label: o.label,
    pluralLabel: o.pluralLabel,
    app: o.app,
    isCustom: false,
    enforced: Boolean(o.enforced),
    description: o.description,
    customFieldCount: countBy.get(o.apiName) || 0,
  }));
  const cust: ObjectSummary[] = customObjs.map((o) => ({
    apiName: o.apiName,
    label: o.label,
    pluralLabel: o.pluralLabel,
    app: o.app as AppKey,
    isCustom: true,
    enforced: true,
    description: o.description,
    customFieldCount: countBy.get(o.apiName) || 0,
  }));
  return [...std, ...cust];
}

/** Full metadata for one object in a tenant. Throws NotFoundError. */
export async function describeObject(tenant: string, apiName: string): Promise<ObjectDescribe> {
  await dbConnect();
  const std = getStandardObject(apiName);

  if (std) {
    const defs = (await FieldDefinition.find({ orgId: tenant, objectApiName: std.apiName }).sort({ order: 1, createdAt: 1 })) as IFieldDefinition[];
    const overrides = new Map(defs.filter((d) => d.isOverride).map((d) => [d.apiName, d]));
    const base = standardFields(std).map((f) => {
      const ov = overrides.get(f.apiName);
      return ov ? applyOverride(f, ov) : f;
    });
    const canCustom = supportsCustomFields(std);
    const custom = canCustom ? defs.filter((d) => !d.isOverride).map(customFieldToDescribe) : [];
    return {
      apiName: std.apiName,
      label: std.label,
      pluralLabel: std.pluralLabel,
      app: std.app,
      isCustom: false,
      description: std.description,
      nameFields: standardNameFields(std),
      enforced: Boolean(std.enforced),
      supportsCustomFields: canCustom,
      fields: [...base.filter((f) => !f.isSystem), ...custom, ...base.filter((f) => f.isSystem)],
    };
  }

  const obj = await ObjectDefinition.findOne({ orgId: tenant, apiName });
  if (!obj) throw new NotFoundError(`Module ${apiName} not found`);
  const defs = (await FieldDefinition.find({ orgId: tenant, objectApiName: obj.apiName, isOverride: { $ne: true } }).sort({
    order: 1,
    createdAt: 1,
  })) as IFieldDefinition[];
  const base = customObjectBaseFields(obj.nameFieldLabel);
  return {
    id: String(obj._id),
    apiName: obj.apiName,
    label: obj.label,
    pluralLabel: obj.pluralLabel,
    app: obj.app as AppKey,
    isCustom: true,
    description: obj.description,
    nameFields: ['name'],
    enforced: true,
    supportsCustomFields: true,
    fields: [base[0], ...defs.map(customFieldToDescribe), ...base.slice(1)],
  };
}

export function fieldsByApi(obj: ObjectDescribe): Record<string, FieldDescribe> {
  return Object.fromEntries(obj.fields.map((f) => [f.apiName, f]));
}

/** All object api names in a tenant (used by permission editors). */
export async function allObjectApiNames(tenant: string): Promise<string[]> {
  const objs = await listObjects(tenant);
  return objs.map((o) => o.apiName);
}
