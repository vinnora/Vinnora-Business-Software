'use client';

import { useMemo, useState } from 'react';
import {
  ALL_APP_KEYS,
  APP_LABELS,
  OBJECT_PERMISSION_KEYS,
  OBJECT_PERMISSION_LABELS,
  SYSTEM_PERMISSIONS,
  normalizeObjectPermission,
  type FieldDescribe,
  type FieldPermission,
  type ObjectPermission,
  type ObjectSummary,
  type PermissionBundle,
  type ProfileDTO,
} from '@/lib/platform/types';
import { Badge, Btn, Checkbox, ErrorBanner, FormField, Input, Loading, Select, Table, Tabs, TextArea, api, td, th, useLoad } from './ui';

type Kind = 'profile' | 'permissionSet';
type Editable = PermissionBundle & {
  _id?: string;
  name: string;
  description?: string;
  key?: string;
  isSystem?: boolean;
  defaultObjectAccess?: ObjectPermission;
};
type Tab = 'overview' | 'apps' | 'objects' | 'fields' | 'system';

const EMPTY: ObjectPermission = { create: false, read: false, edit: false, delete: false, viewAll: false, modifyAll: false };

/** Toggle one object permission keeping dependent permissions consistent. */
export function togglePerm(p: ObjectPermission, key: keyof ObjectPermission, value: boolean): ObjectPermission {
  if (value) return normalizeObjectPermission({ ...p, [key]: true });
  const next = { ...p, [key]: false };
  if (key === 'read') return { ...EMPTY };
  if (key === 'edit') {
    next.delete = false;
    next.modifyAll = false;
  }
  if (key === 'delete' || key === 'viewAll') next.modifyAll = false;
  return next;
}

export function PermissionEditor({
  kind,
  initial,
  objects,
  onBack,
  onSaved,
}: {
  kind: Kind;
  initial: Editable;
  objects: ObjectSummary[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const [item, setItem] = useState<Editable>(() => JSON.parse(JSON.stringify(initial)));
  const [tab, setTab] = useState<Tab>('objects');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isProfile = kind === 'profile';
  const locked = isProfile && item.key === 'system_admin';
  const base = isProfile ? '/api/platform/profiles' : '/api/platform/permission-sets';

  const update = (patch: Partial<Editable>) => {
    setItem((cur) => ({ ...cur, ...patch }));
    setDirty(true);
    setSavedAt(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`${base}/${item._id}`, {
        method: 'PATCH',
        body: {
          name: item.name,
          description: item.description,
          appAccess: item.appAccess,
          objectPermissions: item.objectPermissions,
          fieldPermissions: item.fieldPermissions,
          systemPermissions: item.systemPermissions,
          ...(isProfile ? { defaultObjectAccess: item.defaultObjectAccess } : {}),
        },
      });
      setDirty(false);
      setSavedAt(Date.now());
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <button type="button" onClick={onBack} className="text-sm text-[var(--p-accent)] hover:underline">
          ← {isProfile ? 'Roles' : 'Access Packs'}
        </button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-green-700">Saved</span>}
          {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
          {!locked && (
            <Btn variant="primary" onClick={save} disabled={saving || !dirty}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-xl font-semibold text-[var(--p-text)]">{item.name}</h2>
        <Badge tone={isProfile ? 'accent' : 'blue'}>{isProfile ? 'Role' : 'Access Pack'}</Badge>
        {item.isSystem && <Badge>Standard</Badge>}
      </div>
      {locked && (
        <p className="text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded p-2 my-2">
          System Administrator always has full access to every app, module, field and Settings page. Clone it to create a restricted admin role.
        </p>
      )}
      {!isProfile && (
        <p className="text-xs text-gray-500 mb-2">Access packs only grant access: they add to whatever the user&apos;s role allows, never take it away.</p>
      )}
      <ErrorBanner error={error} />
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'apps', label: 'App Access' },
          { id: 'objects', label: 'Module Settings' },
          { id: 'fields', label: 'Field Permissions' },
          { id: 'system', label: 'System Permissions' },
        ]}
      />
      <div className="pt-4">
        {tab === 'overview' && (
          <div className="max-w-xl">
            <FormField label="Name">
              <Input value={item.name} disabled={locked || item.isSystem} onChange={(e) => update({ name: e.target.value })} />
            </FormField>
            <FormField label="Description">
              <TextArea rows={3} value={item.description || ''} disabled={locked} onChange={(e) => update({ description: e.target.value })} />
            </FormField>
          </div>
        )}
        {tab === 'apps' && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Apps users with this {isProfile ? 'role' : 'access pack'} can open. Apps also have to be on your subscription plan.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALL_APP_KEYS.map((a) => (
                <div key={a} className="bg-white border border-[var(--p-border)] rounded p-3">
                  <Checkbox
                    checked={locked || item.appAccess.includes(a)}
                    disabled={locked}
                    onChange={(v) => update({ appAccess: v ? [...item.appAccess, a] : item.appAccess.filter((x) => x !== a) })}
                    label={APP_LABELS[a]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'objects' && <ObjectSettings item={item} objects={objects} isProfile={isProfile} locked={locked} update={update} />}
        {tab === 'fields' && <FieldSettings item={item} objects={objects} isProfile={isProfile} locked={locked} update={update} />}
        {tab === 'system' && (
          <div className="space-y-2 max-w-3xl">
            {SYSTEM_PERMISSIONS.map((p) => (
              <div key={p.key} className="bg-white border border-[var(--p-border)] rounded p-3">
                <Checkbox
                  checked={locked || Boolean(item.systemPermissions[p.key])}
                  disabled={locked}
                  onChange={(v) => update({ systemPermissions: { ...item.systemPermissions, [p.key]: v } })}
                  label={<span className="font-medium">{p.label}</span>}
                />
                <div className="text-xs text-gray-500 ml-6">{p.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectSettings({
  item,
  objects,
  isProfile,
  locked,
  update,
}: {
  item: Editable;
  objects: ObjectSummary[];
  isProfile: boolean;
  locked: boolean;
  update: (p: Partial<Editable>) => void;
}) {
  const [app, setApp] = useState<string>('');
  const fallback = isProfile ? normalizeObjectPermission(item.defaultObjectAccess || {}) : EMPTY;
  const effective = (api: string): ObjectPermission =>
    locked ? normalizeObjectPermission({ modifyAll: true, create: true }) : normalizeObjectPermission(item.objectPermissions[api] ?? fallback);

  const setObj = (api: string, key: keyof ObjectPermission, v: boolean) =>
    update({ objectPermissions: { ...item.objectPermissions, [api]: togglePerm(effective(api), key, v) } });

  const rows = objects.filter((o) => !app || o.app === app);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Select className="!w-48" value={app} onChange={(e) => setApp(e.target.value)}>
          <option value="">All apps</option>
          {ALL_APP_KEYS.map((a) => (
            <option key={a} value={a}>
              {APP_LABELS[a]}
            </option>
          ))}
        </Select>
        <span className="text-xs text-gray-500">View All ignores record filters. Modify All lets users edit and delete every record.</span>
      </div>
      {isProfile && (
        <div className="bg-[var(--p-accent-bg)] border border-[var(--p-border)] rounded p-3 mb-3">
          <div className="text-sm font-medium mb-1">Default for modules not listed (e.g. new custom modules)</div>
          <div className="flex flex-wrap gap-4">
            {OBJECT_PERMISSION_KEYS.map((k) => (
              <Checkbox
                key={k}
                checked={locked || Boolean(fallback[k])}
                disabled={locked}
                onChange={(v) => update({ defaultObjectAccess: togglePerm(fallback, k, v) })}
                label={<span className="text-xs">{OBJECT_PERMISSION_LABELS[k]}</span>}
              />
            ))}
          </div>
        </div>
      )}
      <Table
        head={
          <tr>
            <th className={th}>Module</th>
            {OBJECT_PERMISSION_KEYS.map((k) => (
              <th key={k} className={`${th} text-center`}>
                {OBJECT_PERMISSION_LABELS[k]}
              </th>
            ))}
          </tr>
        }
      >
        {rows.map((o) => {
          const p = effective(o.apiName);
          const explicit = Boolean(item.objectPermissions[o.apiName]);
          return (
            <tr key={o.apiName} className="hover:bg-gray-50">
              <td className={td}>
                <div className="font-medium">{o.label}</div>
                <div className="text-[11px] text-gray-500">
                  {APP_LABELS[o.app]}
                  {isProfile && !explicit && !locked && ' · using default'}
                </div>
              </td>
              {OBJECT_PERMISSION_KEYS.map((k) => (
                <td key={k} className={`${td} text-center`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--p-accent)]"
                    aria-label={`${o.label} ${OBJECT_PERMISSION_LABELS[k]}`}
                    checked={p[k]}
                    disabled={locked}
                    onChange={(e) => setObj(o.apiName, k, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
          );
        })}
      </Table>
    </div>
  );
}

function FieldSettings({
  item,
  objects,
  isProfile,
  locked,
  update,
}: {
  item: Editable;
  objects: ObjectSummary[];
  isProfile: boolean;
  locked: boolean;
  update: (p: Partial<Editable>) => void;
}) {
  const [objectApi, setObjectApi] = useState(objects[0]?.apiName || '');
  const { data: fields, loading, error } = useLoad(
    () => (objectApi ? api<FieldDescribe[]>(`/api/platform/objects/${objectApi}/fields`) : Promise.resolve([] as FieldDescribe[])),
    [objectApi],
  );
  const grouped = useMemo(() => {
    const m = new Map<string, ObjectSummary[]>();
    objects.forEach((o) => m.set(o.app, [...(m.get(o.app) || []), o]));
    return m;
  }, [objects]);

  const current = item.fieldPermissions[objectApi] || {};
  // Profiles: fields are visible+editable unless restricted. Permission sets: nothing unless granted.
  const eff = (f: FieldDescribe): FieldPermission => {
    if (locked) return { read: true, edit: !f.isSystem && f.type !== 'formula' };
    const p = current[f.apiName];
    const read = p?.read ?? isProfile;
    const edit = (p?.edit ?? isProfile) && read && !f.isSystem && f.type !== 'formula';
    return { read, edit };
  };
  const set = (f: FieldDescribe, next: FieldPermission) =>
    update({ fieldPermissions: { ...item.fieldPermissions, [objectApi]: { ...current, [f.apiName]: next } } });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Select className="!w-72" value={objectApi} onChange={(e) => setObjectApi(e.target.value)}>
          {[...grouped.entries()].map(([app, objs]) => (
            <optgroup key={app} label={APP_LABELS[app as keyof typeof APP_LABELS]}>
              {objs.map((o) => (
                <option key={o.apiName} value={o.apiName}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <span className="text-xs text-gray-500">
          {isProfile ? 'Fields are visible and editable unless you restrict them here.' : 'Grant read or edit access to fields hidden by a role.'}
        </span>
      </div>
      <ErrorBanner error={error} />
      {loading && !fields ? (
        <Loading />
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Field</th>
              <th className={`${th} text-center`}>Read Access</th>
              <th className={`${th} text-center`}>Edit Access</th>
            </tr>
          }
        >
          {(fields || []).map((f) => {
            const p = eff(f);
            const readOnlyType = f.isSystem || f.type === 'formula';
            // Users must be able to fill in data-required fields, so profiles can't hide them.
            const requiredLock = isProfile && f.required && !readOnlyType;
            const lockTitle = requiredLock ? 'Required fields must stay visible and editable' : undefined;
            return (
              <tr key={f.apiName}>
                <td className={td}>
                  {f.label} <span className="text-[11px] text-gray-400 font-mono">{f.apiName}</span>
                  {f.required && <span className="ml-1 text-[11px] text-red-600">required</span>}
                </td>
                <td className={`${td} text-center`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--p-accent)]"
                    aria-label={`${f.label} read`}
                    checked={requiredLock || p.read}
                    disabled={locked || requiredLock}
                    title={lockTitle}
                    onChange={(e) => set(f, { read: e.target.checked, edit: e.target.checked && p.edit })}
                  />
                </td>
                <td className={`${td} text-center`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--p-accent)]"
                    aria-label={`${f.label} edit`}
                    checked={requiredLock || p.edit}
                    disabled={locked || readOnlyType || requiredLock}
                    title={readOnlyType ? 'System and calculated fields are always read-only' : lockTitle}
                    onChange={(e) => set(f, { read: e.target.checked || p.read, edit: e.target.checked })}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

export type { Editable as PermissionEditable, ProfileDTO };
