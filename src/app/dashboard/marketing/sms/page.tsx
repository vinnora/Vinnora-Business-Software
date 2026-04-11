'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type SmsMsg = { _id: string; name: string; body: string; senderId?: string; status: string; scheduledAt?: string; sentAt?: string; recipientCount: number; metrics: { sent: number; delivered: number; clicked: number; failed: number }; createdAt: string };

const STATUSES = ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Scheduled: 'blue', Sending: 'amber', Sent: 'green', Failed: 'red' };

export default function SmsPage() {
  const [items, setItems] = useState<SmsMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmsMsg | null>(null);
  const [form, setForm] = useState<any>({ name: '', body: '', senderId: '', status: 'Draft' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/sms?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const save = async () => {
    if (!form.name || !form.body) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/marketing/sms', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setOpen(false); setEditing(null); setForm({ name: '', body: '', senderId: '', status: 'Draft' }); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this SMS?')) return;
    await fetch(`/api/marketing/sms?id=${id}`, { method: 'DELETE' }); load();
  };

  const charCount = (form.body || '').length;

  return (
    <>
      <PageHeader title="SMS Marketing" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', body: '', senderId: '', status: 'Draft' }); setOpen(true); }}>+ New SMS</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Preview</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Sent</th>
                <th className="text-right px-4 py-2.5">Delivered</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A8B8]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A8B8]">No SMS messages yet.</td></tr>
              ) : items.map(m => (
                <tr key={m._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                  <td className="px-4 py-2 font-medium text-[#3D5266]">{m.name}</td>
                  <td className="px-4 py-2 text-[#5A7A8C] truncate max-w-[250px]">{m.body}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge></td>
                  <td className="px-4 py-2 text-right">{m.metrics?.sent || 0}</td>
                  <td className="px-4 py-2 text-right">{m.metrics?.delivered || 0}</td>
                  <td className="px-4 py-2 text-xs text-[#94A8B8]">{m.sentAt ? new Date(m.sentAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(m); setForm({ ...m }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(m._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit SMS' : 'Compose SMS'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><TextInput value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Sender ID"><TextInput value={form.senderId || ''} onChange={e => setForm({ ...form, senderId: e.target.value })} placeholder="e.g. VINNORA" /></Field>
        </div>
        <Field label="Status"><SelectInput value={form.status || 'Draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
        <Field label="Message Body" required>
          <TextArea rows={4} value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={640} />
          <div className={`text-xs mt-1 ${charCount > 160 ? 'text-amber-600' : 'text-[#94A8B8]'}`}>{charCount}/160 chars {charCount > 160 ? `(${Math.ceil(charCount / 160)} segments)` : ''}</div>
        </Field>
        <Field label="Scheduled At"><TextInput type="datetime-local" value={form.scheduledAt ? (form.scheduledAt as string).slice(0, 16) : ''} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
