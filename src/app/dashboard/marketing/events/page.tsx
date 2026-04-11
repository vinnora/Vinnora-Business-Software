'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge, fmtINR } from '../_components/ui';

type MktEvent = { _id: string; name: string; description?: string; type: string; status: string; venue?: string; isOnline: boolean; meetingUrl?: string; startDate: string; endDate: string; capacity?: number; ticketPrice?: number; registrationCount: number; attendeeCount: number; createdAt: string };

const TYPES = ['Webinar', 'Conference', 'Workshop', 'Meetup', 'Trade Show', 'Other'];
const STATUSES = ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Published: 'blue', Ongoing: 'green', Completed: 'purple', Cancelled: 'red' };

export default function EventsPage() {
  const [items, setItems] = useState<MktEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MktEvent | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return { name: '', description: '', type: 'Other', status: 'Draft', venue: '', isOnline: false, meetingUrl: '', startDate: '', endDate: '', capacity: '', ticketPrice: '' };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/events?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter, statusFilter]);

  const save = async () => {
    if (!form.name || !form.startDate || !form.endDate) return;
    const payload = { ...form, capacity: Number(form.capacity) || undefined, ticketPrice: Number(form.ticketPrice) || 0 };
    const method = editing ? 'PATCH' : 'POST';
    const body = editing ? { _id: editing._id, ...payload } : payload;
    await fetch('/api/marketing/events', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/marketing/events?id=${id}`, { method: 'DELETE' }); load();
  };

  return (
    <>
      <PageHeader title="Events" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <SelectInput value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput>
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Event</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Venue</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-right px-4 py-2.5">Registrations</th>
                <th className="text-right px-4 py-2.5">Ticket</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">No events yet.</td></tr>
              ) : items.map(e => (
                <tr key={e._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#3D5266]">{e.name}</div>
                    {e.isOnline && <span className="text-[10px] text-[#94A8B8]">Online</span>}
                  </td>
                  <td className="px-4 py-2 text-[#5A7A8C]">{e.type}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></td>
                  <td className="px-4 py-2 text-[#5A7A8C] text-xs">{e.venue || (e.isOnline ? 'Online' : '—')}</td>
                  <td className="px-4 py-2 text-xs text-[#5A7A8C]">{new Date(e.startDate).toLocaleDateString()} – {new Date(e.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{e.registrationCount}{e.capacity ? ` / ${e.capacity}` : ''}</td>
                  <td className="px-4 py-2 text-right">{e.ticketPrice ? fmtINR(e.ticketPrice) : 'Free'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(e); setForm({ ...e, startDate: e.startDate.slice(0, 10), endDate: e.endDate.slice(0, 10), capacity: e.capacity || '', ticketPrice: e.ticketPrice || '' }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(e._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Event' : 'New Event'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Event Name" required><TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type"><SelectInput value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Venue"><TextInput value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="Start Date" required><TextInput type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>
          <Field label="End Date" required><TextInput type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></Field>
          <Field label="Capacity"><TextInput type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></Field>
          <Field label="Ticket Price (INR)"><TextInput type="number" value={form.ticketPrice} onChange={e => setForm({ ...form, ticketPrice: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-2 my-3">
          <input type="checkbox" checked={form.isOnline} onChange={e => setForm({ ...form, isOnline: e.target.checked })} className="rounded" />
          <span className="text-sm text-[#5A7A8C]">This is an online event</span>
        </div>
        {form.isOnline && <Field label="Meeting URL"><TextInput value={form.meetingUrl} onChange={e => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://..." /></Field>}
        <Field label="Description"><TextArea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
