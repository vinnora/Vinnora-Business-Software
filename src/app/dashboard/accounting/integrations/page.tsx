'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
} from '../_components/ui';

type Integration = {
  _id: string;
  name: string;
  type: string;
  active: boolean;
  config: any;
  events?: string[];
  callCount: number;
  lastUsedAt?: string;
};

const TYPES = [
  { value: 'webhook', label: 'Outbound Webhook', desc: 'POST events to your URL' },
  { value: 'api-token', label: 'API Token', desc: 'Generate access token for external apps' },
  { value: 'bank-feed', label: 'Bank Feed', desc: 'Auto-import bank statements' },
  { value: 'tally', label: 'Tally', desc: 'Sync with Tally ERP' },
  { value: 'zoho', label: 'Zoho Books', desc: 'Sync with Zoho' },
  { value: 'quickbooks', label: 'QuickBooks', desc: 'Sync with QuickBooks Online' },
];

const EVENTS = [
  'transaction.created',
  'invoice.created',
  'invoice.paid',
  'bill.created',
  'bill.paid',
  'payroll.processed',
  'asset.disposed',
];

export default function IntegrationsPage() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'webhook', active: true, config: {}, events: [] });

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/accounting/integrations').then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/accounting/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ type: 'webhook', active: true, config: {}, events: [] });
    load();
  };

  const toggle = async (item: Integration) => {
    await fetch('/api/accounting/integrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: item._id, active: !item.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this integration?')) return;
    await fetch(`/api/accounting/integrations?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Integrations"
        subtitle="External Systems"
        count={items.length}
        actions={<PrimaryButton onClick={() => setOpen(true)}>+ New Integration</PrimaryButton>}
      />

      <div className="p-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded p-4 mb-4 text-sm">
          <strong>Base API:</strong> All accounting endpoints are at{' '}
          <code className="text-xs bg-white px-1 py-0.5 rounded">/api/accounting/...</code>
          {' '}— transactions, invoices, bills, payroll, budgets, projects, assets, taxes, reports, integrations, chart-of-accounts, general-ledger.
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border rounded p-8 text-center text-gray-500">
            No integrations yet. Connect external systems to sync your accounting data.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((i) => {
              const meta = TYPES.find((t) => t.value === i.type);
              return (
                <div key={i._id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{i.name}</h3>
                        <Badge tone={i.active ? 'green' : 'gray'}>{i.active ? 'active' : 'disabled'}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{meta?.label || i.type}</div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => toggle(i)} className="text-gray-600 hover:text-gray-900">
                        {i.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => remove(i._id)} className="text-red-600">Delete</button>
                    </div>
                  </div>
                  {i.config?.url && (
                    <div className="text-xs text-gray-600 truncate font-mono">{i.config.url}</div>
                  )}
                  {i.config?.token && (
                    <div className="text-xs text-gray-600 font-mono break-all bg-gray-50 p-2 rounded mt-2">
                      {i.config.token}
                    </div>
                  )}
                  {i.events && i.events.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {i.events.map((e) => (
                        <span key={e} className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-2">
                    {i.callCount} calls{i.lastUsedAt ? ` • last ${new Date(i.lastUsedAt).toLocaleString()}` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Integration"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <Field label="Name" required>
          <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Type" required>
          <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </SelectInput>
        </Field>
        {form.type === 'webhook' && (
          <>
            <Field label="Webhook URL" required>
              <TextInput
                value={form.config?.url || ''}
                onChange={(e) => setForm({ ...form, config: { ...form.config, url: e.target.value } })}
                placeholder="https://your-server.com/hook"
              />
            </Field>
            <Field label="Subscribe to events">
              <div className="flex flex-wrap gap-2 text-sm">
                {EVENTS.map((e) => (
                  <label key={e} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={form.events.includes(e)}
                      onChange={(ev) =>
                        setForm({
                          ...form,
                          events: ev.target.checked
                            ? [...form.events, e]
                            : form.events.filter((x: string) => x !== e),
                        })
                      }
                    />
                    {e}
                  </label>
                ))}
              </div>
            </Field>
          </>
        )}
        {form.type === 'api-token' && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
            A secure API token will be generated on save. Include it in the{' '}
            <code className="bg-white px-1 rounded">Authorization: Bearer …</code> header.
          </div>
        )}
        {form.type === 'bank-feed' && (
          <>
            <Field label="Bank Name">
              <TextInput
                value={form.config?.bankName || ''}
                onChange={(e) => setForm({ ...form, config: { ...form.config, bankName: e.target.value } })}
              />
            </Field>
            <Field label="Account Number">
              <TextInput
                value={form.config?.accountNumber || ''}
                onChange={(e) => setForm({ ...form, config: { ...form.config, accountNumber: e.target.value } })}
              />
            </Field>
          </>
        )}
        {(form.type === 'tally' || form.type === 'zoho' || form.type === 'quickbooks') && (
          <>
            <Field label="API Endpoint">
              <TextInput
                value={form.config?.endpoint || ''}
                onChange={(e) => setForm({ ...form, config: { ...form.config, endpoint: e.target.value } })}
              />
            </Field>
            <Field label="API Key">
              <TextInput
                value={form.config?.apiKey || ''}
                onChange={(e) => setForm({ ...form, config: { ...form.config, apiKey: e.target.value } })}
              />
            </Field>
          </>
        )}
      </Modal>
    </>
  );
}
