'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge, fmtINR,
} from '../_components/ui';

type PRItem = {
  materialName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  supplierName: string;
};

type PurchaseRequisition = {
  _id: string;
  requisitionNumber: string;
  requestedBy: string;
  department: string;
  status: string;
  items: PRItem[];
  totalEstimatedCost: number;
  requiredByDate: string;
  approvedBy: string;
  notes: string;
  createdAt: string;
};

const STATUSES = ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received', 'Cancelled'];
const STATUS_TONE: Record<string, any> = {
  Draft: 'gray',
  Submitted: 'blue',
  Approved: 'green',
  Ordered: 'amber',
  Received: 'purple',
  Cancelled: 'red',
};

function emptyItem(): PRItem {
  return { materialName: '', quantity: 0, unit: '', estimatedCost: 0, supplierName: '' };
}

function emptyForm() {
  return {
    requestedBy: '',
    department: '',
    status: 'Draft',
    requiredByDate: '',
    notes: '',
    items: [emptyItem()],
  };
}

export default function PurchaseRequisitionsPage() {
  const [items, setItems] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseRequisition | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (deptFilter) params.set('department', deptFilter);
    const data = await fetch(`/api/manufacturing/purchase-requisitions?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, deptFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (pr: PurchaseRequisition) => {
    setEditing(pr);
    setForm({
      ...pr,
      requiredByDate: pr.requiredByDate ? pr.requiredByDate.slice(0, 10) : '',
      items: pr.items && pr.items.length > 0 ? pr.items : [emptyItem()],
    });
    setOpen(true);
  };

  const calcTotal = (rows: PRItem[]) =>
    rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.estimatedCost) || 0), 0);

  const save = async () => {
    if (!form.requestedBy) return;
    const lineItems = (form.items || []).filter((i: PRItem) => i.materialName);
    const payload = {
      ...form,
      items: lineItems.map((i: PRItem) => ({
        ...i,
        quantity: Number(i.quantity) || 0,
        estimatedCost: Number(i.estimatedCost) || 0,
      })),
      totalEstimatedCost: calcTotal(lineItems),
    };
    if (editing) {
      await fetch('/api/manufacturing/purchase-requisitions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/manufacturing/purchase-requisitions', {
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
    if (!confirm('Delete this purchase requisition?')) return;
    await fetch(`/api/manufacturing/purchase-requisitions?id=${id}`, { method: 'DELETE' });
    load();
  };

  const updateItem = (idx: number, patch: Partial<PRItem>) => {
    const updated = form.items.map((item: PRItem, i: number) => (i === idx ? { ...item, ...patch } : item));
    setForm({ ...form, items: updated });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });

  const removeItem = (idx: number) => {
    const updated = form.items.filter((_: PRItem, i: number) => i !== idx);
    setForm({ ...form, items: updated.length > 0 ? updated : [emptyItem()] });
  };

  return (
    <>
      <PageHeader
        title="Purchase Requisitions"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
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
            <PrimaryButton onClick={startCreate}>+ New PR</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">PR#</th>
                <th className="text-left px-4 py-2.5">Requested By</th>
                <th className="text-left px-4 py-2.5">Dept</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Items</th>
                <th className="text-right px-4 py-2.5">Est Cost</th>
                <th className="text-left px-4 py-2.5">Required By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">No purchase requisitions yet.</td></tr>
              ) : items.map((pr) => (
                <tr key={pr._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{pr.requisitionNumber}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{pr.requestedBy}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{pr.department || '—'}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[pr.status] || 'gray'}>{pr.status}</Badge></td>
                  <td className="px-4 py-2 text-right text-[#4A4E54]">{pr.items?.length || 0}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">{fmtINR(pr.totalEstimatedCost)}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{pr.requiredByDate ? new Date(pr.requiredByDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(pr)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(pr._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? `Edit ${editing.requisitionNumber}` : 'New Purchase Requisition'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Requested By" required>
            <TextInput value={form.requestedBy || ''} onChange={(e) => setForm({ ...form, requestedBy: e.target.value })} />
          </Field>
          <Field label="Department">
            <TextInput value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Required By Date">
            <TextInput type="date" value={form.requiredByDate || ''} onChange={(e) => setForm({ ...form, requiredByDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {/* Items section */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">Line Items</h3>
          <button onClick={addItem} className="text-xs text-[#D4A843] hover:underline">+ Add Item</button>
        </div>
        <div className="border border-[#E5E7EB] rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-3 py-2">Material</th>
                <th className="text-left px-3 py-2 w-20">Qty</th>
                <th className="text-left px-3 py-2 w-20">Unit</th>
                <th className="text-left px-3 py-2 w-28">Est Cost</th>
                <th className="text-left px-3 py-2">Supplier</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(form.items || []).map((item: PRItem, idx: number) => (
                <tr key={idx} className="border-t border-[#E5E7EB]">
                  <td className="px-3 py-1.5">
                    <input
                      value={item.materialName}
                      onChange={(e) => updateItem(idx, { materialName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="Material name"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="kg"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      value={item.estimatedCost}
                      onChange={(e) => updateItem(idx, { estimatedCost: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={item.supplierName}
                      onChange={(e) => updateItem(idx, { supplierName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="Supplier"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => removeItem(idx)} className="text-red-500 text-xs hover:text-red-700">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-right text-sm font-medium text-[#1C1C1E]">
          Total: {fmtINR(calcTotal(form.items || []))}
        </div>
      </Modal>
    </>
  );
}
