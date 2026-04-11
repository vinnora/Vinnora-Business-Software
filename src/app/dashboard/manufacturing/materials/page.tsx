'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, SelectInput,
  PrimaryButton, SecondaryButton, Badge, fmtINR,
} from '../_components/ui';

type Material = {
  _id: string;
  materialCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderPoint: number;
  costPerUnit: number;
  supplier?: string;
  supplierName?: string;
  warehouseLocation?: string;
  status: string;
  createdAt?: string;
};

const STATUSES = ['Active', 'Inactive', 'Discontinued'];

const STATUS_TONE: Record<string, any> = {
  Active: 'green',
  Inactive: 'gray',
  Discontinued: 'red',
};

function emptyForm() {
  return {
    name: '',
    category: '',
    unit: 'kg',
    currentStock: 0,
    reorderPoint: 0,
    costPerUnit: 0,
    supplierName: '',
    warehouseLocation: '',
    status: 'Active',
  };
}

export default function MaterialsPage() {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/manufacturing/materials?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, categoryFilter]);

  const startCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };

  const startEdit = (mat: Material) => {
    setEditing(mat);
    setForm({ ...mat });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      currentStock: Number(form.currentStock) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
      costPerUnit: Number(form.costPerUnit) || 0,
    };
    if (editing) {
      await fetch('/api/manufacturing/materials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/manufacturing/materials', {
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
    if (!confirm('Delete this material?')) return;
    await fetch(`/api/manufacturing/materials?id=${id}`, { method: 'DELETE' });
    load();
  };

  const categories = [...new Set(items.map((m) => m.category).filter(Boolean))];

  return (
    <>
      <PageHeader
        title="Materials"
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
            <input
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Filter category..."
              className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none"
            />
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Material</PrimaryButton>
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
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Stock</th>
                <th className="text-left px-4 py-2.5">Unit</th>
                <th className="text-right px-4 py-2.5">Cost</th>
                <th className="text-left px-4 py-2.5">Supplier</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#6B7280]">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#6B7280]">No materials yet.</td></tr>
              ) : items.map((mat) => (
                <tr key={mat._id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A4E54]">{mat.materialCode}</td>
                  <td className="px-4 py-2 font-medium text-[#1C1C1E]">{mat.name}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{mat.category}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`font-semibold ${
                        mat.currentStock === 0
                          ? 'text-red-600'
                          : mat.currentStock <= mat.reorderPoint
                          ? 'text-amber-700'
                          : 'text-[#1C1C1E]'
                      }`}
                    >
                      {mat.currentStock}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[#6B7280]">{mat.unit}</td>
                  <td className="px-4 py-2 text-right text-[#1C1C1E]">{fmtINR(mat.costPerUnit)}</td>
                  <td className="px-4 py-2 text-[#4A4E54]">{mat.supplierName || '—'}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[mat.status] || 'gray'}>{mat.status}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(mat)} className="text-xs text-[#D4A843] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(mat._id)} className="text-xs text-red-600 hover:underline">Delete</button>
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
        title={editing ? `Edit ${editing.name}` : 'New Material'}
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
          <Field label="Category">
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Unit">
            <TextInput value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Current Stock">
            <TextInput type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
          </Field>
          <Field label="Reorder Point">
            <TextInput type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
          </Field>
          <Field label="Cost Per Unit">
            <TextInput type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} />
          </Field>
          <Field label="Supplier Name">
            <TextInput value={form.supplierName || ''} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
          </Field>
          <Field label="Warehouse Location">
            <TextInput value={form.warehouseLocation || ''} onChange={(e) => setForm({ ...form, warehouseLocation: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </Field>
        </div>
      </Modal>
    </>
  );
}
