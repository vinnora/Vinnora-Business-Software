'use client';

import { useMemo, useState } from 'react';
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
  Table,
  Tabs,
  TextArea,
  api,
  td,
  th,
  useLoad,
} from './ui';
import { switchEnvironment, useEnvironment } from './EnvironmentSwitcher';

type SandboxRow = {
  _id: string;
  name: string;
  description?: string;
  type: 'developer' | 'partial' | 'full';
  status: 'creating' | 'ready' | 'failed';
  statusMessage?: string;
  sampleSize: number;
  userIds: string[];
  createdByName?: string;
  lastRefreshedAt?: string;
  createdAt: string;
  copied?: Record<string, number>;
};

type DiffItem = {
  type: string;
  key: string;
  label: string;
  action: 'add' | 'change' | 'delete';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};
type Issue = { type: string; key: string; message: string };
type Validation = { ok: boolean; errors: Issue[]; warnings: Issue[] };
type DeploymentRow = {
  _id: string;
  sandboxName: string;
  status: 'succeeded' | 'failed' | 'rolledBack';
  items: { type: string; key: string; label: string; action: string }[];
  log: string[];
  deployedByName?: string;
  createdAt: string;
  rolledBackAt?: string;
};
type Member = { _id: string; name: string; email: string; orgRole: string };

const TYPE_LABEL = { developer: 'Developer', partial: 'Partial Copy', full: 'Full Copy' };
const TYPE_HELP = {
  developer: 'Configuration only — modules, fields, rules, form layouts, roles, access packs and public reports. No records.',
  partial: 'Configuration plus a sample of the most recent records of each connected module.',
  full: 'Configuration plus every record of each connected module.',
};
const COMPONENT_LABELS: Record<string, string> = {
  object: 'Custom Modules',
  field: 'Fields',
  profile: 'Roles',
  permissionSet: 'Access Packs',
  permissionSetGroup: 'Access Pack Groups',
  validationRule: 'Check Rules',
  restrictionRule: 'Record Filters',
  layout: 'Form Layouts',
  layoutAssignment: 'Form Layout Assignments',
  report: 'Reports',
  dashboard: 'Dashboards',
};

function when(s?: string) {
  return s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

type Tab = 'sandboxes' | 'history';

export function SandboxesPanel() {
  const [tab, setTab] = useState<Tab>('sandboxes');
  const [deploying, setDeploying] = useState<SandboxRow | null>(null);
  if (deploying) return <DeployView sandbox={deploying} onBack={() => setDeploying(null)} />;
  return (
    <div>
      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'sandboxes', label: 'Test Workspaces' },
          { id: 'history', label: 'Deployment History' },
        ]}
      />
      <div className="pt-4">{tab === 'sandboxes' ? <SandboxList onDeploy={setDeploying} /> : <DeploymentHistory />}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sandbox list                                                        */
/* ------------------------------------------------------------------ */

function SandboxList({ onDeploy }: { onDeploy: (s: SandboxRow) => void }) {
  const { data, error, loading, reload } = useLoad(() => api<SandboxRow[]>('/api/platform/sandboxes'), []);
  const env = useEnvironment();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [accessFor, setAccessFor] = useState<SandboxRow | null>(null);
  const [deleting, setDeleting] = useState<SandboxRow | null>(null);

  const refresh = async (s: SandboxRow) => {
    if (!window.confirm(`Refresh "${s.name}"? Everything in it is replaced with a fresh copy of production. Undeployed changes are lost.`)) return;
    setBusy(s._id);
    setActionError(null);
    try {
      await api(`/api/platform/sandboxes/${s._id}/refresh`, { body: {} });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <SectionTitle
        title="Test Workspaces"
        subtitle="Build and test configuration changes away from production, then compare and deploy them. Only Sell & Support and custom modules are copied; other apps are unavailable while you're in a test workspace."
        actions={
          <Btn variant="primary" onClick={() => setCreating(true)}>
            + New Test Workspace
          </Btn>
        }
      />
      <ErrorBanner error={error || actionError} />
      {env?.current && (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded p-2 mb-3">
          You&apos;re currently in the test workspace <b>{env.current.name}</b>. Test workspaces are managed from production, but you can manage them here too.
        </p>
      )}
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No test workspaces yet. Create one to try changes safely before they reach your team.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Test Workspace</th>
              <th className={th}>Type</th>
              <th className={th}>Status</th>
              <th className={th}>Last copied</th>
              <th className={th}></th>
            </tr>
          }
        >
          {data.map((s) => (
            <tr key={s._id}>
              <td className={td}>
                <div className="font-medium">{s.name}</div>
                {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                {s.copied && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {s.copied.configuration ?? 0} config items
                    {Object.entries(s.copied)
                      .filter(([k]) => k !== 'configuration')
                      .map(([k, n]) => ` · ${n} ${k}`)
                      .join('')}
                  </div>
                )}
              </td>
              <td className={`${td} text-gray-700`}>
                {TYPE_LABEL[s.type]}
                {s.type === 'partial' && <span className="text-xs text-gray-500"> ({s.sampleSize}/object)</span>}
              </td>
              <td className={td}>
                {s.status === 'ready' ? <Badge tone="green">Ready</Badge> : s.status === 'creating' ? <Badge tone="amber">Copying…</Badge> : <Badge tone="red">Failed</Badge>}
                {env?.current?.id === s._id && (
                  <span className="ml-1">
                    <Badge tone="accent">You&apos;re here</Badge>
                  </span>
                )}
                {s.statusMessage && <div className="text-[11px] text-red-600">{s.statusMessage}</div>}
              </td>
              <td className={`${td} text-xs text-gray-600`}>{when(s.lastRefreshedAt || s.createdAt)}</td>
              <td className={`${td} text-right whitespace-nowrap space-x-3 text-xs`}>
                {s.status === 'ready' && env?.current?.id !== s._id && (
                  <button type="button" className="text-[var(--p-accent)] hover:underline" onClick={() => switchEnvironment(s._id).catch((e) => setActionError(e.message))}>
                    Open
                  </button>
                )}
                {s.status === 'ready' && (
                  <button type="button" className="text-[var(--p-accent)] hover:underline font-medium" onClick={() => onDeploy(s)}>
                    Compare &amp; Deploy
                  </button>
                )}
                <button type="button" className="text-gray-600 hover:underline" onClick={() => setAccessFor(s)}>
                  Access
                </button>
                <button type="button" className="text-gray-600 hover:underline disabled:opacity-50" disabled={busy === s._id} onClick={() => refresh(s)}>
                  {busy === s._id ? 'Refreshing…' : 'Refresh'}
                </button>
                <button type="button" className="text-red-600 hover:underline" onClick={() => setDeleting(s)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {creating && (
        <NewSandboxModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {accessFor && <AccessModal sandbox={accessFor} onClose={() => setAccessFor(null)} onSaved={() => (setAccessFor(null), reload())} />}
      {deleting && <DeleteModal sandbox={deleting} onClose={() => setDeleting(null)} onDeleted={() => (setDeleting(null), reload())} />}
    </div>
  );
}

function NewSandboxModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'developer' as SandboxRow['type'], sampleSize: 100 });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const s = await api<SandboxRow>('/api/platform/sandboxes', { body: form });
      if (s.status === 'failed') throw new Error(s.statusMessage || 'Copy failed');
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="New Test Workspace"
      footer={
        <>
          <Btn onClick={onClose} disabled={saving}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? 'Copying production…' : 'Create'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <FormField label="Name" required help="e.g. Dev, UAT, Training">
        <Input value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </FormField>
      <FormField label="Description">
        <TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      <div className="text-xs font-medium text-gray-700 mb-1">Type</div>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
        {(Object.keys(TYPE_LABEL) as SandboxRow['type'][]).map((t) => (
          <label
            key={t}
            className={`border rounded p-3 cursor-pointer ${form.type === t ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)]' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <input type="radio" className="sr-only" checked={form.type === t} onChange={() => setForm({ ...form, type: t })} />
            <div className="text-sm font-medium">{TYPE_LABEL[t]}</div>
            <div className="text-[11px] text-gray-500 mt-1">{TYPE_HELP[t]}</div>
          </label>
        ))}
      </div>
      {form.type === 'partial' && (
        <FormField label="Records per module">
          <Input type="number" className="!w-32" min={1} max={10000} value={form.sampleSize} onChange={(e) => setForm({ ...form, sampleSize: Number(e.target.value) })} />
        </FormField>
      )}
      {form.type !== 'developer' && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          Copies of customer records will be visible to everyone with access to this sandbox. Lookups to records that weren&apos;t copied are
          cleared.
        </p>
      )}
    </Modal>
  );
}

function AccessModal({ sandbox, onClose, onSaved }: { sandbox: SandboxRow; onClose: () => void; onSaved: () => void }) {
  const { data: users } = useLoad(() => api<Member[]>('/api/platform/users'), []);
  const [ids, setIds] = useState<string[]>(sandbox.userIds || []);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await api(`/api/platform/sandboxes/${sandbox._id}`, { method: 'PATCH', body: { userIds: ids } });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Who can use ${sandbox.name}`}
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
      <p className="text-sm text-gray-600 mb-3">
        The workspace owner, admins and the test workspace creator always have access. Inside the test workspace, people keep the role and access packs
        they had when it was copied (change them in the test workspace&apos;s own Settings → Users).
      </p>
      <div className="space-y-2">
        {(users || [])
          .filter((u) => u.orgRole !== 'owner' && u.orgRole !== 'admin')
          .map((u) => (
            <Checkbox
              key={u._id}
              checked={ids.includes(u._id)}
              onChange={(v) => setIds(v ? [...ids, u._id] : ids.filter((x) => x !== u._id))}
              label={
                <span>
                  {u.name} <span className="text-xs text-gray-500">{u.email}</span>
                </span>
              }
            />
          ))}
      </div>
    </Modal>
  );
}

function DeleteModal({ sandbox, onClose, onDeleted }: { sandbox: SandboxRow; onClose: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    try {
      await api(`/api/platform/sandboxes/${sandbox._id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${sandbox.name}`}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" disabled={confirm !== sandbox.name} onClick={remove}>
            Delete sandbox
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <p className="text-sm text-gray-600 mb-3">
        Permanently deletes the test workspace with all of its configuration and records. Production is not affected. Type <b>{sandbox.name}</b> to
        confirm.
      </p>
      <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={sandbox.name} />
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Compare & deploy                                                    */
/* ------------------------------------------------------------------ */

const itemId = (i: { type: string; key: string }) => `${i.type}|${i.key}`;

function DeployView({ sandbox, onBack }: { sandbox: SandboxRow; onBack: () => void }) {
  const { data: diff, error, loading, reload } = useLoad(() => api<DiffItem[]>(`/api/platform/sandboxes/${sandbox._id}/compare`), [sandbox._id]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'add' | 'change' | 'delete'>('all');
  const [viewing, setViewing] = useState<DiffItem | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [working, setWorking] = useState<'validate' | 'deploy' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<DeploymentRow | null>(null);

  const items = useMemo(() => (diff || []).filter((d) => filter === 'all' || d.action === filter), [diff, filter]);
  const grouped = useMemo(() => {
    const m = new Map<string, DiffItem[]>();
    items.forEach((i) => m.set(i.type, [...(m.get(i.type) || []), i]));
    return m;
  }, [items]);
  const chosen = (diff || []).filter((d) => selected.has(itemId(d)));
  const destructive = chosen.filter((d) => d.action === 'delete');

  const toggle = (d: DiffItem, v: boolean) => {
    const next = new Set(selected);
    if (v) next.add(itemId(d));
    else next.delete(itemId(d));
    setSelected(next);
    setValidation(null);
  };

  const validate = async () => {
    setWorking('validate');
    setActionError(null);
    try {
      setValidation(await api<Validation>(`/api/platform/sandboxes/${sandbox._id}/deploy`, { body: { validateOnly: true, selected: chosen.map(({ type, key }) => ({ type, key })) } }));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  const deploy = async () => {
    setConfirming(false);
    setWorking('deploy');
    setActionError(null);
    try {
      const r = await api<{ deployment: DeploymentRow }>(`/api/platform/sandboxes/${sandbox._id}/deploy`, {
        body: { selected: chosen.map(({ type, key }) => ({ type, key })) },
      });
      setDone(r.deployment);
      setSelected(new Set());
      setValidation(null);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="text-sm text-[var(--p-accent)] hover:underline mb-2">
        ← Sandboxes
      </button>
      <SectionTitle
        title={`Deploy from ${sandbox.name} to Production`}
        subtitle="Every configuration difference between the test workspace and production. Tick what to deploy, validate, then deploy. Records are never deployed."
        actions={
          <>
            <Btn onClick={reload}>Refresh comparison</Btn>
            <Btn onClick={validate} disabled={!chosen.length || working !== null}>
              {working === 'validate' ? 'Validating…' : 'Validate'}
            </Btn>
            <Btn variant="primary" onClick={() => setConfirming(true)} disabled={!chosen.length || working !== null || validation?.ok === false}>
              {working === 'deploy' ? 'Deploying…' : `Deploy ${chosen.length || ''}`}
            </Btn>
          </>
        }
      />
      <ErrorBanner error={error || actionError} />
      {done && (
        <div className={`mb-3 rounded border px-3 py-2 text-sm ${done.status === 'succeeded' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          Deployment {done.status === 'succeeded' ? 'succeeded' : 'failed and was reverted'}: {done.items.length} change(s). It can be rolled back from
          Deployment History.
        </div>
      )}
      {validation && (
        <div className={`mb-3 rounded border px-3 py-2 text-sm ${validation.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          <div className="font-medium">{validation.ok ? '✓ Validation passed — ready to deploy.' : '✕ Validation failed — fix these before deploying:'}</div>
          {validation.errors.length > 0 && (
            <ul className="list-disc pl-5 mt-1 text-xs">
              {validation.errors.map((e, i) => (
                <li key={i}>
                  <b>{e.key}</b>: {e.message}
                </li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <ul className="list-disc pl-5 mt-1 text-xs text-amber-800">
              {validation.warnings.map((e, i) => (
                <li key={i}>
                  <b>{e.key}</b>: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        {(['all', 'add', 'change', 'delete'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full border ${filter === f ? 'border-[var(--p-accent)] bg-[var(--p-accent-bg)] text-[var(--p-accent)]' : 'border-gray-300 text-gray-600'}`}
          >
            {f === 'all' ? `All (${diff?.length ?? 0})` : `${f === 'add' ? 'New' : f === 'change' ? 'Changed' : 'Only in production'} (${(diff || []).filter((d) => d.action === f).length})`}
          </button>
        ))}
        <span className="ml-auto flex gap-3">
          <button type="button" className="text-[var(--p-accent)] hover:underline" onClick={() => (setSelected(new Set(items.filter((i) => i.action !== 'delete').map(itemId))), setValidation(null))}>
            Select all new &amp; changed
          </button>
          <button type="button" className="text-gray-600 hover:underline" onClick={() => (setSelected(new Set()), setValidation(null))}>
            Clear
          </button>
        </span>
      </div>
      {loading && !diff ? (
        <Loading label="Comparing test workspace with production…" />
      ) : !diff?.length ? (
        <Empty>No differences — the test workspace matches production.</Empty>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([type, list]) => (
            <div key={type}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">{COMPONENT_LABELS[type] || type}</h3>
              <Table
                head={
                  <tr>
                    <th className={`${th} w-10`}></th>
                    <th className={th}>Component</th>
                    <th className={th}>Change</th>
                    <th className={th}></th>
                  </tr>
                }
              >
                {list.map((d) => {
                  const issues = validation?.errors.filter((e) => e.type === d.type && e.key === d.key) || [];
                  return (
                    <tr key={itemId(d)} className={issues.length ? 'bg-red-50' : ''}>
                      <td className={td}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--p-accent)]"
                          aria-label={`Deploy ${d.label}`}
                          checked={selected.has(itemId(d))}
                          onChange={(e) => toggle(d, e.target.checked)}
                        />
                      </td>
                      <td className={td}>
                        <div className="font-medium">{d.label}</div>
                        <div className="text-[11px] font-mono text-gray-500">{d.key}</div>
                        {issues.map((e, i) => (
                          <div key={i} className="text-xs text-red-700">
                            {e.message}
                          </div>
                        ))}
                      </td>
                      <td className={td}>
                        {d.action === 'add' ? <Badge tone="green">New in test workspace</Badge> : d.action === 'change' ? <Badge tone="blue">Changed</Badge> : <Badge tone="red">Delete from production</Badge>}
                      </td>
                      <td className={`${td} text-right`}>
                        <button type="button" className="text-xs text-[var(--p-accent)] hover:underline" onClick={() => setViewing(d)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          ))}
        </div>
      )}
      {viewing && <DiffModal item={viewing} onClose={() => setViewing(null)} />}
      {confirming && (
        <ConfirmDeploy count={chosen.length} destructive={destructive} validated={validation?.ok === true} onCancel={() => setConfirming(false)} onConfirm={deploy} />
      )}
    </div>
  );
}

function ConfirmDeploy({
  count,
  destructive,
  validated,
  onCancel,
  onConfirm,
}: {
  count: number;
  destructive: DiffItem[];
  validated: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const needsTyping = destructive.length > 0;
  return (
    <Modal
      open
      onClose={onCancel}
      title="Deploy to Production"
      footer={
        <>
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant={needsTyping ? 'danger' : 'primary'} disabled={needsTyping && typed !== 'DEPLOY'} onClick={onConfirm}>
            Deploy {count} change(s)
          </Btn>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        These changes take effect for everyone in production immediately. The deployment is validated again first, and you can roll it back from
        Deployment History.
      </p>
      {!validated && <p className="text-xs text-gray-500 mt-2">Tip: run Validate first to see problems before deploying.</p>}
      {needsTyping && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium mb-1">This deployment deletes from production:</div>
          <ul className="list-disc pl-5 text-xs mb-2">
            {destructive.map((d) => (
              <li key={itemId(d)}>
                {d.label}
                {(d.type === 'field' || d.type === 'object') && ' — including its data, which a rollback cannot restore'}
              </li>
            ))}
          </ul>
          Type <b>DEPLOY</b> to confirm.
          <Input className="mt-2" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

function changedKeys(a: Record<string, unknown> | null, b: Record<string, unknown> | null): Set<string> {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return new Set([...keys].filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])));
}

function DiffModal({ item, onClose }: { item: DiffItem; onClose: () => void }) {
  const changed = changedKeys(item.before, item.after);
  const keys = [...new Set([...Object.keys(item.before || {}), ...Object.keys(item.after || {})])].sort(
    (a, b) => Number(changed.has(b)) - Number(changed.has(a)) || a.localeCompare(b),
  );
  const fmt = (v: unknown) => (v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  return (
    <Modal open onClose={onClose} size="xl" title={`${item.label} — ${item.action === 'add' ? 'new in test workspace' : item.action === 'change' ? 'changed' : 'only in production'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-2 py-1.5 w-40">Property</th>
              <th className="text-left px-2 py-1.5">Production</th>
              <th className="text-left px-2 py-1.5">Test Workspace</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className={`border-t border-gray-100 align-top ${changed.has(k) ? 'bg-amber-50' : ''}`}>
                <td className="px-2 py-1.5 font-mono text-gray-700">{k}</td>
                <td className="px-2 py-1.5">
                  <pre className="whitespace-pre-wrap break-words font-mono text-gray-700 max-h-60 overflow-y-auto">{item.before ? fmt(item.before[k]) : '—'}</pre>
                </td>
                <td className="px-2 py-1.5">
                  <pre className="whitespace-pre-wrap break-words font-mono text-gray-900 max-h-60 overflow-y-auto">{item.after ? fmt(item.after[k]) : '—'}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

function DeploymentHistory() {
  const { data, error, loading, reload } = useLoad(() => api<DeploymentRow[]>('/api/platform/deployments'), []);
  const [open, setOpen] = useState<DeploymentRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const rollback = async (d: DeploymentRow) => {
    if (!window.confirm(`Roll back the deployment from ${d.sandboxName}? Production returns to how it was before it. Deleted data can't be restored.`)) return;
    setBusy(d._id);
    setActionError(null);
    try {
      await api(`/api/platform/deployments/${d._id}/rollback`, { body: {} });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const latestSucceeded = data?.find((d) => d.status === 'succeeded')?._id;

  return (
    <div>
      <SectionTitle title="Deployment History" subtitle="Every deployment to production. The most recent successful deployment can be rolled back." />
      <ErrorBanner error={error || actionError} />
      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>No deployments yet.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>When</th>
              <th className={th}>From</th>
              <th className={th}>By</th>
              <th className={th}>Changes</th>
              <th className={th}>Status</th>
              <th className={th}></th>
            </tr>
          }
        >
          {data.map((d) => (
            <tr key={d._id}>
              <td className={`${td} text-xs`}>{when(d.createdAt)}</td>
              <td className={td}>{d.sandboxName}</td>
              <td className={`${td} text-gray-600`}>{d.deployedByName || '—'}</td>
              <td className={td}>
                <button type="button" className="text-[var(--p-accent)] hover:underline" onClick={() => setOpen(d)}>
                  {d.items.length} change(s)
                </button>
              </td>
              <td className={td}>
                {d.status === 'succeeded' ? <Badge tone="green">Succeeded</Badge> : d.status === 'failed' ? <Badge tone="red">Failed (reverted)</Badge> : <Badge>Rolled back</Badge>}
              </td>
              <td className={`${td} text-right`}>
                {d._id === latestSucceeded && (
                  <button type="button" className="text-xs text-red-600 hover:underline disabled:opacity-50" disabled={busy === d._id} onClick={() => rollback(d)}>
                    {busy === d._id ? 'Rolling back…' : 'Roll back'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {open && (
        <Modal open onClose={() => setOpen(null)} size="lg" title={`Deployment from ${open.sandboxName}`}>
          <h3 className="text-sm font-semibold mb-1">Changes</h3>
          <ul className="text-sm space-y-0.5 mb-4">
            {open.items.map((i) => (
              <li key={itemId(i)}>
                <Badge tone={i.action === 'add' ? 'green' : i.action === 'change' ? 'blue' : 'red'}>{i.action}</Badge> {COMPONENT_LABELS[i.type] || i.type}: {i.label}
              </li>
            ))}
          </ul>
          <h3 className="text-sm font-semibold mb-1">Log</h3>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 whitespace-pre-wrap">{open.log.join('\n')}</pre>
        </Modal>
      )}
    </div>
  );
}
