'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Case = {
  _id: string;
  caseNumber: string;
  subject: string;
  status: string;
  priority: string;
  origin: string;
  type?: string;
  accountName?: string;
  contactName?: string;
  contactEmail?: string;
  ownerName?: string;
  slaDueAt?: string;
  createdAt: string;
};

const STATUSES = ['New', 'Working', 'Escalated', 'Pending Customer', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const ORIGINS = ['Email', 'Phone', 'Web', 'Chat', 'Social', 'Portal'];
const TYPES = ['Question', 'Problem', 'Feature Request', 'Incident'];

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-blue-100 text-blue-800',
  High: 'bg-amber-100 text-amber-900',
  Critical: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Working: 'bg-amber-100 text-amber-900',
  Escalated: 'bg-red-100 text-red-800',
  'Pending Customer': 'bg-purple-100 text-purple-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-gray-100 text-gray-700',
};

export default function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Case>>({
    priority: 'Medium',
    origin: 'Web',
    status: 'New',
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    const data = await fetch(`/api/sales-service/cases?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter, priorityFilter]);

  const save = async () => {
    if (!form.subject) return;
    await fetch('/api/sales-service/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ priority: 'Medium', origin: 'Web', status: 'New' });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/sales-service/cases', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this case?')) return;
    await fetch(`/api/sales-service/cases?id=${id}`, { method: 'DELETE' });
    load();
  };

  const isBreached = (c: Case) =>
    c.slaDueAt && !['Resolved', 'Closed'].includes(c.status) && new Date(c.slaDueAt) < new Date();

  return (
    <>
      <PageHeader
        title="Cases"
        subtitle="Service Console"
        count={items.length}
        actions={
          <>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + New Case
            </button>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Case #</th>
                <th className="text-left px-4 py-2.5">Subject</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Priority</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Origin</th>
                <th className="text-left px-4 py-2.5">SLA</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No cases yet.</td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{c.caseNumber}</td>
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">{c.subject}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.accountName || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${PRIORITY_COLORS[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={c.status}
                        onChange={(e) => updateStatus(c._id, e.target.value)}
                        className={`text-xs border-0 rounded px-2 py-0.5 ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{c.origin}</td>
                    <td className="px-4 py-2.5">
                      {c.slaDueAt ? (
                        <span className={`text-xs ${isBreached(c) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {isBreached(c) ? '⚠ Breached' : new Date(c.slaDueAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => remove(c._id)} className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Case"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">
              Cancel
            </button>
            <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">
              Save
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Subject" required>
              <TextInput value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
          </div>
          <Field label="Priority">
            <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Origin">
            <SelectInput value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>
              {ORIGINS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Type">
            <SelectInput value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="">—</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Contact Name">
            <TextInput value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Contact Email">
            <TextInput type="email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={4} onChange={(e) => setForm({ ...form, ...({ description: e.target.value } as any) })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
