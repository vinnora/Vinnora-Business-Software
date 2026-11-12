'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type WorkOrder = {
  _id: string;
  workOrderNumber: string;
  subject: string;
  status: string;
  priority: string;
  accountName?: string;
  contactName?: string;
  contactPhone?: string;
  serviceAddress?: string;
  city?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  technicianId?: string;
  technicianName?: string;
  total: number;
};

type Technician = { _id: string; name: string; skills: string[]; territories: string[]; active: boolean };

const STATUSES = ['New', 'Scheduled', 'Dispatched', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-gray-100 text-gray-700',
  Scheduled: 'bg-blue-100 text-blue-800',
  Dispatched: 'bg-indigo-100 text-indigo-800',
  'In Progress': 'bg-amber-100 text-amber-900',
  'On Hold': 'bg-purple-100 text-purple-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function FieldServicePage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [view, setView] = useState<'board' | 'list' | 'schedule'>('board');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ priority: 'Medium', status: 'New', lineItems: [] });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/sales-service/work-orders?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadTechs = async () => {
    const data = await fetch('/api/sales-service/technicians').then((r) => r.json());
    setTechs(Array.isArray(data) ? data : []);
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { loadTechs(); }, []);

  const save = async () => {
    if (!form.subject) return;
    const tech = techs.find((t) => t._id === form.technicianId);
    await fetch('/api/sales-service/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, technicianName: tech?.name }),
    });
    setOpen(false);
    setForm({ priority: 'Medium', status: 'New', lineItems: [] });
    load();
  };

  const moveStatus = async (id: string, status: string) => {
    setItems((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
    await fetch('/api/sales-service/work-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    load();
  };

  const assignTech = async (id: string, technicianId: string) => {
    const tech = techs.find((t) => t._id === technicianId);
    await fetch('/api/sales-service/work-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, technicianId, technicianName: tech?.name, status: 'Dispatched' }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/sales-service/work-orders?id=${id}`, { method: 'DELETE' });
    load();
  };

  // Schedule view: group by technician
  const byTech = techs.map((t) => ({
    tech: t,
    orders: items.filter((o) => o.technicianId === t._id),
  }));
  const unassigned = items.filter((o) => !o.technicianId);

  return (
    <>
      <PageHeader
        title="Field"
        subtitle="Job Cards & Dispatch"
        count={items.length}
        actions={
          <>
            <div className="border border-gray-300 rounded overflow-hidden flex text-sm">
              {(['board', 'schedule', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 capitalize ${view === v ? 'bg-[#0176d3] text-white' : 'bg-white'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded">
              + New Job Card
            </button>
          </>
        }
      />

      {view === 'board' && (
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {STATUSES.map((status) => {
              const stageItems = items.filter((o) => o.status === status);
              return (
                <div
                  key={status}
                  className="w-64 bg-[#f3f3f3] rounded border-t-4 border-t-[#0176d3]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => draggingId && moveStatus(draggingId, status)}
                >
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{status}</div>
                    <div className="text-xs text-gray-500">{stageItems.length} job cards</div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageItems.map((o) => (
                      <div
                        key={o._id}
                        draggable
                        onDragStart={() => setDraggingId(o._id)}
                        onDragEnd={() => setDraggingId(null)}
                        className="bg-white rounded shadow-sm border border-gray-200 p-3 cursor-move"
                      >
                        <div className="text-xs font-mono text-gray-500">{o.workOrderNumber}</div>
                        <div className="text-sm font-medium text-[#0176d3] truncate">{o.subject}</div>
                        <div className="text-xs text-gray-500 truncate">{o.accountName || '—'}</div>
                        {o.technicianName && (
                          <div className="text-[10px] text-purple-700 mt-1">👷 {o.technicianName}</div>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1">
                          {o.scheduledStart ? new Date(o.scheduledStart).toLocaleDateString() : 'Unscheduled'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'schedule' && (
        <div className="p-6 space-y-4">
          {unassigned.length > 0 && (
            <div className="bg-white border border-gray-200 rounded">
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm font-semibold text-amber-900">
                Unassigned ({unassigned.length})
              </div>
              <div className="p-3 space-y-2">
                {unassigned.map((o) => (
                  <div key={o._id} className="flex items-center justify-between border border-gray-100 rounded p-2">
                    <div>
                      <div className="text-sm font-medium">{o.workOrderNumber} — {o.subject}</div>
                      <div className="text-xs text-gray-500">{o.accountName} • {o.priority}</div>
                    </div>
                    <select
                      value=""
                      onChange={(e) => assignTech(o._id, e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
                    >
                      <option value="">Assign technician…</option>
                      {techs.filter((t) => t.active).map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          {byTech.map(({ tech, orders }) => (
            <div key={tech._id} className="bg-white border border-gray-200 rounded">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0176d3] text-white flex items-center justify-center text-sm font-semibold">
                  {tech.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{tech.name}</div>
                  <div className="text-xs text-gray-500">
                    {orders.length} job cards {tech.skills.length > 0 && `• ${tech.skills.join(', ')}`}
                  </div>
                </div>
              </div>
              {orders.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">No assigned work</div>
              ) : (
                <div className="p-3 space-y-2">
                  {orders.map((o) => (
                    <div key={o._id} className="border border-gray-100 rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{o.workOrderNumber} — {o.subject}</div>
                        <div className="text-xs text-gray-500">
                          {o.accountName} • {o.scheduledStart ? new Date(o.scheduledStart).toLocaleString() : 'TBD'}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5">Job Card #</th>
                  <th className="text-left px-4 py-2.5">Subject</th>
                  <th className="text-left px-4 py-2.5">Company</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Priority</th>
                  <th className="text-left px-4 py-2.5">Technician</th>
                  <th className="text-left px-4 py-2.5">Scheduled</th>
                  <th className="text-right px-4 py-2.5">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No job cards yet.</td></tr>
                ) : (
                  items.map((o) => (
                    <tr key={o._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{o.workOrderNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-[#0176d3]">{o.subject}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.accountName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={o.status}
                          onChange={(e) => moveStatus(o._id, e.target.value)}
                          className={`text-xs border-0 rounded px-2 py-0.5 ${STATUS_COLORS[o.status]}`}
                        >
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{o.priority}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.technicianName || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {o.scheduledStart ? new Date(o.scheduledStart).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">{fmtINR(o.total)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => remove(o._id)} className="text-xs text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Job Card"
        footer={<>
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">Cancel</button>
          <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">Save</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Subject" required>
              <TextInput value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
          </div>
          <Field label="Priority">
            <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Company name">
            <TextInput value={form.accountName || ''} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
          </Field>
          <Field label="Person name">
            <TextInput value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="Person phone">
            <TextInput value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
          <Field label="Technician">
            <SelectInput value={form.technicianId || ''} onChange={(e) => setForm({ ...form, technicianId: e.target.value })}>
              <option value="">— Unassigned —</option>
              {techs.filter((t) => t.active).map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Scheduled Start">
            <TextInput type="datetime-local" value={form.scheduledStart || ''} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} />
          </Field>
          <Field label="Scheduled End">
            <TextInput type="datetime-local" value={form.scheduledEnd || ''} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Service address">
              <TextInput value={form.serviceAddress || ''} onChange={(e) => setForm({ ...form, serviceAddress: e.target.value })} />
            </Field>
          </div>
          <Field label="City">
            <TextInput value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="State">
            <TextInput value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
