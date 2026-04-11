'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type ProductionLog = {
  _id: string;
  workOrderId: string;
  workOrderNumber: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  date: string;
  shiftName: string;
  quantityProduced: number;
  quantityRejected: number;
  downtimeMinutes: number;
  downtimeReason: string;
  cycleTimeMinutes: number;
  notes: string;
  createdAt: string;
};

type WorkOrder = { _id: string; workOrderNumber: string };
type Machine = { _id: string; name: string };

function emptyForm() {
  return {
    workOrderId: '',
    machineId: '',
    operatorName: '',
    date: '',
    shiftName: '',
    quantityProduced: 0,
    quantityRejected: 0,
    downtimeMinutes: 0,
    downtimeReason: '',
    cycleTimeMinutes: 0,
    notes: '',
  };
}

export default function ProductionLogsPage() {
  const [items, setItems] = useState<ProductionLog[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionLog | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const data = await fetch(`/api/manufacturing/production-logs?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch('/api/manufacturing/work-orders').then((r) => r.json()).then((d) => setWorkOrders(Array.isArray(d) ? d : []));
    fetch('/api/manufacturing/machines').then((r) => r.json()).then((d) => setMachines(Array.isArray(d) ? d : []));
  }, []);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (log: ProductionLog) => {
    setEditing(log);
    setForm({
      ...log,
      date: log.date ? log.date.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    const wo = workOrders.find((w) => w._id === form.workOrderId);
    const mc = machines.find((m) => m._id === form.machineId);
    const payload = {
      ...form,
      workOrderNumber: wo?.workOrderNumber || '',
      machineName: mc?.name || '',
      quantityProduced: Number(form.quantityProduced) || 0,
      quantityRejected: Number(form.quantityRejected) || 0,
      downtimeMinutes: Number(form.downtimeMinutes) || 0,
      cycleTimeMinutes: Number(form.cycleTimeMinutes) || 0,
    };
    if (editing) {
      await fetch('/api/manufacturing/production-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/manufacturing/production-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setOpen(false);
    setForm(emptyForm());
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this production log?')) return;
    await fetch(`/api/manufacturing/production-logs?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Production Logs"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search operator, WO#..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <PrimaryButton onClick={startCreate}>+ New Log</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">WO#</th>
                <th className="text-left px-4 py-2.5">Machine</th>
                <th className="text-left px-4 py-2.5">Operator</th>
                <th className="text-left px-4 py-2.5">Shift</th>
                <th className="text-right px-4 py-2.5">Produced</th>
                <th className="text-right px-4 py-2.5">Rejected</th>
                <th className="text-right px-4 py-2.5">Downtime(min)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#6B7280]">No production logs yet.</td></tr>
              ) : items.map((log) => (
                <tr key={log._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 text-[#4A4E54]">{log.date ? new Date(log.date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{log.workOrderNumber || '—'}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{log.machineName || '—'}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{log.operatorName || '—'}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{log.shiftName || '—'}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">{log.quantityProduced}</td>
                  <td className="px-4 py-2 text-right text-red-600">{log.quantityRejected}</td>
                  <td className="px-4 py-2 text-right text-[#6B7280]">{log.downtimeMinutes}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(log)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(log._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? 'Edit Production Log' : 'New Production Log'}
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Work Order">
            <SelectInput value={form.workOrderId || ''} onChange={(e) => setForm({ ...form, workOrderId: e.target.value })}>
              <option value="">— Select —</option>
              {workOrders.map((wo) => <option key={wo._id} value={wo._id}>{wo.workOrderNumber}</option>)}
            </SelectInput>
          </Field>
          <Field label="Machine">
            <SelectInput value={form.machineId || ''} onChange={(e) => setForm({ ...form, machineId: e.target.value })}>
              <option value="">— Select —</option>
              {machines.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Operator Name">
            <TextInput value={form.operatorName || ''} onChange={(e) => setForm({ ...form, operatorName: e.target.value })} />
          </Field>
          <Field label="Date" required>
            <TextInput type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Shift Name">
            <TextInput value={form.shiftName || ''} onChange={(e) => setForm({ ...form, shiftName: e.target.value })} placeholder="e.g. Morning" />
          </Field>
          <Field label="Quantity Produced">
            <TextInput type="number" value={form.quantityProduced} onChange={(e) => setForm({ ...form, quantityProduced: e.target.value })} />
          </Field>
          <Field label="Quantity Rejected">
            <TextInput type="number" value={form.quantityRejected} onChange={(e) => setForm({ ...form, quantityRejected: e.target.value })} />
          </Field>
          <Field label="Downtime (minutes)">
            <TextInput type="number" value={form.downtimeMinutes} onChange={(e) => setForm({ ...form, downtimeMinutes: e.target.value })} />
          </Field>
          <Field label="Downtime Reason">
            <TextInput value={form.downtimeReason || ''} onChange={(e) => setForm({ ...form, downtimeReason: e.target.value })} />
          </Field>
          <Field label="Cycle Time (minutes)">
            <TextInput type="number" value={form.cycleTimeMinutes} onChange={(e) => setForm({ ...form, cycleTimeMinutes: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}
