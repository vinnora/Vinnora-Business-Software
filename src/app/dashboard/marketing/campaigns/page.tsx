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
  fmtINR,
} from '../_components/ui';

type Campaign = {
  _id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  channel: string[];
  startDate?: string;
  endDate?: string;
  budget?: number;
  actualSpend?: number;
  goal?: string;
  targetAudience?: string;
  tags?: string[];
  ownerId?: string;
  ownerName?: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    unsubscribed: number;
    revenue: number;
  };
  createdAt: string;
};

const TYPES = ['Email', 'SMS', 'Social', 'Event', 'Multi-Channel', 'Other'];
const STATUSES = ['Draft', 'Scheduled', 'Active', 'Paused', 'Completed', 'Cancelled'];
const CHANNELS = ['email', 'sms', 'social', 'web', 'push'];

const STATUS_TONE: Record<string, any> = {
  Draft: 'gray',
  Scheduled: 'blue',
  Active: 'green',
  Paused: 'amber',
  Completed: 'purple',
  Cancelled: 'red',
};

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      name: '',
      description: '',
      type: 'Email',
      status: 'Draft',
      channel: [] as string[],
      startDate: '',
      endDate: '',
      budget: '',
      goal: '',
      targetAudience: '',
      tags: [],
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/campaigns?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [typeFilter, statusFilter]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      ...c,
      startDate: c.startDate ? c.startDate.slice(0, 10) : '',
      endDate: c.endDate ? c.endDate.slice(0, 10) : '',
      budget: c.budget || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    const payload = {
      ...form,
      budget: Number(form.budget) || 0,
    };
    if (editing) {
      await fetch('/api/marketing/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/marketing/campaigns', {
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
    if (!confirm('Delete this campaign?')) return;
    await fetch(`/api/marketing/campaigns?id=${id}`, { method: 'DELETE' });
    load();
  };

  const toggleChannel = (ch: string) => {
    setForm({
      ...form,
      channel: form.channel.includes(ch)
        ? form.channel.filter((c: string) => c !== ch)
        : [...form.channel, ch],
    });
  };

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Marketing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search campaigns…"
              className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none"
            />
            <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Campaign</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Channel</th>
                <th className="text-left px-4 py-2.5">Start</th>
                <th className="text-left px-4 py-2.5">End</th>
                <th className="text-right px-4 py-2.5">Sent</th>
                <th className="text-right px-4 py-2.5">Opened</th>
                <th className="text-right px-4 py-2.5">Budget</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#94A8B8]">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#94A8B8]">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                    <td className="px-4 py-2">
                      <div className="font-medium text-[#3D5266]">{c.name}</div>
                      {c.description && (
                        <div className="text-[10px] text-[#94A8B8] truncate max-w-[200px]">
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[#5A7A8C]">{c.type}</td>
                    <td className="px-4 py-2">
                      <Badge tone={STATUS_TONE[c.status] || 'gray'}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-[#5A7A8C] text-xs">
                      {c.channel?.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#5A7A8C]">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#5A7A8C]">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">{c.metrics?.sent || 0}</td>
                    <td className="px-4 py-2 text-right">{c.metrics?.opened || 0}</td>
                    <td className="px-4 py-2 text-right">{c.budget ? fmtINR(c.budget) : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-xs text-[#5A7A8C] hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c._id)}
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
        title={editing ? `Edit Campaign` : 'New Campaign'}
        width="max-w-3xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Campaign Name" required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <SelectInput
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Budget (INR)">
            <TextInput
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </Field>
          <Field label="Start Date">
            <TextInput
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="End Date">
            <TextInput
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Description">
          <TextArea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Goal">
          <TextInput
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            placeholder="e.g. Generate 500 leads"
          />
        </Field>
        <Field label="Target Audience">
          <TextInput
            value={form.targetAudience}
            onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
            placeholder="e.g. SMB owners in Karnataka"
          />
        </Field>

        <Field label="Channels">
          <div className="flex gap-2 flex-wrap">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`px-3 py-1 text-xs rounded border ${
                  form.channel.includes(ch)
                    ? 'bg-[#5A7A8C] text-white border-[#5A7A8C]'
                    : 'bg-white text-[#5A7A8C] border-[#D6E5EC] hover:bg-[#F4F9FB]'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </Field>
      </Modal>
    </>
  );
}
