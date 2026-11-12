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

type EWB = {
  _id: string;
  ewayBillNumber: string;
  ewbDate: string;
  validUntil?: string;
  documentType: string;
  documentNumber: string;
  fromName: string;
  fromState: string;
  toName: string;
  toState: string;
  vehicleNumber?: string;
  distanceKm: number;
  totalValue: number;
  status: string;
  items: any[];
};

const STATUSES = ['draft', 'generated', 'in-transit', 'delivered', 'cancelled', 'expired'];
const STATUS_TONE: Record<string, any> = {
  draft: 'gray',
  generated: 'blue',
  'in-transit': 'amber',
  delivered: 'green',
  cancelled: 'red',
  expired: 'red',
};

const SUB_TYPES = ['supply', 'export', 'job-work', 'sko', 'recipient-not-known', 'for-own-use', 'exhibition', 'line-sales', 'others'];

export default function EWayBillsPage() {
  const [items, setItems] = useState<EWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty());

  function empty() {
    return {
      ewbDate: new Date().toISOString().slice(0, 10),
      documentType: 'invoice',
      documentDate: new Date().toISOString().slice(0, 10),
      subType: 'supply',
      transportMode: 'road',
      vehicleType: 'regular',
      distanceKm: 100,
      items: [
        {
          itemName: '',
          hsnCode: '',
          quantity: 1,
          unit: 'pcs',
          taxableValue: 0,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          cessRate: 0,
        },
      ],
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/inventory/eway-bills?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const addItem = () =>
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          itemName: '',
          hsnCode: '',
          quantity: 1,
          unit: 'pcs',
          taxableValue: 0,
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          cessRate: 0,
        },
      ],
    });

  const updateItem = (i: number, patch: any) => {
    setForm({
      ...form,
      items: form.items.map((it: any, idx: number) => (idx === i ? { ...it, ...patch } : it)),
    });
  };

  const removeItem = (i: number) =>
    setForm({ ...form, items: form.items.filter((_: any, idx: number) => idx !== i) });

  const save = async () => {
    if (!form.fromGstin || !form.toGstin || !form.documentNumber) return;
    const res = await fetch('/api/inventory/eway-bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!(await apiOk(res))) return;
    setOpen(false);
    setForm(empty());
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch('/api/inventory/eway-bills', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status }),
    });
    if (!(await apiOk(res))) return;
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this E-Way Bill?')) return;
    const res = await fetch(`/api/inventory/eway-bills?id=${id}`, { method: 'DELETE' });
    if (!(await apiOk(res, 'Could not delete'))) return;
    load();
  };

  return (
    <>
      <PageHeader
        title="E-Way Bills"
        subtitle="GST On-Route Compliance"
        count={items.length}
        actions={
          <>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </SelectInput>
            <PrimaryButton onClick={() => setOpen(true)}>+ Generate EWB</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Tile label="Total EWBs" value={items.length} tone="fire" />
          <Tile label="Active" value={items.filter((i) => ['generated', 'in-transit'].includes(i.status)).length} tone="amber" />
          <Tile label="Total Value" value={fmtINR(items.reduce((s, i) => s + i.totalValue, 0))} tone="glow" />
        </div>

        <div className="bg-white border border-[#FFE5C4] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FFF6E5] text-xs uppercase text-[#6B2410]">
              <tr>
                <th className="text-left px-4 py-2.5">EWB #</th>
                <th className="text-left px-4 py-2.5">Doc</th>
                <th className="text-left px-4 py-2.5">From → To</th>
                <th className="text-left px-4 py-2.5">Vehicle</th>
                <th className="text-right px-4 py-2.5">KM</th>
                <th className="text-right px-4 py-2.5">Value</th>
                <th className="text-left px-4 py-2.5">Valid Until</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#A0522D]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#A0522D]">No e-way bills yet.</td></tr>
              ) : items.map((ewb) => (
                <tr key={ewb._id} className="border-t border-[#FFF1D6] hover:bg-[#FFF6E5]">
                  <td className="px-4 py-2 font-mono text-xs text-[#4A1D0F]">{ewb.ewayBillNumber}</td>
                  <td className="px-4 py-2 text-[#6B2410] text-xs">
                    <div>{ewb.documentType}</div>
                    <div className="font-mono">{ewb.documentNumber}</div>
                  </td>
                  <td className="px-4 py-2 text-[#6B2410] text-xs">
                    <div className="font-medium">{ewb.fromName}</div>
                    <div>→ {ewb.toName}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{ewb.vehicleNumber || '—'}</td>
                  <td className="px-4 py-2 text-right">{ewb.distanceKm}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmtINR(ewb.totalValue)}</td>
                  <td className="px-4 py-2 text-xs text-[#6B2410]">
                    {ewb.validUntil ? new Date(ewb.validUntil).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={ewb.status}
                      onChange={(e) => updateStatus(ewb._id, e.target.value)}
                      className="text-xs border-0 rounded px-1 py-0.5 bg-white"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(ewb._id)} className="text-xs text-red-600 hover:underline">
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
        title="Generate E-Way Bill"
        width="max-w-4xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Generate</PrimaryButton>
          </>
        }
      >
        <h3 className="text-sm font-semibold text-[#4A1D0F] mb-2">Document</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Document Type">
            <SelectInput value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}>
              <option value="invoice">Invoice</option>
              <option value="bill-of-supply">Bill of Supply</option>
              <option value="delivery-challan">Delivery Challan</option>
              <option value="credit-note">Credit Note</option>
            </SelectInput>
          </Field>
          <Field label="Document Number" required>
            <TextInput value={form.documentNumber || ''} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} />
          </Field>
          <Field label="Document Date">
            <TextInput type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} />
          </Field>
          <Field label="Sub Type">
            <SelectInput value={form.subType} onChange={(e) => setForm({ ...form, subType: e.target.value })}>
              {SUB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </SelectInput>
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-[#4A1D0F] mt-4 mb-2">From (Consignor)</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="GSTIN" required>
            <TextInput value={form.fromGstin || ''} onChange={(e) => setForm({ ...form, fromGstin: e.target.value })} />
          </Field>
          <Field label="Name" required>
            <TextInput value={form.fromName || ''} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
          </Field>
          <Field label="State" required>
            <TextInput value={form.fromState || ''} onChange={(e) => setForm({ ...form, fromState: e.target.value })} />
          </Field>
          <Field label="Pincode" required>
            <TextInput value={form.fromPincode || ''} onChange={(e) => setForm({ ...form, fromPincode: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <TextInput value={form.fromAddress || ''} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} />
            </Field>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-[#4A1D0F] mt-4 mb-2">To (Consignee)</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="GSTIN" required>
            <TextInput value={form.toGstin || ''} onChange={(e) => setForm({ ...form, toGstin: e.target.value })} />
          </Field>
          <Field label="Name" required>
            <TextInput value={form.toName || ''} onChange={(e) => setForm({ ...form, toName: e.target.value })} />
          </Field>
          <Field label="State" required>
            <TextInput value={form.toState || ''} onChange={(e) => setForm({ ...form, toState: e.target.value })} />
          </Field>
          <Field label="Pincode" required>
            <TextInput value={form.toPincode || ''} onChange={(e) => setForm({ ...form, toPincode: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <TextInput value={form.toAddress || ''} onChange={(e) => setForm({ ...form, toAddress: e.target.value })} />
            </Field>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-[#4A1D0F] mt-4 mb-2">Transport</h3>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Mode">
            <SelectInput value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value })}>
              <option value="road">Road</option>
              <option value="rail">Rail</option>
              <option value="air">Air</option>
              <option value="ship">Ship</option>
            </SelectInput>
          </Field>
          <Field label="Vehicle #">
            <TextInput value={form.vehicleNumber || ''} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} />
          </Field>
          <Field label="Distance (km)">
            <TextInput type="number" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: Number(e.target.value) })} />
          </Field>
          <Field label="Transporter">
            <TextInput value={form.transporterName || ''} onChange={(e) => setForm({ ...form, transporterName: e.target.value })} />
          </Field>
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#4A1D0F]">Items</h3>
          <button onClick={addItem} className="text-xs text-[#E2671A]">+ Add item</button>
        </div>
        {form.items.map((it: any, i: number) => (
          <div key={i} className="grid grid-cols-12 gap-2 mb-2">
            <input
              placeholder="Item name"
              value={it.itemName}
              onChange={(e) => updateItem(i, { itemName: e.target.value })}
              className="col-span-3 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              placeholder="HSN"
              value={it.hsnCode}
              onChange={(e) => updateItem(i, { hsnCode: e.target.value })}
              className="col-span-2 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Qty"
              value={it.quantity}
              onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="Taxable"
              value={it.taxableValue}
              onChange={(e) => updateItem(i, { taxableValue: Number(e.target.value) })}
              className="col-span-2 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="CGST%"
              value={it.cgstRate}
              onChange={(e) => updateItem(i, { cgstRate: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="SGST%"
              value={it.sgstRate}
              onChange={(e) => updateItem(i, { sgstRate: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <input
              type="number"
              placeholder="IGST%"
              value={it.igstRate}
              onChange={(e) => updateItem(i, { igstRate: Number(e.target.value) })}
              className="col-span-1 px-2 py-1 text-sm border border-[#FFE5C4] rounded"
            />
            <button onClick={() => removeItem(i)} className="col-span-1 text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>
    </>
  );
}
