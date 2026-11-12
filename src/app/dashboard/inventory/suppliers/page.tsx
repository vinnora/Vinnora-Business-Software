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

type Supplier = {
  _id: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms?: string;
  rating?: number;
  totalOrders: number;
  totalSpend: number;
  preferredCategories: string[];
  active: boolean;
};

type Item = { _id: string; itemCode: string; name: string; suppliers: any[] };

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<any>({ active: true, currency: 'INR', country: 'India' });

  const load = async () => {
    setLoading(true);
    const data = await fetch(`/api/inventory/suppliers?${search ? `search=${search}` : ''}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadItems = async () => {
    const data = await fetch('/api/inventory/items').then((r) => r.json());
    setProducts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadItems();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ active: true, currency: 'INR', country: 'India' });
    setOpen(true);
  };

  const startEdit = (s: Supplier) => {
    setEditing(s);
    setForm(s);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      preferredCategories:
        typeof form.preferredCategories === 'string'
          ? form.preferredCategories.split(',').map((c: string) => c.trim()).filter(Boolean)
          : form.preferredCategories || [],
    };
    const res = editing
      ? await fetch('/api/inventory/suppliers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editing._id, ...payload }),
        })
      : await fetch('/api/inventory/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    const res = await fetch(`/api/inventory/suppliers?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  const showMapping = (s: Supplier) => {
    setSelectedSupplier(s);
    setMappingOpen(true);
  };

  const linkProduct = async (item: Item) => {
    if (!selectedSupplier) return;
    const exists = item.suppliers?.some((sm: any) => sm.supplierId === selectedSupplier._id);
    if (exists) return;
    const updated = {
      _id: item._id,
      suppliers: [
        ...(item.suppliers || []),
        {
          supplierId: selectedSupplier._id,
          supplierName: selectedSupplier.name,
          leadTimeDays: 7,
          costPrice: 0,
          minOrderQty: 1,
          isPreferred: false,
        },
      ],
    };
    const res = await fetch('/api/inventory/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!(await apiOk(res))) return;
    loadItems();
  };

  const unlinkProduct = async (item: Item) => {
    if (!selectedSupplier) return;
    const updated = {
      _id: item._id,
      suppliers: (item.suppliers || []).filter((sm: any) => sm.supplierId !== selectedSupplier._id),
    };
    const res = await fetch('/api/inventory/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!(await apiOk(res))) return;
    loadItems();
  };

  const mappedProducts = selectedSupplier
    ? products.filter((p) => p.suppliers?.some((sm: any) => sm.supplierId === selectedSupplier._id))
    : [];

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Vendor Mapping"
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
            <PrimaryButton onClick={startCreate}>+ New Supplier</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Active Suppliers" value={items.filter((s) => s.active).length} tone="fire" />
          <Tile
            label="Total Spend"
            value={fmtINR(items.reduce((s, sup) => s + (sup.totalSpend || 0), 0))}
            tone="amber"
          />
          <Tile
            label="Total Orders"
            value={items.reduce((s, sup) => s + (sup.totalOrders || 0), 0)}
            tone="glow"
          />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Code</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Contact</th>
                <th className="text-left px-4 py-2.5">GST</th>
                <th className="text-left px-4 py-2.5">Location</th>
                <th className="text-right px-4 py-2.5">Orders</th>
                <th className="text-right px-4 py-2.5">Spend</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#A0522D]">No suppliers yet.</td></tr>
              ) : items.map((s) => (
                <tr key={s._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2 font-mono text-xs text-[#A0522D]">{s.code}</td>
                  <td className="px-4 py-2 font-medium text-[#4A1D0F]">{s.name}</td>
                  <td className="px-4 py-2 text-[#6B2410]">
                    <div>{s.contactPerson || '—'}</div>
                    {s.phone && <div className="text-xs">{s.phone}</div>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#6B2410]">{s.gstNumber || '—'}</td>
                  <td className="px-4 py-2 text-[#6B2410] text-xs">
                    {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-2 text-right">{s.totalOrders || 0}</td>
                  <td className="px-4 py-2 text-right">{fmtINR(s.totalSpend)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={s.active ? 'green' : 'gray'}>{s.active ? 'active' : 'inactive'}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => showMapping(s)} className="text-xs text-[#E2671A] hover:underline mr-2">
                      Products
                    </button>
                    <button onClick={() => startEdit(s)} className="text-xs text-[#E2671A] hover:underline mr-2">
                      Edit
                    </button>
                    <button onClick={() => remove(s._id)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier form modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.code}` : 'New Supplier'}
        width="max-w-3xl"
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
          <Field label="Code">
            <TextInput value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Contact Person">
            <TextInput value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Alt Phone">
            <TextInput value={form.alternatePhone || ''} onChange={(e) => setForm({ ...form, alternatePhone: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <TextInput value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
          </div>
          <Field label="City">
            <TextInput value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="State">
            <TextInput value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
          <Field label="GSTIN">
            <TextInput value={form.gstNumber || ''} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </Field>
          <Field label="PAN">
            <TextInput value={form.panNumber || ''} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
          </Field>
          <Field label="Bank Name">
            <TextInput value={form.bankName || ''} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          </Field>
          <Field label="Bank Account">
            <TextInput value={form.bankAccount || ''} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
          </Field>
          <Field label="IFSC">
            <TextInput value={form.ifscCode || ''} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} />
          </Field>
          <Field label="Payment Terms">
            <TextInput value={form.paymentTerms || ''} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} />
          </Field>
          <Field label="Credit Limit (₹)">
            <TextInput type="number" value={form.creditLimit || 0} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
          </Field>
          <Field label="Rating (0-5)">
            <TextInput type="number" min="0" max="5" value={form.rating || ''} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
          </Field>
          <div className="col-span-2">
            <Field label="Preferred Categories (comma-separated)">
              <TextInput
                value={
                  Array.isArray(form.preferredCategories)
                    ? form.preferredCategories.join(', ')
                    : form.preferredCategories || ''
                }
                onChange={(e) => setForm({ ...form, preferredCategories: e.target.value })}
              />
            </Field>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <label className="text-sm text-[#6B2410]">Active</label>
          </div>
        </div>
      </Modal>

      {/* Product mapping modal */}
      <Modal
        open={mappingOpen}
        onClose={() => setMappingOpen(false)}
        title={`Products mapped to ${selectedSupplier?.name || ''}`}
        width="max-w-3xl"
        footer={<SecondaryButton onClick={() => setMappingOpen(false)}>Close</SecondaryButton>}
      >
        <div className="text-xs uppercase text-[#A0522D] mb-2">Currently mapped ({mappedProducts.length})</div>
        <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
          {mappedProducts.length === 0 ? (
            <div className="text-sm text-[#A0522D]">No products mapped yet.</div>
          ) : (
            mappedProducts.map((p) => (
              <div key={p._id} className="flex items-center justify-between px-3 py-1.5 bg-[#FFF6E5] rounded text-sm">
                <span>
                  <span className="font-mono text-xs text-[#A0522D] mr-2">{p.itemCode}</span>
                  {p.name}
                </span>
                <button onClick={() => unlinkProduct(p)} className="text-xs text-red-600">
                  Unlink
                </button>
              </div>
            ))
          )}
        </div>
        <div className="text-xs uppercase text-[#A0522D] mb-2">Available products</div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {products
            .filter((p) => !p.suppliers?.some((sm: any) => sm.supplierId === selectedSupplier?._id))
            .map((p) => (
              <div key={p._id} className="flex items-center justify-between px-3 py-1.5 border border-[#FFE5C4] rounded text-sm">
                <span>
                  <span className="font-mono text-xs text-[#A0522D] mr-2">{p.itemCode}</span>
                  {p.name}
                </span>
                <button onClick={() => linkProduct(p)} className="text-xs text-[#E2671A]">
                  + Link
                </button>
              </div>
            ))}
        </div>
      </Modal>
    </>
  );
}
