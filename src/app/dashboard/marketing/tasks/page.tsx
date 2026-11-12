'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type Task = { _id: string; title: string; description?: string; status: string; priority: string; assigneeName?: string; dueDate?: string; completedAt?: string; campaignId?: string; createdAt: string };

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUS_TONE: Record<string, any> = { 'To Do': 'gray', 'In Progress': 'blue', Review: 'amber', Done: 'green' };
const PRIORITY_TONE: Record<string, any> = { Low: 'gray', Medium: 'blue', High: 'amber', Urgent: 'red' };

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return { title: '', description: '', status: 'To Do', priority: 'Medium', assigneeName: '', dueDate: '' };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/tasks?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const save = async () => {
    if (!form.title) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/marketing/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this to-do?')) return;
    await fetch(`/api/marketing/tasks?id=${id}`, { method: 'DELETE' }); load();
  };

  const moveTask = async (task: Task, newStatus: string) => {
    await fetch('/api/marketing/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: task._id, status: newStatus }) });
    load();
  };

  return (
    <>
      <PageHeader title="To-dos" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <div className="flex border border-[#D6E5EC] rounded overflow-hidden">
            <button onClick={() => setView('board')} className={`px-2 py-1.5 text-xs ${view === 'board' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>Board</button>
            <button onClick={() => { setView('list'); setStatusFilter(''); }} className={`px-2 py-1.5 text-xs ${view === 'list' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>List</button>
          </div>
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New To-do</PrimaryButton>
        </>
      } />

      <div className="p-6">
        {loading ? <div className="text-center text-[#94A8B8] py-8">Loading…</div> :
         view === 'board' ? (
          <div className="grid grid-cols-4 gap-4">
            {STATUSES.map(status => {
              const tasks = items.filter(t => t.status === status);
              return (
                <div key={status} className="bg-[#F4F9FB] rounded-lg p-3 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#3D5266] uppercase">{status}</span>
                    <span className="text-xs text-[#94A8B8]">{tasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(t => (
                      <div key={t._id} className="bg-white border border-[#D6E5EC] rounded-lg p-3">
                        <div className="text-sm font-medium text-[#3D5266] mb-1">{t.title}</div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                          {t.assigneeName && <span className="text-[10px] text-[#94A8B8]">{t.assigneeName}</span>}
                        </div>
                        {t.dueDate && <div className="text-[10px] text-[#94A8B8] mb-2">Due: {new Date(t.dueDate).toLocaleDateString()}</div>}
                        <div className="flex gap-1 flex-wrap">
                          {STATUSES.filter(s => s !== status).map(s => (
                            <button key={s} onClick={() => moveTask(t, s)} className="text-[10px] px-1.5 py-0.5 border border-[#D6E5EC] rounded text-[#5A7A8C] hover:bg-[#F4F9FB]">→ {s}</button>
                          ))}
                          <button onClick={() => { setEditing(t); setForm({ ...t, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '' }); setOpen(true); }} className="text-[10px] text-[#5A7A8C] hover:underline ml-auto">Edit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
                <tr>
                  <th className="text-left px-4 py-2.5">Title</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Priority</th>
                  <th className="text-left px-4 py-2.5">Assignee</th>
                  <th className="text-left px-4 py-2.5">Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A8B8]">No to-dos yet.</td></tr>
                ) : items.map(t => (
                  <tr key={t._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                    <td className="px-4 py-2 font-medium text-[#3D5266]">{t.title}</td>
                    <td className="px-4 py-2"><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></td>
                    <td className="px-4 py-2"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                    <td className="px-4 py-2 text-[#5A7A8C]">{t.assigneeName || '—'}</td>
                    <td className="px-4 py-2 text-xs text-[#94A8B8]">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(t); setForm({ ...t, dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '' }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                      <button onClick={() => remove(t._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit To-do' : 'New To-do'} footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <Field label="Title" required><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status"><SelectInput value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="Priority"><SelectInput value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</SelectInput></Field>
          <Field label="Assignee"><TextInput value={form.assigneeName || ''} onChange={e => setForm({ ...form, assigneeName: e.target.value })} /></Field>
          <Field label="Due Date"><TextInput type="date" value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
        </div>
        <Field label="Description"><TextArea rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
