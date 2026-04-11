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
} from '../_components/ui';

type Transfer = {
  _id: string;
  transferNumber: string;
  fromWarehouseName: string;
  toWarehouseName: string;
  initiatedDate: string;
  shippedDate?: string;
  receivedDate?: string;
  status: string;
  lines: any[];
  totalQuantity: number;
  carrier?: string;
  trackingNumber?: string;
};

const STATUSES = ['draft', 'in-transit', 'partial-received', 'received', 'cancelled'];
const STATUS_TONE: Record<string, any> = {
  draft: 'gray',
  'in-transit': 'amber',
  'partial-received': 'amber',
  received: 'green',
  cancelled: 'red',
};

export default function StockTransfersPage() {
  const [items, setItems] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty());

  function empty() {
    return {
      initiatedDate: new Date().toISOString().slice(0, 10),
      lines: [{ itemId: '', itemCode: '', itemName: '', requestedQuantity: 1 }],
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/inventory/stock-transfers?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadRefs = async () => {
    const [w, p] = await Promise.all([
      fetch('/api/inventory/warehouses').then((r) => r.json()),
      fetch('/api/inventory/items').then((r) => r.json()),
    ]);
    setWarehouses(Array.isArray(w) ? w : []);
    setProducts(Array.isArray(p) ? p : []);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  useEffect(() => {
    loadRefs();
  }, []);

  const addLine = () =>
    setForm({
      ...form,
      lines: [...form.lines, { itemId: '', itemCode: '', itemName: '', requestedQuantity: 1 }],
    });

  const updateLine = (i: number, patch: any) => {
    setForm({
      ...form,
      lines: form.lines.map((l: any, idx: number) => (idx === i ? { ...l, ...patch } : l)),
    });
  };

  const removeLine = (i: number) =>
    setForm({ ...form, lines: form.lines.filter((_: any, idx: number) => idx !== i) });

  const selectItemForLine = (i: number, itemId: string) => {
    const product = products.find((p) => p._id === itemId);
    if (!product) return;
    updateLine(i, {
      itemId: product._id,
      itemCode: product.itemCode,
      itemName: product.name,
    });
  };

  const save = async () => {
    if (!form.fromWarehouseId || !form.toWarehouseId) return;
    const from = warehouses.find((w) => w._id === form.fromWarehouseId);
    const to = warehouses.find((w) => w._id === form.toWarehouseId);
    await fetch('/api/inventory/stock-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        fromWarehouseName: from?.name,
        toWarehouseName: to?.name,
      }),
    });
    setOpen(false);
    setForm(empty());
    load();
  };

  const ship = async (id: string) => {
    if (!confirm('Mark as shipped? This will deduct stock from the source warehouse.')) return;
    await fetch('/api/inventory/stock-transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, action: 'ship' }),
    });
    load();
  };

  const receive = async (id: string) => {
    if (!confirm('Mark as received? This will add stock to the destination warehouse.')) return;
    await fetch('/api/inventory/stock-transfers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, action: 'receive' }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this transfer?')) return;
    await fetch(`/api/inventory/stock-transfers?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Stock Transfers"
        subtitle="Inter-Warehouse Movement"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ New Transfer</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Total Transfers" value={items.length} tone="fire" />
          <Tile label="In Transit" value={items.filter((t) => t.status === 'in-transit').length} tone="amber" />
          <Tile label="Completed" value={items.filter((t) => t.status === 'received').length} tone="glow" />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">Transfer #</th>
                <th className="text-left px-4 py-2.5">From → To</th>
                <th className="text-left px-4 py-2.5">Initiated</th>
                <th className="text-right px-4 py-2.5">Items</th>
                <th className="text-right px-4 py-2.5">Total Qty</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#A0522D]">No transfers yet.</td></tr>
              ) : items.map((t) => (
                <tr key={t._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A1D0F]">{t.transferNumber}</td>
                  <td className="px-4 py-2 text-[#6B2410]">
                    <div className="font-medium">{t.fromWarehouseName}</div>
                    <div className="text-xs">→ {t.toWarehouseName}</div>
                  </td>
                  <td className="px-4 py-2 text-[#6B2410]">{new Date(t.initiatedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">{t.lines.length}</td>
                  <td className="px-4 py-2 text-right font-semibold">{t.totalQuantity}</td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {t.status === 'draft' && (
                      <button onClick={() => ship(t._id)} className="text-xs text-[#E2671A] hover:underline mr-2">
                        Ship
                      </button>
                    )}
                    {t.status === 'in-transit' && (
                      <button onClick={() => receive(t._id)} className="text-xs text-green-700 hover:underline mr-2">
                        Receive
                      </button>
                    )}
                    <button onClick={() => remove(t._id)} className="text-xs text-red-600 hover:underline">
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
        title="New Stock Transfer"
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="From Warehouse" required>
            <SelectInput value={form.fromWarehouseId || ''} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
              <option value="">— Source —</option>
              {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="To Warehouse" required>
            <SelectInput value={form.toWarehouseId || ''} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
              <option value="">— Destination —</option>
              {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Initiated Date">
            <TextInput type="date" value={form.initiatedDate} onChange={(e) => setForm({ ...form, initiatedDate: e.target.value })} />
          </Field>
          <Field label="Expected Date">
            <TextInput type="date" value={form.expectedDate || ''} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
          </Field>
          <Field label="Carrier">
            <TextInput value={form.carrier || ''} onChange={(e) => setForm({ ...form, carrier: e.target.value })} />
          </Field>
          <Field label="Tracking #">
            <TextInput value={form.trackingNumber || ''} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Reason">
              <TextInput value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="mt-3 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Items</h3>
          <button onClick={addLine} className="text-xs text-[#E2671A]">+ Add line</button>
        </div>
        {form.lines.map((l: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <select
              value={l.itemId}
              onChange={(e) => selectItemForLine(i, e.target.value)}
              className="col-span-7 px-2 py-1 text-sm border border-[#FFE5C4] rounded bg-white"
            >
              <option value="">— Item —</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.itemCode} — {p.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Qty"
              value={l.requestedQuantity}
              onChange={(e) => updateLine(i, { requestedQuantity: Number(e.target.value) })}
              className="col-span-4 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <button onClick={() => removeLine(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>
    </>
  );
}
