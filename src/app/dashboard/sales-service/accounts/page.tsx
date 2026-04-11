'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Account = {
  _id: string;
  name: string;
  type: string;
  industry?: string;
  phone?: string;
  website?: string;
  billingCity?: string;
  billingCountry?: string;
  annualRevenue?: number;
  employees?: number;
  ownerName?: string;
};

const TYPES = ['Customer', 'Prospect', 'Partner', 'Vendor', 'Other'];

export default function AccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Account>>({ type: 'Prospect' });

  const load = async () => {
    setLoading(true);
    const url = search
      ? `/api/sales-service/accounts?search=${encodeURIComponent(search)}`
      : '/api/sales-service/accounts';
    const data = await fetch(url).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name) return;
    await fetch('/api/sales-service/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ type: 'Prospect' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    await fetch(`/api/sales-service/accounts?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search accounts…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-[#0176d3] focus:outline-none"
            />
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + New
            </button>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Industry</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="text-left px-4 py-2.5">Location</th>
                <th className="text-right px-4 py-2.5">Revenue</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No accounts yet. Click <strong>+ New</strong> to add one.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      <Link href={`/dashboard/sales-service/accounts/${a._id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100">{a.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{a.industry || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{a.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {[a.billingCity, a.billingCountry].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {a.annualRevenue ? `₹${a.annualRevenue.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => remove(a._id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Account"
        footer={
          <>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded">
              Cancel
            </button>
            <button onClick={save} className="px-3 py-1.5 text-sm bg-[#0176d3] text-white rounded">
              Save
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Name" required>
            <TextInput value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Industry">
            <TextInput value={form.industry || ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </Field>
          <Field label="Website">
            <TextInput value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Annual Revenue (₹)">
            <TextInput
              type="number"
              value={form.annualRevenue || ''}
              onChange={(e) => setForm({ ...form, annualRevenue: Number(e.target.value) })}
            />
          </Field>
          <Field label="City">
            <TextInput value={form.billingCity || ''} onChange={(e) => setForm({ ...form, billingCity: e.target.value })} />
          </Field>
          <Field label="Country">
            <TextInput value={form.billingCountry || ''} onChange={(e) => setForm({ ...form, billingCountry: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
