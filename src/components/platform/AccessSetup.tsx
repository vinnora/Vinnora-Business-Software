'use client';

import { useState } from 'react';
import type { ObjectSummary, PermissionSetDTO, PermissionSetGroupDTO, ProfileDTO } from '@/lib/platform/types';
import {
  Badge,
  Btn,
  Checkbox,
  Empty,
  ErrorBanner,
  FormField,
  Input,
  Loading,
  Modal,
  SectionTitle,
  Select,
  Table,
  Tabs,
  TextArea,
  ThemeScope,
  api,
  td,
  th,
  useLoad,
  type PlatformTheme,
} from './ui';
import { PermissionEditor } from './PermissionEditor';
import { ObjectManager } from './ObjectManager';
import { DataLoader } from './DataLoader';
import { SandboxesPanel } from './SandboxesPanel';

type Member = {
  _id: string;
  name: string;
  email: string;
  orgRole: string;
  isActive: boolean;
  profileId: string;
  profileAssigned: boolean;
  permissionSetIds: string[];
  permissionSetGroupIds: string[];
};

export type SetupTab = 'users' | 'profiles' | 'permissionSets' | 'groups' | 'objects' | 'dataLoader' | 'sandboxes';

export function AccessSetup({ theme, initialTab = 'users' }: { theme?: PlatformTheme; initialTab?: SetupTab }) {
  const [tab, setTab] = useState<SetupTab>(initialTab);
  return (
    <ThemeScope theme={theme}>
      <Tabs<SetupTab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'users', label: 'Users' },
          { id: 'profiles', label: 'Profiles' },
          { id: 'permissionSets', label: 'Permission Sets' },
          { id: 'groups', label: 'Permission Set Groups' },
          { id: 'objects', label: 'Object Manager' },
          { id: 'dataLoader', label: 'Data Loader' },
          { id: 'sandboxes', label: 'Sandboxes & Deployments' },
        ]}
      />
      <div className="pt-5">
        {tab === 'users' && <UsersPanel />}
        {tab === 'profiles' && <ProfilesPanel />}
        {tab === 'permissionSets' && <PermissionSetsPanel />}
        {tab === 'groups' && <GroupsPanel />}
        {tab === 'objects' && <ObjectManager theme={theme} />}
        {tab === 'dataLoader' && <DataLoader theme={theme} />}
        {tab === 'sandboxes' && <SandboxesPanel />}
      </div>
    </ThemeScope>
  );
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

function UsersPanel() {
  const users = useLoad(() => api<Member[]>('/api/platform/users'), []);
  const profiles = useLoad(() => api<ProfileDTO[]>('/api/platform/profiles'), []);
  const sets = useLoad(() => api<PermissionSetDTO[]>('/api/platform/permission-sets'), []);
  const groups = useLoad(() => api<PermissionSetGroupDTO[]>('/api/platform/permission-set-groups'), []);
  const [editing, setEditing] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileName = (id: string) => profiles.data?.find((p) => p._id === id)?.name || '—';
  const setName = (id: string) => sets.data?.find((s) => s._id === id)?.name || id;
  const groupName = (id: string) => groups.data?.find((g) => g._id === id)?.name || id;

  const changeProfile = async (u: Member, profileId: string) => {
    setError(null);
    try {
      await api('/api/platform/users', { method: 'PATCH', body: { userId: u._id, profileId } });
      users.reload();
      profiles.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Users"
        subtitle="Each user has one profile plus any number of permission sets and permission set groups. Invite people from your workspace settings."
      />
      <ErrorBanner error={users.error || error} />
      {users.loading && !users.data ? (
        <Loading />
      ) : !users.data?.length ? (
        <Empty>No users in this workspace yet.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>User</th>
              <th className={th}>Role</th>
              <th className={th}>Profile</th>
              <th className={th}>Permission Sets &amp; Groups</th>
              <th className={th}></th>
            </tr>
          }
        >
          {users.data.map((u) => (
            <tr key={u._id}>
              <td className={td}>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
                {!u.isActive && <Badge tone="amber">Inactive</Badge>}
              </td>
              <td className={`${td} capitalize text-gray-600`}>{u.orgRole}</td>
              <td className={td}>
                {u.orgRole === 'owner' ? (
                  <span className="text-sm" title="The workspace owner always has full access">
                    System Administrator <Badge>Owner</Badge>
                  </span>
                ) : (
                  <Select className="!w-56" value={u.profileId} onChange={(e) => changeProfile(u, e.target.value)}>
                    {(profiles.data || []).map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
                {!u.profileAssigned && u.orgRole !== 'owner' && (
                  <div className="text-[11px] text-gray-500 mt-0.5">From role: {profileName(u.profileId)}</div>
                )}
              </td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {u.permissionSetIds.map((id) => (
                    <Badge key={id} tone="blue">
                      {setName(id)}
                    </Badge>
                  ))}
                  {u.permissionSetGroupIds.map((id) => (
                    <Badge key={id} tone="accent">
                      {groupName(id)}
                    </Badge>
                  ))}
                  {!u.permissionSetIds.length && !u.permissionSetGroupIds.length && <span className="text-xs text-gray-400">None</span>}
                </div>
              </td>
              <td className={`${td} text-right`}>
                <Btn size="sm" variant="ghost" onClick={() => setEditing(u)}>
                  Manage assignments
                </Btn>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <AssignmentsModal
          user={editing}
          sets={sets.data || []}
          groups={groups.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            users.reload();
            sets.reload();
            groups.reload();
          }}
        />
      )}
    </div>
  );
}

function AssignmentsModal({
  user,
  sets,
  groups,
  onClose,
  onSaved,
}: {
  user: Member;
  sets: PermissionSetDTO[];
  groups: PermissionSetGroupDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [setIds, setSetIds] = useState(user.permissionSetIds);
  const [groupIds, setGroupIds] = useState(user.permissionSetGroupIds);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await api('/api/platform/users', { method: 'PATCH', body: { userId: user._id, permissionSetIds: setIds, permissionSetGroupIds: groupIds } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assignments — ${user.name}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <h3 className="text-sm font-semibold mb-2">Permission Sets</h3>
      {sets.length === 0 ? (
        <p className="text-xs text-gray-500 mb-4">No permission sets yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          {sets.map((s) => (
            <Checkbox
              key={s._id}
              checked={setIds.includes(s._id!)}
              onChange={(v) => setSetIds(v ? [...setIds, s._id!] : setIds.filter((x) => x !== s._id))}
              label={s.name}
            />
          ))}
        </div>
      )}
      <h3 className="text-sm font-semibold mb-2">Permission Set Groups</h3>
      {groups.length === 0 ? (
        <p className="text-xs text-gray-500">No groups yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {groups.map((g) => (
            <Checkbox
              key={g._id}
              checked={groupIds.includes(g._id!)}
              onChange={(v) => setGroupIds(v ? [...groupIds, g._id!] : groupIds.filter((x) => x !== g._id))}
              label={g.name}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

function useObjects() {
  return useLoad(() => api<ObjectSummary[]>('/api/platform/objects'), []);
}

function ProfilesPanel() {
  const { data, error, loading, reload } = useLoad(() => api<ProfileDTO[]>('/api/platform/profiles'), []);
  const objects = useObjects();
  const [openId, setOpenId] = useState<string | null>(null);
  const [cloning, setCloning] = useState<ProfileDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const open = data?.find((p) => p._id === openId);
  if (open && objects.data) {
    return <PermissionEditor key={open._id} kind="profile" initial={open} objects={objects.data} onBack={() => setOpenId(null)} onSaved={reload} />;
  }

  const remove = async (p: ProfileDTO) => {
    if (!window.confirm(`Delete profile "${p.name}"?`)) return;
    setActionError(null);
    try {
      await api(`/api/platform/profiles/${p._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Profiles"
        subtitle="A profile is a user's baseline access: apps, object permissions, field-level security and system permissions. Create new profiles by cloning."
      />
      <ErrorBanner error={error || actionError || objects.error} />
      {loading && !data ? (
        <Loading />
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Profile</th>
              <th className={th}>Users</th>
              <th className={th}></th>
            </tr>
          }
        >
          {(data || []).map((p) => (
            <tr key={p._id}>
              <td className={td}>
                <button type="button" className="font-medium text-[var(--p-accent)] hover:underline" onClick={() => setOpenId(p._id!)}>
                  {p.name}
                </button>
                {p.isSystem && (
                  <span className="ml-2">
                    <Badge>Standard</Badge>
                  </span>
                )}
                {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
              </td>
              <td className={`${td} text-gray-600`}>{p.userCount ?? 0}</td>
              <td className={`${td} text-right whitespace-nowrap space-x-3 text-xs`}>
                <button type="button" className="text-[var(--p-accent)] hover:underline" onClick={() => setCloning(p)}>
                  Clone
                </button>
                {!p.isSystem && (
                  <button type="button" className="text-red-600 hover:underline" onClick={() => remove(p)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {cloning && (
        <NameModal
          title={`Clone ${cloning.name}`}
          onClose={() => setCloning(null)}
          onSave={async (name, description) => {
            const p = await api<ProfileDTO>('/api/platform/profiles', { body: { name, description, cloneFrom: cloning._id } });
            setCloning(null);
            await reload();
            setOpenId(String(p._id));
          }}
        />
      )}
    </div>
  );
}

function NameModal({
  title,
  onClose,
  onSave,
  defaultName = '',
}: {
  title: string;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onSave(name, description);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <FormField label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </FormField>
      <FormField label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Permission sets                                                     */
/* ------------------------------------------------------------------ */

function PermissionSetsPanel() {
  const { data, error, loading, reload } = useLoad(() => api<PermissionSetDTO[]>('/api/platform/permission-sets'), []);
  const objects = useObjects();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const open = data?.find((s) => s._id === openId);
  if (open && objects.data) {
    return <PermissionEditor key={open._id} kind="permissionSet" initial={open} objects={objects.data} onBack={() => setOpenId(null)} onSaved={reload} />;
  }

  const remove = async (s: PermissionSetDTO) => {
    if (!window.confirm(`Delete permission set "${s.name}"? It will be removed from ${s.userCount ?? 0} user(s).`)) return;
    setActionError(null);
    try {
      await api(`/api/platform/permission-sets/${s._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Permission Sets"
        subtitle="Grant extra access to specific users without changing their profile — e.g. 'Delete Opportunities' or 'Inventory Access'."
        actions={
          <Btn variant="primary" onClick={() => setCreating(true)}>
            + New Permission Set
          </Btn>
        }
      />
      <ErrorBanner error={error || actionError || objects.error} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No permission sets yet.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Permission Set</th>
              <th className={th}>API Name</th>
              <th className={th}>Users</th>
              <th className={th}></th>
            </tr>
          }
        >
          {data.map((s) => (
            <tr key={s._id}>
              <td className={td}>
                <button type="button" className="font-medium text-[var(--p-accent)] hover:underline" onClick={() => setOpenId(s._id!)}>
                  {s.name}
                </button>
                {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
              </td>
              <td className={`${td} font-mono text-xs text-gray-600`}>{s.apiName}</td>
              <td className={`${td} text-gray-600`}>{s.userCount ?? 0}</td>
              <td className={`${td} text-right`}>
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(s)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {creating && (
        <NameModal
          title="New Permission Set"
          onClose={() => setCreating(false)}
          onSave={async (name, description) => {
            const s = await api<PermissionSetDTO>('/api/platform/permission-sets', { body: { name, description } });
            setCreating(false);
            await reload();
            setOpenId(String(s._id));
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Permission set groups                                               */
/* ------------------------------------------------------------------ */

function GroupsPanel() {
  const { data, error, loading, reload } = useLoad(() => api<PermissionSetGroupDTO[]>('/api/platform/permission-set-groups'), []);
  const sets = useLoad(() => api<PermissionSetDTO[]>('/api/platform/permission-sets'), []);
  const [editing, setEditing] = useState<PermissionSetGroupDTO | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (g: PermissionSetGroupDTO) => {
    if (!window.confirm(`Delete group "${g.name}"?`)) return;
    try {
      await api(`/api/platform/permission-set-groups/${g._id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Permission Set Groups"
        subtitle="Bundle permission sets for a job role (e.g. 'Sales Manager') and assign them in one go."
        actions={
          <Btn variant="primary" onClick={() => setEditing({ name: '', apiName: '', description: '', permissionSetIds: [] })}>
            + New Group
          </Btn>
        }
      />
      <ErrorBanner error={error || actionError} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No permission set groups yet.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Group</th>
              <th className={th}>Permission Sets</th>
              <th className={th}>Users</th>
              <th className={th}></th>
            </tr>
          }
        >
          {data.map((g) => (
            <tr key={g._id}>
              <td className={td}>
                <button type="button" className="font-medium text-[var(--p-accent)] hover:underline" onClick={() => setEditing(g)}>
                  {g.name}
                </button>
                {g.description && <div className="text-xs text-gray-500">{g.description}</div>}
              </td>
              <td className={td}>
                <div className="flex flex-wrap gap-1">
                  {g.permissionSetIds.map((id) => (
                    <Badge key={id} tone="blue">
                      {sets.data?.find((s) => s._id === id)?.name || id}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className={`${td} text-gray-600`}>{g.userCount ?? 0}</td>
              <td className={`${td} text-right`}>
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(g)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && (
        <GroupModal
          group={editing}
          sets={sets.data || []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function GroupModal({
  group,
  sets,
  onClose,
  onSaved,
}: {
  group: PermissionSetGroupDTO;
  sets: PermissionSetDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(group);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setError(null);
    try {
      if (form._id) await api(`/api/platform/permission-set-groups/${form._id}`, { method: 'PATCH', body: form });
      else await api('/api/platform/permission-set-groups', { body: form });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={form._id ? `Edit ${group.name}` : 'New Permission Set Group'}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!form.name.trim()} onClick={save}>
            Save
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <FormField label="Name" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Description">
        <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      <h3 className="text-sm font-semibold mb-2">Included permission sets</h3>
      {sets.length === 0 ? (
        <p className="text-xs text-gray-500">Create permission sets first.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {sets.map((s) => (
            <Checkbox
              key={s._id}
              checked={form.permissionSetIds.includes(s._id!)}
              onChange={(v) =>
                setForm({ ...form, permissionSetIds: v ? [...form.permissionSetIds, s._id!] : form.permissionSetIds.filter((x) => x !== s._id) })
              }
              label={s.name}
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
