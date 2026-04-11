'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, SelectInput } from '../_components/Modal';

type Contact = {
  _id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  accountId?: string;
  accountName?: string;
  department?: string;
};

type Account = { _id: string; name: string };

export default function ContactsPage() {
  const [items, setItems] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});

  const load = async () => {
    setLoading(true);
    const url = search
      ? `/api/sales-service/contacts?search=${encodeURIComponent(search)}`
      : '/api/sales-service/contacts';
    const data = await fetch(url).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const data = await fetch('/api/sales-service/accounts').then((r) => r.json());
    setAccounts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    loadAccounts();
  }, []);

  const save = async () => {
    if (!form.firstName || !form.lastName) return;
    const accountName = accounts.find((a) => a._id === form.accountId)?.name;
    await fetch('/api/sales-service/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, accountName }),
    });
    setOpen(false);
    setForm({});
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await fetch(`/api/sales-service/contacts?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search contacts…"
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
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No contacts yet.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{c.title || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.accountName || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => remove(c._id)} className="text-xs text-red-600 hover:underline">
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
        title="New Contact"
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
          <Field label="First Name" required>
            <TextInput value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last Name" required>
            <TextInput value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Title">
            <TextInput value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Department">
            <TextInput value={form.department || ''} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
          <Field label="Account">
            <SelectInput value={form.accountId || ''} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
              <option value="">— None —</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
