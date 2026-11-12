'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type SocialPost = { _id: string; platform: string; accountName?: string; content: string; mediaUrls?: string[]; linkUrl?: string; status: string; scheduledAt?: string; publishedAt?: string; metrics: { impressions: number; reach: number; likes: number; shares: number; comments: number; clicks: number }; createdAt: string };

const PLATFORMS = ['Facebook', 'Instagram', 'Twitter', 'LinkedIn', 'YouTube', 'Other'];
const STATUSES = ['Draft', 'Scheduled', 'Published', 'Failed'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Scheduled: 'blue', Published: 'green', Failed: 'red' };
const PLATFORM_EMOJI: Record<string, string> = { Facebook: '📘', Instagram: '📸', Twitter: '🐦', LinkedIn: '💼', YouTube: '▶️', Other: '🌐' };

export default function SocialMediaPage() {
  const [items, setItems] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [form, setForm] = useState<any>({ platform: 'Facebook', content: '', status: 'Draft', mediaUrls: [''], linkUrl: '' });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (platformFilter) params.set('platform', platformFilter);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/social?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [platformFilter, statusFilter]);

  const save = async () => {
    if (!form.platform || !form.content) return;
    const payload = { ...form, mediaUrls: (form.mediaUrls || []).filter(Boolean) };
    const method = editing ? 'PATCH' : 'POST';
    const body = editing ? { _id: editing._id, ...payload } : payload;
    const res = await fetch('/api/marketing/social', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || 'Could not save'); return; }
    setOpen(false); setEditing(null); setForm({ platform: 'Facebook', content: '', status: 'Draft', mediaUrls: [''], linkUrl: '' }); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    const res = await fetch(`/api/marketing/social?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    load();
  };

  return (
    <>
      <PageHeader title="Social Media" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <SelectInput value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}><option value="">All platforms</option>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</SelectInput>
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm({ platform: 'Facebook', content: '', status: 'Draft', mediaUrls: [''], linkUrl: '' }); setOpen(true); }}>+ New Post</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-full text-center text-[#94A8B8] py-8">Loading…</div> :
           items.length === 0 ? <div className="col-span-full text-center text-[#94A8B8] py-8">No posts yet.</div> :
           items.map(p => (
            <div key={p._id} className="bg-white border border-[#D6E5EC] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{PLATFORM_EMOJI[p.platform] || '🌐'} <span className="text-sm font-medium text-[#3D5266]">{p.platform}</span></span>
                <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              </div>
              <p className="text-sm text-[#5A7A8C] line-clamp-3 mb-2">{p.content}</p>
              {p.linkUrl && <div className="text-xs text-[#94A8B8] truncate mb-2">{p.linkUrl}</div>}
              <div className="flex gap-3 text-xs text-[#94A8B8] mb-3">
                <span>{p.metrics?.likes || 0} likes</span>
                <span>{p.metrics?.shares || 0} shares</span>
                <span>{p.metrics?.clicks || 0} clicks</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94A8B8]">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : p.scheduledAt ? `Sched: ${new Date(p.scheduledAt).toLocaleDateString()}` : 'Draft'}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(p); setForm({ ...p, mediaUrls: p.mediaUrls?.length ? p.mediaUrls : [''] }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline">Edit</button>
                  <button onClick={() => remove(p._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
           ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Post' : 'New Post'} width="max-w-2xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Platform" required><SelectInput value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>{PLATFORMS.map(p => <option key={p}>{p}</option>)}</SelectInput></Field>
          <Field label="Status"><SelectInput value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
        </div>
        <Field label="Content" required><TextArea rows={4} value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} /></Field>
        <Field label="Link URL"><TextInput value={form.linkUrl || ''} onChange={e => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://..." /></Field>
        <Field label="Media URLs">
          {(form.mediaUrls || ['']).map((url: string, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <TextInput value={url} onChange={e => { const urls = [...(form.mediaUrls || [''])]; urls[i] = e.target.value; setForm({ ...form, mediaUrls: urls }); }} placeholder="https://..." />
              <button type="button" onClick={() => setForm({ ...form, mediaUrls: (form.mediaUrls || []).filter((_: any, idx: number) => idx !== i) })} className="text-red-600 text-xs">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, mediaUrls: [...(form.mediaUrls || []), ''] })} className="text-xs text-[#5A7A8C]">+ Add media</button>
        </Field>
        <Field label="Scheduled At"><TextInput type="datetime-local" value={form.scheduledAt ? (form.scheduledAt as string).slice(0, 16) : ''} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
