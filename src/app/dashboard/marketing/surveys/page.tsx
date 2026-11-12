'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type Question = { questionId: string; type: string; text: string; options?: string[]; required: boolean };
type Survey = { _id: string; title: string; description?: string; status: string; questions: Question[]; responseCount: number; expiresAt?: string; createdAt: string };

const STATUSES = ['Draft', 'Active', 'Closed'];
const Q_TYPES = ['text', 'multiChoice', 'rating', 'yesNo', 'scale'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Active: 'green', Closed: 'purple' };

export default function SurveysPage() {
  const [items, setItems] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Survey | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return { title: '', description: '', status: 'Draft', questions: [] as Question[], expiresAt: '' };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/surveys?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const save = async () => {
    if (!form.title) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch('/api/marketing/surveys', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || 'Could not save'); return; }
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this survey?')) return;
    const res = await fetch(`/api/marketing/surveys?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    load();
  };

  const addQuestion = () => {
    setForm({ ...form, questions: [...form.questions, { questionId: `q-${Date.now()}`, type: 'text', text: '', options: [], required: false }] });
  };

  const updateQuestion = (i: number, patch: any) => {
    setForm({ ...form, questions: form.questions.map((q: any, idx: number) => idx === i ? { ...q, ...patch } : q) });
  };

  const removeQuestion = (i: number) => {
    setForm({ ...form, questions: form.questions.filter((_: any, idx: number) => idx !== i) });
  };

  return (
    <>
      <PageHeader title="Surveys & Feedback" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Survey</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Title</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Questions</th>
                <th className="text-right px-4 py-2.5">Responses</th>
                <th className="text-left px-4 py-2.5">Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A8B8]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A8B8]">No surveys yet.</td></tr>
              ) : items.map(s => (
                <tr key={s._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#3D5266]">{s.title}</div>
                    {s.description && <div className="text-[10px] text-[#94A8B8] truncate max-w-[250px]">{s.description}</div>}
                  </td>
                  <td className="px-4 py-2"><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
                  <td className="px-4 py-2 text-right">{s.questions?.length || 0}</td>
                  <td className="px-4 py-2 text-right font-semibold text-[#3D5266]">{s.responseCount}</td>
                  <td className="px-4 py-2 text-xs text-[#94A8B8]">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(s); setForm({ ...s, expiresAt: s.expiresAt ? s.expiresAt.slice(0, 10) : '' }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(s._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Survey' : 'New Survey'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title" required><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Status"><SelectInput value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
        </div>
        <Field label="Description"><TextArea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
        <Field label="Expires At"><TextInput type="date" value={form.expiresAt || ''} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></Field>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#3D5266]">Questions ({form.questions.length})</h3>
          <button type="button" onClick={addQuestion} className="text-xs text-[#5A7A8C]">+ Add question</button>
        </div>
        {form.questions.map((q: any, i: number) => (
          <div key={q.questionId} className="border border-[#D6E5EC] rounded p-3 mb-2">
            <div className="flex gap-2 mb-2">
              <span className="text-xs text-[#94A8B8] mt-2">Q{i + 1}</span>
              <div className="flex-1">
                <TextInput value={q.text} onChange={e => updateQuestion(i, { text: e.target.value })} placeholder="Question text" />
              </div>
              <SelectInput value={q.type} onChange={e => updateQuestion(i, { type: e.target.value })} style={{ width: 130 }}>
                {Q_TYPES.map(t => <option key={t}>{t}</option>)}
              </SelectInput>
              <label className="flex items-center gap-1 text-xs text-[#5A7A8C]">
                <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, { required: e.target.checked })} /> Req
              </label>
              <button type="button" onClick={() => removeQuestion(i)} className="text-red-600 text-xs">×</button>
            </div>
            {q.type === 'multiChoice' && (
              <div className="ml-6">
                <div className="text-xs text-[#94A8B8] mb-1">Options (comma-separated)</div>
                <TextInput value={(q.options || []).join(', ')} onChange={e => updateQuestion(i, { options: e.target.value.split(',').map((o: string) => o.trim()).filter(Boolean) })} placeholder="Option A, Option B, Option C" />
              </div>
            )}
          </div>
        ))}
      </Modal>
    </>
  );
}
