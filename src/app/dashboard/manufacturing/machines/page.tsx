'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type Machine = {
  _id: string;
  machineCode: string;
  name: string;
  type: string;
  department: string;
  location: string;
  status: string;
  manufacturer?: string;
  serialNumber?: string;
  hoursOperated: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  createdAt?: string;
};

const STATUSES = ['Operational', 'Under Maintenance', 'Idle', 'Decommissioned'];

const STATUS_TONE: Record<string, any> = {
  Operational: 'green',
  'Under Maintenance': 'amber',
  Idle: 'gray',
  Decommissioned: 'red',
};

function emptyForm() {
  return {
    name: '',
    type: '',
    department: '',
    location: '',
    status: 'Operational',
    manufacturer: '',
    serialNumber: '',
    hoursOperated: 0,
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
  };
}

export default function MachinesPage() {
  const [items, setItems] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (deptFilter) params.set('department', deptFilter);
    const data = await fetch(`/api/manufacturing/machines?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, deptFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (m: Machine) => {
    setEditing(m);
    setForm({
      ...m,
      lastMaintenanceDate: m.lastMaintenanceDate ? m.lastMaintenanceDate.slice(0, 10) : '',
      nextMaintenanceDate: m.nextMaintenanceDate ? m.nextMaintenanceDate.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      hoursOperated: Number(form.hoursOperated) || 0,
    };
    let res: Response;
    if (editing) {
      res = await fetch('/api/manufacturing/machines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      res = await fetch('/api/manufacturing/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not save');
      return;
    }
    setOpen(false);
    setForm(emptyForm());
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this machine?')) return;
    const res = await fetch(`/api/manufacturing/machines?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not delete');
      return;
    }
    load();
  };

  return (
    <>
      <PageHeader
        title="Machines"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search name, code..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <input
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Filter department..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <PrimaryButton onClick={startCreate}>+ New Machine</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">Code</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Department</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Hours</th>
                <th className="text-left px-4 py-2.5">Next Maint</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">No machines yet.</td></tr>
              ) : items.map((m) => (
                <tr key={m._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{m.machineCode}</td>
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">{m.name}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{m.type || '—'}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{m.department || '—'}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[m.status] || 'gray'}>{m.status}</Badge></td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">{m.hoursOperated?.toLocaleString() || 0}</td>
                  <td className="px-4 py-2 text-[#6B7280]">
                    {m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(m)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(m._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New Machine'}
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <TextInput value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </Field>
          <Field label="Department">
            <TextInput value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="Location">
            <TextInput value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Manufacturer">
            <TextInput value={form.manufacturer || ''} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          </Field>
          <Field label="Serial Number">
            <TextInput value={form.serialNumber || ''} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
          </Field>
          <Field label="Hours Operated">
            <TextInput type="number" value={form.hoursOperated} onChange={(e) => setForm({ ...form, hoursOperated: e.target.value })} />
          </Field>
          <Field label="Last Maintenance Date">
            <TextInput type="date" value={form.lastMaintenanceDate || ''} onChange={(e) => setForm({ ...form, lastMaintenanceDate: e.target.value })} />
          </Field>
          <Field label="Next Maintenance Date">
            <TextInput type="date" value={form.nextMaintenanceDate || ''} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
