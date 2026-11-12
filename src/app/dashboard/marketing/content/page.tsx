'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type Asset = { _id: string; name: string; description?: string; type: string; fileUrl: string; fileSize?: number; mimeType?: string; thumbnailUrl?: string; folder?: string; tags?: string[]; createdAt: string };

const TYPES = ['Image', 'Document', 'Video', 'Template', 'Other'];
const TYPE_ICON: Record<string, string> = { Image: '🖼', Document: '📄', Video: '🎬', Template: '📐', Other: '📁' };

export default function ContentPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return { name: '', description: '', type: 'Other', fileUrl: '', fileSize: '', mimeType: '', thumbnailUrl: '', folder: '', tags: [] };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    const data = await fetch(`/api/marketing/content?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter]);

  const save = async () => {
    if (!form.name || !form.fileUrl) return;
    const payload = { ...form, fileSize: Number(form.fileSize) || undefined };
    const method = editing ? 'PATCH' : 'POST';
    const body = editing ? { _id: editing._id, ...payload } : payload;
    await fetch('/api/marketing/content', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/marketing/content?id=${id}`, { method: 'DELETE' }); load();
  };

  const fmtSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <>
      <PageHeader title="Content & Assets" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <SelectInput value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput>
          <div className="flex border border-[#D6E5EC] rounded overflow-hidden">
            <button onClick={() => setView('grid')} className={`px-2 py-1.5 text-xs ${view === 'grid' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>Grid</button>
            <button onClick={() => setView('list')} className={`px-2 py-1.5 text-xs ${view === 'list' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>List</button>
          </div>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ Add Asset</PrimaryButton>
        </>
      } />

      <div className="p-6">
        {loading ? <div className="text-center text-[#94A8B8] py-8">Loading…</div> :
         items.length === 0 ? <div className="text-center text-[#94A8B8] py-8">No assets yet.</div> :
         view === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map(a => (
              <div key={a._id} className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden hover:shadow-md transition">
                <div className="h-32 bg-[#F4F9FB] flex items-center justify-center">
                  {a.thumbnailUrl || (a.type === 'Image' && a.fileUrl) ? (
                    <img src={a.thumbnailUrl || a.fileUrl} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{TYPE_ICON[a.type] || '📁'}</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-sm font-medium text-[#3D5266] truncate">{a.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[#94A8B8]">{a.type} • {fmtSize(a.fileSize)}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setEditing(a); setForm({ ...a, fileSize: a.fileSize || '' }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline">Edit</button>
                    <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Folder</th>
                  <th className="text-right px-4 py-2.5">Size</th>
                  <th className="text-left px-4 py-2.5">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                    <td className="px-4 py-2 font-medium text-[#3D5266]">{TYPE_ICON[a.type]} {a.name}</td>
                    <td className="px-4 py-2 text-[#5A7A8C]">{a.type}</td>
                    <td className="px-4 py-2 text-[#94A8B8]">{a.folder || '—'}</td>
                    <td className="px-4 py-2 text-right text-[#94A8B8]">{fmtSize(a.fileSize)}</td>
                    <td className="px-4 py-2 text-xs text-[#94A8B8]">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(a); setForm({ ...a, fileSize: a.fileSize || '' }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                      <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Asset' : 'Add Asset'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type"><SelectInput value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t}>{t}</option>)}</SelectInput></Field>
        </div>
        <Field label="File URL" required><TextInput value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Thumbnail URL"><TextInput value={form.thumbnailUrl || ''} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} /></Field>
          <Field label="Folder"><TextInput value={form.folder || ''} onChange={e => setForm({ ...form, folder: e.target.value })} placeholder="e.g. promotions/q2" /></Field>
          <Field label="MIME Type"><TextInput value={form.mimeType || ''} onChange={e => setForm({ ...form, mimeType: e.target.value })} placeholder="e.g. image/png" /></Field>
          <Field label="File Size (bytes)"><TextInput type="number" value={form.fileSize || ''} onChange={e => setForm({ ...form, fileSize: e.target.value })} /></Field>
        </div>
        <Field label="Description"><TextArea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
