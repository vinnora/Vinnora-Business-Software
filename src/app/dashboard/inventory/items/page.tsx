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
} from '../_components/ui';

type Variant = {
  variantId: string;
  sku: string;
  variantName: string;
  attributes: Record<string, string>;
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  barcode?: string;
  stock: number;
  imageUrl?: string;
};

type WarehouseStock = {
  warehouseId: string;
  warehouseName: string;
  binLocation?: string;
  quantity: number;
  reservedQuantity: number;
};

type Item = {
  _id: string;
  itemCode: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  hsnCode?: string;
  unit: string;
  type: 'finished' | 'raw' | 'service' | 'consumable';
  costPrice: number;
  sellingPrice: number;
  mrp: number;
  taxRate: number;
  barcode?: string;
  imageUrls: string[];
  variants: Variant[];
  warehouseStocks: WarehouseStock[];
  totalStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  expiryDate?: string;
  manufactureDate?: string;
  shelfLifeDays?: number;
  batchNumber?: string;
  status: string;
};

type Warehouse = { _id: string; name: string; code: string };

const TYPES = ['finished', 'raw', 'service', 'consumable'];
const STATUSES = ['active', 'inactive', 'discontinued'];
const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'box', 'pack', 'set', 'mtr', 'cm'];

const STATUS_TONE: Record<string, any> = {
  active: 'green',
  inactive: 'gray',
  discontinued: 'red',
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      type: 'finished',
      unit: 'pcs',
      status: 'active',
      taxRate: 18,
      costPrice: 0,
      sellingPrice: 0,
      mrp: 0,
      reorderPoint: 0,
      reorderQuantity: 0,
      imageUrls: [''],
      variants: [],
      warehouseStocks: [],
      tags: [],
      attachments: [],
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (lowStockOnly) params.set('lowStock', 'true');
    if (expiringOnly) params.set('expiring', 'true');
    const data = await fetch(`/api/inventory/items?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadWarehouses = async () => {
    const data = await fetch('/api/inventory/warehouses').then((r) => r.json());
    setWarehouses(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
  }, [typeFilter, statusFilter, lowStockOnly, expiringOnly]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (item: Item) => {
    setEditing(item);
    setForm({
      ...item,
      imageUrls: item.imageUrls?.length ? item.imageUrls : [''],
      expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
      manufactureDate: item.manufactureDate ? item.manufactureDate.slice(0, 10) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.category) return;
    const payload = {
      ...form,
      costPrice: Number(form.costPrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
      mrp: Number(form.mrp) || 0,
      taxRate: Number(form.taxRate) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
      reorderQuantity: Number(form.reorderQuantity) || 0,
      imageUrls: (form.imageUrls || []).filter(Boolean),
    };
    if (editing) {
      await fetch('/api/inventory/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/inventory/items', {
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
    if (!confirm('Delete this item?')) return;
    await fetch(`/api/inventory/items?id=${id}`, { method: 'DELETE' });
    load();
  };

  // Variant management
  const addVariant = () => {
    setForm({
      ...form,
      variants: [
        ...form.variants,
        {
          variantId: `v-${Date.now()}-${form.variants.length}`,
          sku: '',
          variantName: '',
          attributes: {},
          costPrice: form.costPrice || 0,
          sellingPrice: form.sellingPrice || 0,
          mrp: form.mrp || 0,
          stock: 0,
        },
      ],
    });
  };

  const updateVariant = (i: number, patch: any) => {
    setForm({
      ...form,
      variants: form.variants.map((v: any, idx: number) => (idx === i ? { ...v, ...patch } : v)),
    });
  };

  const removeVariant = (i: number) => {
    setForm({ ...form, variants: form.variants.filter((_: any, idx: number) => idx !== i) });
  };

  // Warehouse stock management
  const addWarehouseStock = () => {
    setForm({
      ...form,
      warehouseStocks: [
        ...form.warehouseStocks,
        { warehouseId: '', warehouseName: '', binLocation: '', quantity: 0, reservedQuantity: 0 },
      ],
    });
  };

  const updateWarehouseStock = (i: number, patch: any) => {
    setForm({
      ...form,
      warehouseStocks: form.warehouseStocks.map((w: any, idx: number) =>
        idx === i ? { ...w, ...patch } : w
      ),
    });
  };

  const removeWarehouseStock = (i: number) => {
    setForm({
      ...form,
      warehouseStocks: form.warehouseStocks.filter((_: any, idx: number) => idx !== i),
    });
  };

  // Image management
  const addImage = () => setForm({ ...form, imageUrls: [...form.imageUrls, ''] });
  const updateImage = (i: number, url: string) =>
    setForm({
      ...form,
      imageUrls: form.imageUrls.map((u: string, idx: number) => (idx === i ? url : u)),
    });
  const removeImage = (i: number) =>
    setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, idx: number) => idx !== i) });

  const totalStockValue = items.reduce((s, i) => s + i.totalStock * (i.costPrice || 0), 0);

  return (
    <>
      <PageHeader
        title="Items"
        subtitle="Item Master"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search name, code, barcode…"
              className="px-3 py-1.5 text-sm border border-[#FFE5C4] rounded focus:border-[#E2671A] focus:outline-none"
            />
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Item</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Tile label="Total SKUs" value={items.length} tone="fire" />
          <Tile label="Stock Value" value={fmtINR(totalStockValue)} tone="amber" hint="At cost" />
          <Tile
            label="Low Stock"
            value={items.filter((i) => i.totalStock > 0 && i.totalStock <= i.reorderPoint).length}
            tone="red"
            hint="Need reorder"
          />
          <Tile
            label="Out of Stock"
            value={items.filter((i) => i.totalStock === 0).length}
            tone="red"
          />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-1 text-xs rounded ${
              lowStockOnly
                ? 'bg-[#E2671A] text-white'
                : 'bg-white border border-[#FFE5C4] text-[#6B2410]'
            }`}
          >
            Low stock only
          </button>
          <button
            onClick={() => setExpiringOnly(!expiringOnly)}
            className={`px-3 py-1 text-xs rounded ${
              expiringOnly
                ? 'bg-[#E2671A] text-white'
                : 'bg-white border border-[#FFE5C4] text-[#6B2410]'
            }`}
          >
            Expiring within 30d
          </button>
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Image</th>
                <th className="text-left px-4 py-2.5">Code</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-right px-4 py-2.5">Cost</th>
                <th className="text-right px-4 py-2.5">MRP</th>
                <th className="text-right px-4 py-2.5">Stock</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-[#A0522D]">No items yet.</td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2">
                    {item.imageUrls?.[0] ? (
                      <img
                        src={item.imageUrls[0]}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover border border-[#FFE5C4]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-[#FFF1D6] border border-[#FFE5C4] flex items-center justify-center text-[#A0522D] text-xs">
                        IMG
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#A0522D]">{item.itemCode}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#4A1D0F]">{item.name}</div>
                    {item.variants?.length > 0 && (
                      <div className="text-[10px] text-[#A0522D]">{item.variants.length} variants</div>
                    )}
                    {item.barcode && (
                      <div className="text-[10px] font-mono text-[#A0522D]">{item.barcode}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#6B2410]">{item.category}</td>
                  <td className="px-4 py-2">
                    <Badge tone={item.type === 'raw' ? 'amber' : 'fire'}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{fmtINR(item.costPrice)}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(item.mrp)}</td>
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
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs text-[#E2671A] hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove(item._id)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
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
        title={editing ? `Edit ${editing.itemCode}` : 'New Item'}
        width="max-w-4xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        {/* Basic info */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Category" required>
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Brand">
            <TextInput value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Unit">
            <SelectInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </SelectInput>
          </Field>
          <Field label="HSN Code">
            <TextInput value={form.hsnCode || ''} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
          </Field>
        </div>

        <Field label="Description">
          <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>

        {/* Pricing */}
        <h3 className="text-sm font-semibold text-[#4A1D0F] mt-4 mb-2">Pricing</h3>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Cost Price (₹)">
            <TextInput type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </Field>
          <Field label="Selling Price (₹)">
            <TextInput type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </Field>
          <Field label="MRP (₹)">
            <TextInput type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
          </Field>
          <Field label="Tax %">
            <TextInput type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
          </Field>
        </div>

        {/* Reorder + Expiry */}
        <h3 className="text-sm font-semibold text-[#4A1D0F] mt-4 mb-2">Reorder &amp; Expiry</h3>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Reorder Point">
            <TextInput type="number" value={form.reorderPoint} onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })} />
          </Field>
          <Field label="Reorder Qty">
            <TextInput type="number" value={form.reorderQuantity} onChange={(e) => setForm({ ...form, reorderQuantity: e.target.value })} />
          </Field>
          <Field label="Manufacture Date">
            <TextInput type="date" value={form.manufactureDate || ''} onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })} />
          </Field>
          <Field label="Expiry Date">
            <TextInput type="date" value={form.expiryDate || ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
          <Field label="Batch Number">
            <TextInput value={form.batchNumber || ''} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} />
          </Field>
          <Field label="Shelf Life (days)">
            <TextInput type="number" value={form.shelfLifeDays || ''} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
          </Field>
          <Field label="Barcode">
            <TextInput value={form.barcode || ''} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </Field>
        </div>

        {/* Images */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Product Images</h3>
          <button onClick={addImage} className="text-xs text-[#E2671A]">+ Add image URL</button>
        </div>
        {form.imageUrls.map((url: string, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <TextInput
              placeholder="https://..."
              value={url}
              onChange={(e) => updateImage(i, e.target.value)}
            />
            {url && (
              <img src={url} alt="" className="w-10 h-10 rounded object-cover border border-[#FFE5C4]" />
            )}
            <button onClick={() => removeImage(i)} className="text-red-600 text-xs">×</button>
          </div>
        ))}

        {/* Warehouse stocks */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Warehouse Stock</h3>
          <button onClick={addWarehouseStock} className="text-xs text-[#E2671A]">+ Add warehouse</button>
        </div>
        {form.warehouseStocks.map((ws: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <select
              value={ws.warehouseId}
              onChange={(e) => {
                const wh = warehouses.find((w) => w._id === e.target.value);
                updateWarehouseStock(i, {
                  warehouseId: e.target.value,
                  warehouseName: wh?.name || '',
                });
              }}
              className="col-span-4 px-2 py-1 text-sm border border-[#FFE5C4] rounded bg-white"
            >
              <option value="">— Warehouse —</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
            <input
              placeholder="Bin"
              value={ws.binLocation || ''}
              onChange={(e) => updateWarehouseStock(i, { binLocation: e.target.value })}
              className="col-span-3 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Qty"
              value={ws.quantity}
              onChange={(e) => updateWarehouseStock(i, { quantity: Number(e.target.value) })}
              className="col-span-2 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Reserved"
              value={ws.reservedQuantity}
              onChange={(e) => updateWarehouseStock(i, { reservedQuantity: Number(e.target.value) })}
              className="col-span-2 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <button onClick={() => removeWarehouseStock(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}

        {/* Variants */}
        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Variants</h3>
          <button onClick={addVariant} className="text-xs text-[#E2671A]">+ Add variant</button>
        </div>
        {form.variants.map((v: any, i: number) => (
          <div key={i} className="border border-[#FFE5C4] rounded p-2 mb-2">
            <div className="grid grid-cols-12 gap-2 mb-2">
              <input
                placeholder="Variant name (e.g. Red - Large)"
                value={v.variantName}
                onChange={(e) => updateVariant(i, { variantName: e.target.value })}
                className="col-span-5 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <input
                placeholder="SKU"
                value={v.sku}
                onChange={(e) => updateVariant(i, { sku: e.target.value })}
                className="col-span-3 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <input
                placeholder="Barcode"
                value={v.barcode || ''}
                onChange={(e) => updateVariant(i, { barcode: e.target.value })}
                className="col-span-3 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <button onClick={() => removeVariant(i)} className="col-span-1 text-red-600 text-xs">×</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="number"
                placeholder="Cost"
                value={v.costPrice}
                onChange={(e) => updateVariant(i, { costPrice: Number(e.target.value) })}
                className="px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <input
                type="number"
                placeholder="Selling"
                value={v.sellingPrice}
                onChange={(e) => updateVariant(i, { sellingPrice: Number(e.target.value) })}
                className="px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <input
                type="number"
                placeholder="MRP"
                value={v.mrp}
                onChange={(e) => updateVariant(i, { mrp: Number(e.target.value) })}
                className="px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
              <input
                type="number"
                placeholder="Stock"
                value={v.stock}
                onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })}
                className="px-2 py-1 text-sm border border-[#FFE5C4] rounded"
              />
            </div>
          </div>
        ))}
      </Modal>
    </>
  );
}
