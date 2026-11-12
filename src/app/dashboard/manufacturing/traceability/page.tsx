'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type MaterialLot = {
  materialName: string;
  lotNumber: string;
  supplier: string;
  receivedDate: string;
};

type TraceabilityRecord = {
  _id: string;
  batchNumber: string;
  productName: string;
  workOrderNumber: string;
  stage: string;
  materialLots: MaterialLot[];
  qualityCheckId: string;
  dispatchDate: string;
  dispatchTo: string;
  notes: string;
  createdAt: string;
};

const STAGES = ['Procurement', 'Production', 'Quality Check', 'Packaging', 'Dispatch'];
const STAGE_TONE: Record<string, any> = {
  Procurement: 'blue',
  Production: 'amber',
  'Quality Check': 'purple',
  Packaging: 'gold',
  Dispatch: 'green',
};

function emptyLot(): MaterialLot {
  return { materialName: '', lotNumber: '', supplier: '', receivedDate: '' };
}

function emptyForm() {
  return {
    batchNumber: '',
    productName: '',
    workOrderNumber: '',
    stage: 'Procurement',
    dispatchDate: '',
    dispatchTo: '',
    notes: '',
    materialLots: [emptyLot()],
  };
}

export default function TraceabilityPage() {
  const [items, setItems] = useState<TraceabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TraceabilityRecord | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const data = await fetch(`/api/manufacturing/traceability?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (rec: TraceabilityRecord) => {
    setEditing(rec);
    setForm({
      ...rec,
      dispatchDate: rec.dispatchDate ? rec.dispatchDate.slice(0, 10) : '',
      materialLots: rec.materialLots && rec.materialLots.length > 0
        ? rec.materialLots.map((l) => ({ ...l, receivedDate: l.receivedDate ? l.receivedDate.slice(0, 10) : '' }))
        : [emptyLot()],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.batchNumber) return;
    const lots = (form.materialLots || []).filter((l: MaterialLot) => l.materialName || l.lotNumber);
    const payload = { ...form, materialLots: lots };
    let res: Response;
    if (editing) {
      res = await fetch('/api/manufacturing/traceability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      res = await fetch('/api/manufacturing/traceability', {
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
    if (!confirm('Delete this traceability record?')) return;
    const res = await fetch(`/api/manufacturing/traceability?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Could not delete');
      return;
    }
    load();
  };

  const updateLot = (idx: number, patch: Partial<MaterialLot>) => {
    const updated = form.materialLots.map((lot: MaterialLot, i: number) => (i === idx ? { ...lot, ...patch } : lot));
    setForm({ ...form, materialLots: updated });
  };

  const addLot = () => setForm({ ...form, materialLots: [...form.materialLots, emptyLot()] });

  const removeLot = (idx: number) => {
    const updated = form.materialLots.filter((_: MaterialLot, i: number) => i !== idx);
    setForm({ ...form, materialLots: updated.length > 0 ? updated : [emptyLot()] });
  };

  return (
    <>
      <PageHeader
        title="Traceability"
        subtitle="Manufacturing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search batch#, product..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <PrimaryButton onClick={startCreate}>+ New Record</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-4 py-2.5">Batch#</th>
                <th className="text-left px-4 py-2.5">Product</th>
                <th className="text-left px-4 py-2.5">WO#</th>
                <th className="text-left px-4 py-2.5">Stage</th>
                <th className="text-right px-4 py-2.5">Materials</th>
                <th className="text-left px-4 py-2.5">Dispatch Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#6B7280]">No traceability records yet.</td></tr>
              ) : items.map((rec) => (
                <tr key={rec._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{rec.batchNumber}</td>
                  <td className="px-4 py-2 text-[#1C1C1E]">{rec.productName || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{rec.workOrderNumber || '—'}</td>
                  <td className="px-4 py-2"><Badge tone={STAGE_TONE[rec.stage] || 'gray'}>{rec.stage}</Badge></td>
                  <td className="px-4 py-2 text-right text-[#4A4E54]">{rec.materialLots?.length || 0}</td>
                  <td className="px-4 py-2 text-[#6B7280]">{rec.dispatchDate ? new Date(rec.dispatchDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(rec)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(rec._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? `Edit ${editing.batchNumber}` : 'New Traceability Record'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch Number" required>
            <TextInput value={form.batchNumber || ''} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          </Field>
          <Field label="Product Name">
            <TextInput value={form.productName || ''} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
          </Field>
          <Field label="Work Order Number">
            <TextInput value={form.workOrderNumber || ''} onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })} />
          </Field>
          <Field label="Stage">
            <SelectInput value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Dispatch Date">
            <TextInput type="date" value={form.dispatchDate || ''} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })} />
          </Field>
          <Field label="Dispatch To">
            <TextInput value={form.dispatchTo || ''} onChange={(e) => setForm({ ...form, dispatchTo: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        {/* Material Lots section */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1C1C1E]">Material Lots</h3>
          <button onClick={addLot} className="text-xs text-[#D4A843] hover:underline">+ Add Lot</button>
        </div>
        <div className="border border-[#E5E7EB] rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F3F4F6] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="text-left px-3 py-2">Material</th>
                <th className="text-left px-3 py-2">Lot Number</th>
                <th className="text-left px-3 py-2">Supplier</th>
                <th className="text-left px-3 py-2 w-32">Received Date</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {(form.materialLots || []).map((lot: MaterialLot, idx: number) => (
                <tr key={idx} className="border-t border-[#E5E7EB]">
                  <td className="px-3 py-1.5">
                    <input
                      value={lot.materialName}
                      onChange={(e) => updateLot(idx, { materialName: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="Material name"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={lot.lotNumber}
                      onChange={(e) => updateLot(idx, { lotNumber: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="Lot#"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={lot.supplier}
                      onChange={(e) => updateLot(idx, { supplier: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                      placeholder="Supplier"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="date"
                      value={lot.receivedDate}
                      onChange={(e) => updateLot(idx, { receivedDate: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-[#E5E7EB] rounded"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => removeLot(idx)} className="text-red-500 text-xs hover:text-red-700">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
