'use client';

import { useMemo, useState } from 'react';
import { APP_LABELS, ALL_APP_KEYS, type AppKey, type ObjectDescribe, type ObjectSummary } from '@/lib/platform/types';
import {
  api,
  Badge,
  Btn,
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
  td,
  th,
  useLoad,
  type PlatformTheme,
} from './ui';
import { FieldsPanel } from './FieldsPanel';
import { RestrictionRulesPanel, ValidationRulesPanel } from './RulesPanels';
import { LayoutAssignmentPanel, LayoutsPanel } from './LayoutsPanel';

export type ObjectDetail = ObjectDescribe & {
  counts: { validationRules: number; restrictionRules: number; layouts: number; records?: number };
};

/** Object Manager — list of objects for one app (or all apps) and their configuration. */
export function ObjectManager({ app, theme }: { app?: AppKey; theme?: PlatformTheme }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ThemeScope theme={theme}>
      {selected ? (
        <ObjectDetailView apiName={selected} onBack={() => setSelected(null)} />
      ) : (
        <ObjectList app={app} onOpen={setSelected} />
      )}
    </ThemeScope>
  );
}

function ObjectList({ app, onOpen }: { app?: AppKey; onOpen: (api: string) => void }) {
  const [query, setQuery] = useState('');
  const [appFilter, setAppFilter] = useState<AppKey | ''>('');
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useLoad(
    () => api<ObjectSummary[]>(`/api/platform/objects${app ? `?app=${app}` : ''}`),
    [app],
  );

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return (data || []).filter(
      (o) =>
        (!appFilter || o.app === appFilter) &&
        (!q || o.label.toLowerCase().includes(q) || o.apiName.toLowerCase().includes(q)),
    );
  }, [data, query, appFilter]);

  return (
    <div>
      <SectionTitle
        title="Object Manager"
        subtitle="Customise built-in objects and create your own: fields, validation rules, restriction rules and page layouts."
        actions={
          <>
            <Input className="!w-48" placeholder="Quick find…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {!app && (
              <Select className="!w-44" value={appFilter} onChange={(e) => setAppFilter(e.target.value as AppKey | '')}>
                <option value="">All apps</option>
                {ALL_APP_KEYS.map((a) => (
                  <option key={a} value={a}>
                    {APP_LABELS[a]}
                  </option>
                ))}
              </Select>
            )}
            <Btn variant="primary" onClick={() => setCreating(true)}>
              + New Custom Object
            </Btn>
          </>
        }
      />
      <ErrorBanner error={error} />
      {loading && !data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>No objects match.</Empty>
      ) : (
        <Table
          head={
            <tr>
              <th className={th}>Label</th>
              <th className={th}>API Name</th>
              {!app && <th className={th}>App</th>}
              <th className={th}>Type</th>
              <th className={th}>Custom Fields</th>
              <th className={th}>Enforcement</th>
            </tr>
          }
        >
          {rows.map((o) => (
            <tr key={o.apiName} className="hover:bg-gray-50 cursor-pointer" onClick={() => onOpen(o.apiName)}>
              <td className={td}>
                <span className="font-medium text-[var(--p-accent)]">{o.label}</span>
                {o.description && <div className="text-xs text-gray-500">{o.description}</div>}
              </td>
              <td className={`${td} font-mono text-xs text-gray-600`}>{o.apiName}</td>
              {!app && <td className={`${td} text-gray-600`}>{APP_LABELS[o.app]}</td>}
              <td className={td}>{o.isCustom ? <Badge tone="accent">Custom</Badge> : <Badge>Standard</Badge>}</td>
              <td className={`${td} text-gray-600`}>{o.customFieldCount || 0}</td>
              <td className={td}>
                {o.enforced ? (
                  <Badge tone="green">Active</Badge>
                ) : (
                  <span title="Setup is saved now and starts applying when this module's record pages are connected to the platform.">
                    <Badge tone="amber">Setup only</Badge>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <p className="text-xs text-gray-500 mt-3">
        <Badge tone="green">Active</Badge> objects apply permissions, field-level security, validation rules, restriction rules and page layouts on every
        save and list. <Badge tone="amber">Setup only</Badge> objects store your configuration now; it takes effect when their module is connected.
      </p>
      <NewObjectModal
        open={creating}
        defaultApp={app}
        onClose={() => setCreating(false)}
        onCreated={(apiName) => {
          setCreating(false);
          reload();
          onOpen(apiName);
        }}
      />
    </div>
  );
}

function NewObjectModal({
  open,
  defaultApp,
  onClose,
  onCreated,
}: {
  open: boolean;
  defaultApp?: AppKey;
  onClose: () => void;
  onCreated: (apiName: string) => void;
}) {
  const [form, setForm] = useState({ label: '', pluralLabel: '', nameFieldLabel: '', description: '', app: defaultApp || 'sales-service' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const obj = await api<{ apiName: string }>('/api/platform/objects', { body: form });
      setForm({ label: '', pluralLabel: '', nameFieldLabel: '', description: '', app: defaultApp || 'sales-service' });
      onCreated(obj.apiName);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Custom Object"
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving || !form.label}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
        </>
      }
    >
      <ErrorBanner error={error} />
      <div className="grid sm:grid-cols-2 gap-x-4">
        <FormField label="Label" required help="Singular name, e.g. Vehicle">
          <Input
            value={form.label}
            onChange={(e) =>
              setForm({
                ...form,
                label: e.target.value,
                pluralLabel: !form.pluralLabel || form.pluralLabel === `${form.label}s` ? `${e.target.value}s` : form.pluralLabel,
              })
            }
          />
        </FormField>
        <FormField label="Plural Label" required>
          <Input value={form.pluralLabel} onChange={(e) => setForm({ ...form, pluralLabel: e.target.value })} />
        </FormField>
        <FormField label="Record Name Label" help="Label of the record's name field">
          <Input
            value={form.nameFieldLabel}
            placeholder={form.label ? `${form.label} Name` : 'Name'}
            onChange={(e) => setForm({ ...form, nameFieldLabel: e.target.value })}
          />
        </FormField>
        <FormField label="App" required help="The object appears as a tab in this app">
          <Select value={form.app} disabled={Boolean(defaultApp)} onChange={(e) => setForm({ ...form, app: e.target.value as AppKey })}>
            {ALL_APP_KEYS.map((a) => (
              <option key={a} value={a}>
                {APP_LABELS[a]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      <FormField label="Description">
        <TextArea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      {form.label && (
        <div className="text-xs text-gray-500">
          API name: <span className="font-mono">{form.label.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}__c</span>
        </div>
      )}
    </Modal>
  );
}

type DetailTab = 'details' | 'fields' | 'validation' | 'restriction' | 'layouts' | 'assignment';

function ObjectDetailView({ apiName, onBack }: { apiName: string; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>('fields');
  const { data: obj, error, loading, reload } = useLoad(() => api<ObjectDetail>(`/api/platform/objects/${apiName}`), [apiName]);

  return (
    <div>
      <button type="button" onClick={onBack} className="text-sm text-[var(--p-accent)] hover:underline mb-2">
        ← Object Manager
      </button>
      <ErrorBanner error={error} />
      {loading && !obj ? (
        <Loading />
      ) : obj ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-semibold text-[var(--p-text)]">{obj.label}</h2>
            {obj.isCustom ? <Badge tone="accent">Custom</Badge> : <Badge>Standard</Badge>}
            {obj.enforced ? <Badge tone="green">Enforcement active</Badge> : <Badge tone="amber">Setup only</Badge>}
          </div>
          <div className="text-xs text-gray-500 font-mono mb-4">{obj.apiName}</div>
          <Tabs<DetailTab>
            active={tab}
            onChange={setTab}
            tabs={[
              { id: 'details', label: 'Details' },
              { id: 'fields', label: 'Fields & Relationships', count: obj.fields.length },
              { id: 'validation', label: 'Validation Rules', count: obj.counts.validationRules },
              { id: 'restriction', label: 'Restriction Rules', count: obj.counts.restrictionRules },
              { id: 'layouts', label: 'Page Layouts', count: obj.counts.layouts },
              { id: 'assignment', label: 'Layout Assignment' },
            ]}
          />
          <div className="pt-4">
            {tab === 'details' && <DetailsPanel obj={obj} onChanged={reload} onDeleted={onBack} />}
            {tab === 'fields' && <FieldsPanel obj={obj} onChanged={reload} />}
            {tab === 'validation' && <ValidationRulesPanel obj={obj} onChanged={reload} />}
            {tab === 'restriction' && <RestrictionRulesPanel obj={obj} onChanged={reload} />}
            {tab === 'layouts' && <LayoutsPanel obj={obj} onChanged={reload} />}
            {tab === 'assignment' && <LayoutAssignmentPanel obj={obj} />}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DetailsPanel({ obj, onChanged, onDeleted }: { obj: ObjectDetail; onChanged: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState({ label: obj.label, pluralLabel: obj.pluralLabel, description: obj.description || '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');

  const save = async () => {
    setError(null);
    try {
      await api(`/api/platform/objects/${obj.apiName}`, { method: 'PATCH', body: form });
      setSaved(true);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const remove = async () => {
    try {
      await api(`/api/platform/objects/${obj.apiName}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const facts: [string, React.ReactNode][] = [
    ['API Name', <span key="a" className="font-mono">{obj.apiName}</span>],
    ['App', APP_LABELS[obj.app]],
    ['Record name', obj.nameFields.join(' + ')],
    ['Custom fields', obj.supportsCustomFields ? 'Supported' : 'Not yet supported on this object'],
    ['Records', obj.counts.records ?? '—'],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="bg-white border border-[var(--p-border)] rounded p-4">
        <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-y-2 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-gray-900">{v}</dd>
            </div>
          ))}
        </dl>
        {!obj.enforced && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-4">
            This object&apos;s record pages aren&apos;t connected to the platform yet. Everything you configure here is saved and will apply as soon as
            they are. Sales &amp; Service objects and all custom objects are already connected.
          </p>
        )}
      </div>
      {obj.isCustom && (
        <div className="bg-white border border-[var(--p-border)] rounded p-4">
          <ErrorBanner error={error} />
          <FormField label="Label">
            <Input value={form.label} onChange={(e) => (setSaved(false), setForm({ ...form, label: e.target.value }))} />
          </FormField>
          <FormField label="Plural Label">
            <Input value={form.pluralLabel} onChange={(e) => (setSaved(false), setForm({ ...form, pluralLabel: e.target.value }))} />
          </FormField>
          <FormField label="Description">
            <TextArea rows={2} value={form.description} onChange={(e) => (setSaved(false), setForm({ ...form, description: e.target.value }))} />
          </FormField>
          <div className="flex items-center gap-3">
            <Btn variant="primary" onClick={save}>
              Save
            </Btn>
            {saved && <span className="text-xs text-green-700">Saved</span>}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-sm font-medium text-red-700">Delete object</div>
            <p className="text-xs text-gray-500 mb-2">
              Deletes the object, its fields, rules, layouts and all {obj.counts.records ?? 0} record(s). Type <b>{obj.apiName}</b> to confirm.
            </p>
            <div className="flex gap-2">
              <Input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder={obj.apiName} />
              <Btn variant="danger" disabled={confirmDelete !== obj.apiName} onClick={remove}>
                Delete
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
