'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge, Tile, fmtINR,
} from '../_components/ui';

type WorkOrder = {
  _id: string;
  workOrderNumber: string;
  productName: string;
  productId?: string;
  bomId?: string;
  quantity: number;
  completedQty: number;
  unit: string;
  status: string;
  priority: string;
  startDate?: string;
  dueDate?: string;
  assignedToName?: string;
  department?: string;
  notes?: string;
  createdAt?: string;
};

const STATUSES = ['Draft', 'Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

const STATUS_TONE: Record<string, any> = {
  Draft: 'gray',
  Planned: 'blue',
  'In Progress': 'amber',
  'On Hold': 'purple',
  Completed: 'green',
  Cancelled: 'red',
};

const PRIORITY_TONE: Record<string, any> = {
  Low: 'gray',
  Normal: 'blue',
  High: 'amber',
  Urgent: 'red',
};

function emptyForm() {
  return {
    productName: '',
    quantity: 0,
    completedQty: 0,
    unit: 'pcs',
    status: 'Draft',
    priority: 'Normal',
    startDate: '',
    dueDate: '',
    assignedToName: '',
    department: '',
    notes: '',
  };
}

export default function WorkOrdersPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    const data = await fetch(`/api/manufacturing/work-orders?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (wo: WorkOrder) => {
    setEditing(wo);
    setForm({
      ...wo,
      startDate: wo.startDate ? wo.startDate.slice(0, 10) : '',
      dueDate: wo.dueDate ? wo.dueDate.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.productName || !form.quantity) return;
    const payload = {
      ...form,
      quantity: Number(form.quantity) || 0,
      completedQty: Number(form.completedQty) || 0,
    };
    let res: Response;
    if (editing) {
      res = await fetch('/api/manufacturing/work-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      res = await fetch('/api/manufacturing/work-orders', {
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
    if (!confirm('Delete this work order?')) return;
    const res = await fetch(`/api/manufacturing/work-orders?id=${id}`, { method: 'DELETE' });
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
        title="Work Orders"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search WO#, product..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <SelectInput value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Work Order</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">WO#</th>
                <th className="text-left px-4 py-2.5">Product</th>
                <th className="text-right px-4 py-2.5">Qty</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Priority</th>
                <th className="text-left px-4 py-2.5">Assigned</th>
                <th className="text-left px-4 py-2.5">Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">No work orders yet.</td></tr>
              ) : items.map((wo) => (
                <tr key={wo._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{wo.workOrderNumber}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{wo.productName}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">
                    <span className={wo.completedQty >= wo.quantity ? 'text-green-700' : ''}>
                      {wo.completedQty || 0}
                    </span>
                    <span className="text-[#6B7280]">/{wo.quantity}</span>
                  </td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[wo.status] || 'gray'}>{wo.status}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={PRIORITY_TONE[wo.priority] || 'gray'}>{wo.priority}</Badge></td>
                  <td className="px-4 py-2 text-[#4A4E54]">{wo.assignedToName || '—'}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(wo)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(wo._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? `Edit ${editing.workOrderNumber}` : 'New Work Order'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product Name" required>
            <TextInput value={form.productName || ''} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Quantity" required>
            <TextInput type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Unit">
            <TextInput value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Priority">
            <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </SelectInput>
          </Field>
          <Field label="Start Date">
            <TextInput type="date" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Due Date">
            <TextInput type="date" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="Assigned To">
            <TextInput value={form.assignedToName || ''} onChange={(e) => setForm({ ...form, assignedToName: e.target.value })} />
          </Field>
          <Field label="Department">
            <TextInput value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}
