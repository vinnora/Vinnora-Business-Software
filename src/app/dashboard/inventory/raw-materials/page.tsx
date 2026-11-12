'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
  Tile,
  fmtINR,
  apiOk,
} from '../_components/ui';

type Item = {
  _id: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  totalStock: number;
  reorderPoint: number;
  expiryDate?: string;
  shelfLifeDays?: number;
  batchNumber?: string;
  manufactureDate?: string;
  status: string;
  imageUrls: string[];
};

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack'];

export default function RawMaterialsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    type: 'raw',
    unit: 'kg',
    status: 'active',
    costPrice: 0,
    reorderPoint: 0,
    reorderQuantity: 0,
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: 'raw' });
    if (search) params.set('search', search);
    const data = await fetch(`/api/inventory/items?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name || !form.category) return;
    const res = await fetch('/api/inventory/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        type: 'raw',
        costPrice: Number(form.costPrice),
        reorderPoint: Number(form.reorderPoint),
        reorderQuantity: Number(form.reorderQuantity),
      }),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm({
      type: 'raw',
      unit: 'kg',
      status: 'active',
      costPrice: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this raw material?')) return;
    const res = await fetch(`/api/inventory/items?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  const lowStock = items.filter((i) => i.totalStock > 0 && i.totalStock <= i.reorderPoint);
  const expiringSoon = items.filter(
    (i) => i.expiryDate && new Date(i.expiryDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
  );
  const totalValue = items.reduce((s, i) => s + i.totalStock * i.costPrice, 0);

  return (
    <>
      <PageHeader
        title="Raw Materials"
        subtitle="Production Inputs"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search…"
              className="px-3 py-1.5 text-sm border border-[#FFE5C4] rounded focus:border-[#E2671A] focus:outline-none"
            />
            <PrimaryButton onClick={() => setOpen(true)}>+ New Raw Material</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Tile label="Total Materials" value={items.length} tone="fire" />
          <Tile label="Stock Value" value={fmtINR(totalValue)} tone="amber" hint="At cost" />
          <Tile label="Low Stock" value={lowStock.length} tone="red" hint="Need reorder" />
          <Tile label="Expiring Soon" value={expiringSoon.length} tone="red" hint="Within 30d" />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Code</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-right px-4 py-2.5">Cost</th>
                <th className="text-right px-4 py-2.5">Stock</th>
                <th className="text-left px-4 py-2.5">Batch</th>
                <th className="text-left px-4 py-2.5">Expiry</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[#A0522D]">No raw materials yet.</td></tr>
              ) : items.map((item) => {
                const expiringDays = item.expiryDate
                  ? Math.floor(
                      (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                  : null;
                return (
                  <tr key={item._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                    <td className="px-4 py-2 font-mono text-xs text-[#A0522D]">{item.itemCode}</td>
                    <td className="px-4 py-2 font-medium text-[#4A1D0F]">{item.name}</td>
                    <td className="px-4 py-2 text-[#6B2410]">{item.category}</td>
                    <td className="px-4 py-2 text-right">{fmtINR(item.costPrice)}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          item.totalStock === 0
                            ? 'text-red-600'
                            : item.totalStock <= item.reorderPoint
                            ? 'text-amber-700'
                            : 'text-[#4A1D0F]'
                        }`}
                      >
                        {item.totalStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-[#6B2410]">{item.batchNumber || '—'}</td>
                    <td className="px-4 py-2">
                      {item.expiryDate ? (
                        <div>
                          <div className="text-xs text-[#6B2410]">{new Date(item.expiryDate).toLocaleDateString()}</div>
                          {expiringDays !== null && expiringDays < 30 && (
                            <Badge tone={expiringDays < 0 ? 'red' : 'amber'}>
                              {expiringDays < 0 ? 'expired' : `${expiringDays}d`}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#A0522D]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => remove(item._id)} className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Raw Material"
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
          <Field label="Category" required>
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Unit">
            <SelectInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </SelectInput>
          </Field>
          <Field label="Cost Price (₹)">
            <TextInput type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </Field>
          <Field label="Reorder Point">
            <TextInput type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
          </Field>
          <Field label="Reorder Qty">
            <TextInput type="number" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })} />
          </Field>
          <Field label="Batch Number">
            <TextInput value={form.batchNumber || ''} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          </Field>
          <Field label="Manufacture Date">
            <TextInput type="date" value={form.manufactureDate || ''} onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })} />
          </Field>
          <Field label="Expiry Date">
            <TextInput type="date" value={form.expiryDate || ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Shelf Life (days)">
            <TextInput type="number" value={form.shelfLifeDays || ''} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
