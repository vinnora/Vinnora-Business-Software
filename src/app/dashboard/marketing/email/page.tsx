'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader, Modal, Field, TextInput, TextArea, SelectInput,
  PrimaryButton, SecondaryButton, Badge,
} from '../_components/ui';

type EmailMsg = {
  _id: string;
  name: string;
  subject: string;
  fromName?: string;
  fromEmail?: string;
  bodyHtml: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  metrics: { sent: number; delivered: number; opened: number; clicked: number; bounced: number; unsubscribed: number };
  createdAt: string;
};

type Template = { _id: string; name: string; category: string; subject: string; bodyHtml: string; active: boolean };

const STATUSES = ['Draft', 'Scheduled', 'Sending', 'Sent', 'Failed'];
const TEMPLATE_CATS = ['Newsletter', 'Promotional', 'Transactional', 'Welcome', 'Other'];
const STATUS_TONE: Record<string, any> = { Draft: 'gray', Scheduled: 'blue', Sending: 'amber', Sent: 'green', Failed: 'red' };

export default function EmailPage() {
  const [tab, setTab] = useState<'messages' | 'templates'>('messages');
  const [messages, setMessages] = useState<EmailMsg[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [tplOpen, setTplOpen] = useState(false);
  const [tplEditing, setTplEditing] = useState<any>(null);
  const [tplForm, setTplForm] = useState<any>({});

  const loadMessages = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await fetch(`/api/marketing/email/messages?${params}`).then(r => r.json());
    setMessages(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadTemplates = async () => {
    const data = await fetch('/api/marketing/email/templates').then(r => r.json());
    setTemplates(Array.isArray(data) ? data : []);
  };

  useEffect(() => { loadMessages(); loadTemplates(); }, [statusFilter]);

  const saveMsg = async () => {
    if (!form.name || !form.subject) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    const res = await fetch('/api/marketing/email/messages', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || 'Could not save'); return; }
    setOpen(false); setEditing(null); setForm({}); loadMessages();
  };

  const removeMsg = async (id: string) => {
    if (!confirm('Delete this email?')) return;
    const res = await fetch(`/api/marketing/email/messages?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    loadMessages();
  };

  const saveTpl = async () => {
    if (!tplForm.name || !tplForm.subject || !tplForm.bodyHtml) return;
    const method = tplEditing ? 'PATCH' : 'POST';
    const payload = tplEditing ? { _id: tplEditing._id, ...tplForm } : tplForm;
    const res = await fetch('/api/marketing/email/templates', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { alert((await res.json().catch(() => ({}))).error || 'Could not save'); return; }
    setTplOpen(false); setTplEditing(null); setTplForm({}); loadTemplates();
  };

  const removeTpl = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const res = await fetch(`/api/marketing/email/templates?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error || 'Could not delete');
    loadTemplates();
  };

  const applyTemplate = (t: Template) => {
    setForm({ ...form, subject: t.subject, bodyHtml: t.bodyHtml, templateId: t._id });
  };

  return (
    <>
      <PageHeader
        title="Email Marketing"
        subtitle="Marketing"
        count={tab === 'messages' ? messages.length : templates.length}
        actions={
          <>
            <div className="flex border border-[#D6E5EC] rounded overflow-hidden mr-2">
              <button onClick={() => setTab('messages')} className={`px-3 py-1.5 text-xs ${tab === 'messages' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>Messages</button>
              <button onClick={() => setTab('templates')} className={`px-3 py-1.5 text-xs ${tab === 'templates' ? 'bg-[#5A7A8C] text-white' : 'text-[#5A7A8C]'}`}>Templates</button>
            </div>
            {tab === 'messages' ? (
              <>
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadMessages()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
                <SelectInput value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput>
                <PrimaryButton onClick={() => { setEditing(null); setForm({ name: '', subject: '', fromName: '', fromEmail: '', bodyHtml: '', status: 'Draft' }); setOpen(true); }}>+ New Email</PrimaryButton>
              </>
            ) : (
              <PrimaryButton onClick={() => { setTplEditing(null); setTplForm({ name: '', category: 'Other', subject: '', bodyHtml: '', active: true }); setTplOpen(true); }}>+ New Template</PrimaryButton>
            )}
          </>
        }
      />

      <div className="p-6">
        {tab === 'messages' ? (
          <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Subject</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Sent</th>
                  <th className="text-right px-4 py-2.5">Opened</th>
                  <th className="text-right px-4 py-2.5">Clicked</th>
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">Loading…</td></tr>
                ) : messages.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#94A8B8]">No emails yet.</td></tr>
                ) : messages.map(m => (
                  <tr key={m._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                    <td className="px-4 py-2 font-medium text-[#3D5266]">{m.name}</td>
                    <td className="px-4 py-2 text-[#5A7A8C] truncate max-w-[200px]">{m.subject}</td>
                    <td className="px-4 py-2"><Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge></td>
                    <td className="px-4 py-2 text-right">{m.metrics?.sent || 0}</td>
                    <td className="px-4 py-2 text-right">{m.metrics?.opened || 0}</td>
                    <td className="px-4 py-2 text-right">{m.metrics?.clicked || 0}</td>
                    <td className="px-4 py-2 text-xs text-[#94A8B8]">{m.sentAt ? new Date(m.sentAt).toLocaleDateString() : m.scheduledAt ? `Sched: ${new Date(m.scheduledAt).toLocaleDateString()}` : '—'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setEditing(m); setForm({ ...m }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                      <button onClick={() => removeMsg(m._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.length === 0 ? (
              <div className="col-span-full text-center text-[#94A8B8] py-8">No templates yet.</div>
            ) : templates.map(t => (
              <div key={t._id} className="bg-white border border-[#D6E5EC] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#3D5266]">{t.name}</span>
                  <Badge tone={t.active ? 'green' : 'gray'}>{t.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <div className="text-xs text-[#94A8B8] mb-1">{t.category}</div>
                <div className="text-sm text-[#5A7A8C] truncate mb-3">{t.subject}</div>
                <div className="flex gap-2">
                  <button onClick={() => { setTplEditing(t); setTplForm({ ...t }); setTplOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline">Edit</button>
                  <button onClick={() => removeTpl(t._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email Message Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Email' : 'Compose Email'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={saveMsg}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><TextInput value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Status"><SelectInput value={form.status || 'Draft'} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</SelectInput></Field>
          <Field label="From Name"><TextInput value={form.fromName || ''} onChange={e => setForm({ ...form, fromName: e.target.value })} /></Field>
          <Field label="From Email"><TextInput type="email" value={form.fromEmail || ''} onChange={e => setForm({ ...form, fromEmail: e.target.value })} /></Field>
        </div>
        <Field label="Subject" required><TextInput value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
        {templates.length > 0 && (
          <Field label="Apply Template">
            <div className="flex gap-2 flex-wrap">
              {templates.filter(t => t.active).map(t => (
                <button key={t._id} type="button" onClick={() => applyTemplate(t)} className="px-2 py-1 text-xs border border-[#D6E5EC] rounded hover:bg-[#F4F9FB] text-[#5A7A8C]">{t.name}</button>
              ))}
            </div>
          </Field>
        )}
        <Field label="Body HTML" required><TextArea rows={8} value={form.bodyHtml || ''} onChange={e => setForm({ ...form, bodyHtml: e.target.value })} /></Field>
        <Field label="Scheduled At"><TextInput type="datetime-local" value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ''} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
      </Modal>

      {/* Template Modal */}
      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title={tplEditing ? 'Edit Template' : 'New Template'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setTplOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={saveTpl}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Template Name" required><TextInput value={tplForm.name || ''} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} /></Field>
          <Field label="Category"><SelectInput value={tplForm.category || 'Other'} onChange={e => setTplForm({ ...tplForm, category: e.target.value })}>{TEMPLATE_CATS.map(c => <option key={c}>{c}</option>)}</SelectInput></Field>
        </div>
        <Field label="Subject" required><TextInput value={tplForm.subject || ''} onChange={e => setTplForm({ ...tplForm, subject: e.target.value })} /></Field>
        <Field label="Body HTML" required><TextArea rows={10} value={tplForm.bodyHtml || ''} onChange={e => setTplForm({ ...tplForm, bodyHtml: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
