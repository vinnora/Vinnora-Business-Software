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

type Warehouse = {
  _id: string;
  name: string;
  code: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  manager?: string;
  contactPhone?: string;
  contactEmail?: string;
  active: boolean;
  capacity?: number;
};

const TYPES = ['main', 'branch', 'transit', 'virtual', 'returns'];

export default function WarehousesPage() {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [stockByWh, setStockByWh] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<any>({ type: 'main', active: true, country: 'India' });

  const load = async () => {
    setLoading(true);
    const [whData, stockData] = await Promise.all([
      fetch('/api/inventory/warehouses').then((r) => r.json()),
      fetch('/api/inventory/reports?type=stock-by-warehouse').then((r) => r.json()),
    ]);
    setItems(Array.isArray(whData) ? whData : []);
    setStockByWh(stockData.warehouses || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ type: 'main', active: true, country: 'India' });
    setOpen(true);
  };

  const startEdit = (wh: Warehouse) => {
    setEditing(wh);
    setForm(wh);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    if (editing) {
      await fetch('/api/inventory/warehouses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...form }),
      });
    } else {
      await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this warehouse?')) return;
    await fetch(`/api/inventory/warehouses?id=${id}`, { method: 'DELETE' });
    load();
  };

  const totalValue = stockByWh.reduce((s: number, w: any) => s + w.totalValue, 0);
  const totalQty = stockByWh.reduce((s: number, w: any) => s + w.totalQty, 0);

  return (
    <>
      <PageHeader
        title="Warehouses"
        subtitle="Locations &amp; Stock Tracking"
        count={items.length}
        actions={<PrimaryButton onClick={startCreate}>+ New Warehouse</PrimaryButton>}
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Active Warehouses" value={items.filter((w) => w.active).length} tone="fire" />
          <Tile label="Total Stock Units" value={totalQty} tone="amber" />
          <Tile label="Total Value" value={fmtINR(totalValue)} tone="glow" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="text-sm text-[#A0522D]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="bg-white border border-[#FFE5C4] rounded-lg p-8 text-center text-[#A0522D] col-span-3">
              No warehouses yet. Create one to start tracking stock by location.
            </div>
          ) : (
            items.map((wh) => {
              const stock = stockByWh.find((s: any) => s._id === wh.name);
              return (
                <div
                  key={wh._id}
                  className="bg-white border border-[#FFE5C4] rounded-lg p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[#4A1D0F]">{wh.name}</h3>
                        <Badge tone={wh.active ? 'green' : 'gray'}>{wh.active ? 'active' : 'inactive'}</Badge>
                      </div>
                      <div className="text-xs font-mono text-[#A0522D] mt-0.5">{wh.code}</div>
                    </div>
                    <Badge tone="fire">{wh.type}</Badge>
                  </div>
                  <div className="text-xs text-[#6B2410] mb-3">
                    {[wh.city, wh.state, wh.country].filter(Boolean).join(', ') || 'No location set'}
                  </div>
                  {wh.manager && (
                    <div className="text-xs text-[#6B2410]">Manager: {wh.manager}</div>
                  )}
                  {wh.contactPhone && (
                    <div className="text-xs text-[#6B2410]">{wh.contactPhone}</div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#FFF1D6]">
                    <div>
                      <div className="text-[10px] uppercase text-[#A0522D]">Stock units</div>
                      <div className="font-semibold text-[#4A1D0F]">{stock?.totalQty || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#A0522D]">Value</div>
                      <div className="font-semibold text-[#4A1D0F]">{fmtINR(stock?.totalValue || 0)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#FFF1D6]">
                    <button
                      onClick={() => startEdit(wh)}
                      className="text-xs text-[#E2671A] hover:underline"
                    >
                      Edit
                    </button>
                    <button onClick={() => remove(wh._id)} className="text-xs text-red-600 hover:underline">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Warehouse' : 'New Warehouse'}
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
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
          <Field label="Capacity">
            <TextInput
              type="number"
              value={form.capacity || ''}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
            />
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
          <Field label="Country">
            <TextInput value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="Postal Code">
            <TextInput value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </Field>
          <Field label="Manager">
            <TextInput value={form.manager || ''} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
          </Field>
          <Field label="Contact Person">
            <TextInput value={form.contactPerson || ''} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
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
    </>
  );
}
