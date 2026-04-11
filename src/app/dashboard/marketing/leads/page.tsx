'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Modal,
  Field,
  TextInput,
  SelectInput,
  PrimaryButton,
  SecondaryButton,
  Badge,
} from '../_components/ui';

type MktLead = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  sourceDetail?: string;
  campaignId?: string;
  score: number;
  stage: string;
  tags?: string[];
  createdAt: string;
};

type Campaign = { _id: string; name: string };

const SOURCES = ['Landing Page', 'Form', 'Social', 'Referral', 'Event', 'Import', 'Other'];
const STAGES = ['New', 'Engaged', 'MQL', 'Handed Off', 'Disqualified'];

const STAGE_TONE: Record<string, any> = {
  New: 'blue',
  Engaged: 'amber',
  MQL: 'green',
  'Handed Off': 'purple',
  Disqualified: 'red',
};

export default function MktLeadsPage() {
  const [items, setItems] = useState<MktLead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MktLead | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      source: 'Other',
      sourceDetail: '',
      campaignId: '',
      score: 0,
      stage: 'New',
      tags: [],
    };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sourceFilter) params.set('source', sourceFilter);
    if (stageFilter) params.set('stage', stageFilter);
    const data = await fetch(`/api/marketing/leads?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [sourceFilter, stageFilter]);

  useEffect(() => {
    fetch('/api/marketing/campaigns')
      .then((r) => r.json())
      .then((d) => setCampaigns(Array.isArray(d) ? d : []));
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const startEdit = (lead: MktLead) => {
    setEditing(lead);
    setForm({ ...lead });
    setOpen(true);
  };

  const save = async () => {
    if (!form.firstName || !form.lastName) return;
    const payload = {
      ...form,
      score: Number(form.score) || 0,
    };
    if (editing) {
      await fetch('/api/marketing/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: editing._id, ...payload }),
      });
    } else {
      await fetch('/api/marketing/leads', {
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
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/marketing/leads?id=${id}`, { method: 'DELETE' });
    load();
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return 'text-green-700 bg-green-100';
    if (score >= 40) return 'text-amber-700 bg-amber-100';
    return 'text-[#94A8B8] bg-[#F4F9FB]';
  };

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Marketing"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search name, email, company…"
              className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none"
            />
            <SelectInput value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">All sources</option>
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <SelectInput value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="">All stages</option>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
            <PrimaryButton onClick={startCreate}>+ New Lead</PrimaryButton>
          </>
        }
      />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">Company</th>
                <th className="text-left px-4 py-2.5">Source</th>
                <th className="text-center px-4 py-2.5">Score</th>
                <th className="text-left px-4 py-2.5">Stage</th>
                <th className="text-left px-4 py-2.5">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr key={l._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                    <td className="px-4 py-2 font-medium text-[#3D5266]">
                      {l.firstName} {l.lastName}
                    </td>
                    <td className="px-4 py-2 text-[#5A7A8C]">{l.email || '—'}</td>
                    <td className="px-4 py-2 text-[#5A7A8C]">{l.company || '—'}</td>
                    <td className="px-4 py-2 text-xs text-[#5A7A8C]">{l.source}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${scoreColor(l.score)}`}
                      >
                        {l.score}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={STAGE_TONE[l.stage] || 'gray'}>{l.stage}</Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#94A8B8]">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(l)}
                        className="text-xs text-[#5A7A8C] hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(l._id)}
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
        title={editing ? 'Edit Lead' : 'New Lead'}
        width="max-w-2xl"
        footer={
          <>
            <SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" required>
            <TextInput
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Company">
            <TextInput
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </Field>
          <Field label="Source">
            <SelectInput
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Source Detail">
            <TextInput
              value={form.sourceDetail}
              onChange={(e) => setForm({ ...form, sourceDetail: e.target.value })}
              placeholder="e.g. Homepage form"
            />
          </Field>
          <Field label="Campaign">
            <SelectInput
              value={form.campaignId}
              onChange={(e) => setForm({ ...form, campaignId: e.target.value })}
            >
              <option value="">— None —</option>
              {campaigns.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Score (0-100)">
            <TextInput
              type="number"
              min={0}
              max={100}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
            />
          </Field>
          <Field label="Stage">
            <SelectInput
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            >
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Modal>
    </>
  );
}
