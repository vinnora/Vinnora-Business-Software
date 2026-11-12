'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Article = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  body: string;
  category?: string;
  status: string;
  visibility: string;
  views: number;
  helpfulCount: number;
  updatedAt: string;
};

const STATUSES = ['Draft', 'Published', 'Archived'];
const VISIBILITIES = ['Internal', 'Public'];

export default function KnowledgePage() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Article | null>(null);
  const [form, setForm] = useState<Partial<Article>>({ status: 'Draft', visibility: 'Internal' });

  const load = async () => {
    setLoading(true);
    const url = search
      ? `/api/sales-service/knowledge?search=${encodeURIComponent(search)}`
      : '/api/sales-service/knowledge';
    const data = await fetch(url).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title || !form.body) return;
    const res = await fetch('/api/sales-service/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || 'Could not save');
    setOpen(false);
    setForm({ status: 'Draft', visibility: 'Internal' });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this help article?')) return;
    const res = await fetch(`/api/sales-service/knowledge?id=${id}`, { method: 'DELETE' });
    if (!res.ok) return alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    setSelected(null);
    load();
  };

  return (
    <>
      <PageHeader
        title="Help Library"
        subtitle="Service"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search help articles…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded"
            />
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + New Help Article
            </button>
          </>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[#f3f3f3] text-xs uppercase text-gray-600 font-semibold">
            Help Articles
          </div>
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No help articles yet.</div>
          ) : (
            <ul>
              {items.map((a) => (
                <li
                  key={a._id}
                  onClick={() => setSelected(a)}
                  className={`px-4 py-3 border-t border-gray-100 cursor-pointer hover:bg-blue-50/30 ${
                    selected?._id === a._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 truncate">{a.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      a.status === 'Published' ? 'bg-green-100 text-green-800' :
                      a.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{a.category || 'Uncategorized'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          {selected ? (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selected.title}</h2>
                  <div className="text-xs text-gray-500 mt-1">
                    {selected.category || 'Uncategorized'} • {selected.visibility} • {selected.views} views
                  </div>
                </div>
                <button onClick={() => remove(selected._id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
              {selected.summary && (
                <p className="text-sm text-gray-600 italic mb-4">{selected.summary}</p>
              )}
              <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                {selected.body}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-16">
              <div className="text-4xl mb-2">📚</div>
              <div className="text-sm">Select a help article to view its content</div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Help Article"
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
        <Field label="Title" required>
          <TextInput value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Summary">
          <TextInput value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category">
            <TextInput value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Visibility">
            <SelectInput value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
              {VISIBILITIES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Body" required>
          <TextArea rows={10} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}
