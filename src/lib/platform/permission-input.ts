/** Sanitising profile / permission-set payloads. Server-only. */
import {
  ALL_APP_KEYS,
  SYSTEM_PERMISSIONS,
  normalizeObjectPermission,
  type AppKey,
  type FieldPermission,
  type ObjectPermission,
  type PermissionBundle,
} from './types';

const KEY_RE = /^[A-Za-z0-9_]{1,80}$/;

export function cleanBundle(body: Record<string, unknown>, objectNames: Set<string>): Partial<PermissionBundle> {
  const out: Partial<PermissionBundle> = {};

  if (Array.isArray(body.appAccess)) {
    out.appAccess = [...new Set((body.appAccess as string[]).filter((a): a is AppKey => ALL_APP_KEYS.includes(a as AppKey)))];
  }

  if (body.objectPermissions && typeof body.objectPermissions === 'object') {
    const op: Record<string, ObjectPermission> = {};
    for (const [obj, p] of Object.entries(body.objectPermissions as Record<string, Partial<ObjectPermission>>)) {
      if (!KEY_RE.test(obj) || !objectNames.has(obj) || !p || typeof p !== 'object') continue;
      op[obj] = normalizeObjectPermission({
        create: Boolean(p.create),
        read: Boolean(p.read),
        edit: Boolean(p.edit),
        delete: Boolean(p.delete),
        viewAll: Boolean(p.viewAll),
        modifyAll: Boolean(p.modifyAll),
      });
    }
    out.objectPermissions = op;
  }

  if (body.fieldPermissions && typeof body.fieldPermissions === 'object') {
    const fp: Record<string, Record<string, FieldPermission>> = {};
    for (const [obj, fields] of Object.entries(body.fieldPermissions as Record<string, Record<string, Partial<FieldPermission>>>)) {
      if (!KEY_RE.test(obj) || !objectNames.has(obj) || !fields || typeof fields !== 'object') continue;
      fp[obj] = {};
      for (const [field, p] of Object.entries(fields)) {
        if (!KEY_RE.test(field) || !p || typeof p !== 'object') continue;
        const edit = Boolean(p.edit);
        fp[obj][field] = { read: Boolean(p.read) || edit, edit };
      }
    }
    out.fieldPermissions = fp;
  }

  if (body.systemPermissions && typeof body.systemPermissions === 'object') {
    const sp: Record<string, boolean> = {};
    const raw = body.systemPermissions as Record<string, unknown>;
    for (const { key } of SYSTEM_PERMISSIONS) sp[key] = Boolean(raw[key]);
    if (sp.modifyAllData) sp.viewAllData = true;
    if (sp.customizeApplication || sp.manageProfilesPermissionSets || sp.manageUsers) sp.viewSetup = true;
    out.systemPermissions = sp;
  }

  return out;
}

export function cleanDefaultAccess(raw: unknown): ObjectPermission | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const p = raw as Partial<ObjectPermission>;
  return normalizeObjectPermission({
    create: Boolean(p.create),
    read: Boolean(p.read),
    edit: Boolean(p.edit),
    delete: Boolean(p.delete),
    viewAll: Boolean(p.viewAll),
    modifyAll: Boolean(p.modifyAll),
  });
}
