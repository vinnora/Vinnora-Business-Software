'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Lead = {
  _id: string;
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  status: string;
  rating?: string;
  leadSource?: string;
  industry?: string;
};

const STATUSES = ['New', 'Working', 'Nurturing', 'Qualified', 'Unqualified', 'Converted'];
const RATINGS = ['Hot', 'Warm', 'Cold'];
const SOURCES = ['Web', 'Phone Inquiry', 'Referral', 'Partner', 'Trade Show', 'Email', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-800',
  Working: 'bg-amber-100 text-amber-800',
  Nurturing: 'bg-purple-100 text-purple-800',
  Qualified: 'bg-green-100 text-green-800',
  Unqualified: 'bg-gray-100 text-gray-700',
  Converted: 'bg-emerald-200 text-emerald-900',
};

export default function LeadsPage() {
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Lead>>({ status: 'New' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/sales-service/leads?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const save = async () => {
    if (!form.firstName || !form.lastName) return;
    await fetch('/api/sales-service/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ status: 'New' });
    load();
  };

  const convert = async (leadId: string, name: string) => {
    if (!confirm(`Convert ${name} to Account + Contact + Opportunity?`)) return;
    await fetch('/api/sales-service/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'convert', leadId }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/sales-service/leads?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded"
            />
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + New Lead
            </button>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Company</th>
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Rating</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-left px-4 py-2.5">Email</th>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No leads yet.</td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      {l.firstName} {l.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.company || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.title || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded ${STATUS_COLORS[l.status] || 'bg-gray-100'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{l.rating || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.leadSource || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{l.email || '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {l.status !== 'Converted' && (
                        <button
                          onClick={() => convert(l._id, `${l.firstName} ${l.lastName}`)}
                          className="text-xs text-green-700 hover:underline mr-3"
                        >
                          Convert
                        </button>
                      )}
                      <button onClick={() => remove(l._id)} className="text-xs text-red-600 hover:underline">
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
        title="New Lead"
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
          <Field label="First Name" required>
            <TextInput value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last Name" required>
            <TextInput value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Company">
            <TextInput value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </Field>
          <Field label="Title">
            <TextInput value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Rating">
            <SelectInput value={form.rating || ''} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              <option value="">—</option>
              {RATINGS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Lead Source">
            <SelectInput value={form.leadSource || ''} onChange={(e) => setForm({ ...form, leadSource: e.target.value })}>
              <option value="">—</option>
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Industry">
            <TextInput value={form.industry || ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
