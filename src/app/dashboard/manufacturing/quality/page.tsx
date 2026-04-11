'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type QualityInspection = {
  _id: string;
  workOrderNumber: string;
  productName: string;
  inspectorName: string;
  inspectionDate: string;
  type: string;
  status: string;
  defectsFound: number;
  defectDescription?: string;
  correctiveAction?: string;
  notes?: string;
  createdAt?: string;
};

const TYPES = ['Incoming', 'In-Process', 'Final', 'Random'];
const STATUSES = ['Pending', 'Passed', 'Failed', 'Conditional'];

const STATUS_TONE: Record<string, any> = {
  Pending: 'amber',
  Passed: 'green',
  Failed: 'red',
  Conditional: 'blue',
};

function emptyForm() {
  return {
    workOrderNumber: '',
    productName: '',
    inspectorName: '',
    inspectionDate: '',
    type: 'Incoming',
    status: 'Pending',
    defectsFound: 0,
    defectDescription: '',
    correctiveAction: '',
    notes: '',
  };
}

export default function QualityPage() {
  const [items, setItems] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualityInspection | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    const data = await fetch(`/api/manufacturing/quality?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (qi: QualityInspection) => {
    setEditing(qi);
    setForm({
      ...qi,
      inspectionDate: qi.inspectionDate ? qi.inspectionDate.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.inspectionDate) return;
    const payload = {
      ...form,
      defectsFound: Number(form.defectsFound) || 0,
    };
    if (editing) {
      await fetch('/api/manufacturing/quality', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/manufacturing/quality', {
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
    if (!confirm('Delete this inspection?')) return;
    await fetch(`/api/manufacturing/quality?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Quality Inspections"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Inspection</PrimaryButton>
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
                <th className="text-left px-4 py-2.5">Inspector</th>
                <th className="text-left px-4 py-2.5">Date</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Defects</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#6B7280]">No inspections yet.</td></tr>
              ) : items.map((qi) => (
                <tr key={qi._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{qi.workOrderNumber || '—'}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{qi.productName || '—'}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{qi.inspectorName || '—'}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{qi.inspectionDate ? new Date(qi.inspectionDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2"><Badge tone="gray">{qi.type}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[qi.status] || 'gray'}>{qi.status}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    <span className={qi.defectsFound > 0 ? 'text-red-600 font-semibold' : 'text-[#1C1C1E]'}>
                      {qi.defectsFound || 0}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(qi)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(qi._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? 'Edit Inspection' : 'New Quality Inspection'}
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Work Order Number">
            <TextInput value={form.workOrderNumber || ''} onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })} />
          </Field>
          <Field label="Product Name">
            <TextInput value={form.productName || ''} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Inspector Name">
            <TextInput value={form.inspectorName || ''} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} />
          </Field>
          <Field label="Inspection Date" required>
            <TextInput type="date" value={form.inspectionDate || ''} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} />
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Defects Found">
            <TextInput type="number" value={form.defectsFound} onChange={(e) => setForm({ ...form, defectsFound: e.target.value })} />
          </Field>
        </div>
        <Field label="Defect Description">
          <TextArea rows={2} value={form.defectDescription || ''} onChange={(e) => setForm({ ...form, defectDescription: e.target.value })} />
        </Field>
        <Field label="Corrective Action">
          <TextArea rows={2} value={form.correctiveAction || ''} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}
