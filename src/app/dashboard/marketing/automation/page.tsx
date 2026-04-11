'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Modal, Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, Badge } from '../_components/ui';

type Step = { stepId: string; order: number; type: string; config: Record<string, any> };
type Automation = { _id: string; name: string; description?: string; active: boolean; triggerType: string; triggerConfig: Record<string, any>; steps: Step[]; enrolledCount: number; completedCount: number; runCount: number; lastRunAt?: string; createdAt: string };

const TRIGGERS = ['formSubmission', 'leadCreated', 'leadScoreReached', 'emailOpened', 'emailClicked', 'eventRegistered', 'tagAdded', 'manual'];
const STEP_TYPES = ['sendEmail', 'sendSms', 'wait', 'condition', 'updateLead', 'addTag', 'notifyOwner', 'pushToSales'];
const TRIGGER_LABELS: Record<string, string> = { formSubmission: 'Form Submission', leadCreated: 'Lead Created', leadScoreReached: 'Score Reached', emailOpened: 'Email Opened', emailClicked: 'Email Clicked', eventRegistered: 'Event Registration', tagAdded: 'Tag Added', manual: 'Manual' };

export default function AutomationPage() {
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  function emptyForm() {
    return { name: '', description: '', active: false, triggerType: 'manual', triggerConfig: {}, steps: [] as Step[] };
  }

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const data = await fetch(`/api/marketing/automation?${params}`).then(r => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name || !form.triggerType) return;
    const method = editing ? 'PATCH' : 'POST';
    const payload = editing ? { _id: editing._id, ...form } : form;
    await fetch('/api/marketing/automation', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setOpen(false); setEditing(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    await fetch(`/api/marketing/automation?id=${id}`, { method: 'DELETE' }); load();
  };

  const toggleActive = async (a: Automation) => {
    await fetch('/api/marketing/automation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _id: a._id, active: !a.active }) });
    load();
  };

  const addStep = () => {
    setForm({ ...form, steps: [...form.steps, { stepId: `s-${Date.now()}`, order: form.steps.length + 1, type: 'sendEmail', config: {} }] });
  };

  const updateStep = (i: number, patch: any) => {
    setForm({ ...form, steps: form.steps.map((s: any, idx: number) => idx === i ? { ...s, ...patch } : s) });
  };

  const removeStep = (i: number) => {
    setForm({ ...form, steps: form.steps.filter((_: any, idx: number) => idx !== i).map((s: any, idx: number) => ({ ...s, order: idx + 1 })) });
  };

  return (
    <>
      <PageHeader title="Automation" subtitle="Marketing" count={items.length} actions={
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search…" className="px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none" />
          <PrimaryButton onClick={() => { setEditing(null); setForm(emptyForm()); setOpen(true); }}>+ New Automation</PrimaryButton>
        </>
      } />

      <div className="p-6">
        <div className="bg-white border border-[#D6E5EC] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F9FB] text-xs uppercase text-[#5A7A8C]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Trigger</th>
                <th className="text-center px-4 py-2.5">Active</th>
                <th className="text-right px-4 py-2.5">Steps</th>
                <th className="text-right px-4 py-2.5">Enrolled</th>
                <th className="text-right px-4 py-2.5">Runs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A8B8]">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#94A8B8]">No automations yet.</td></tr>
              ) : items.map(a => (
                <tr key={a._id} className="border-t border-[#E8F1F5] hover:bg-[#F4F9FB]">
                  <td className="px-4 py-2">
                    <div className="font-medium text-[#3D5266]">{a.name}</div>
                    {a.description && <div className="text-[10px] text-[#94A8B8] truncate max-w-[200px]">{a.description}</div>}
                  </td>
                  <td className="px-4 py-2"><Badge tone="air">{TRIGGER_LABELS[a.triggerType] || a.triggerType}</Badge></td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => toggleActive(a)} className={`px-2 py-0.5 text-xs rounded ${a.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{a.active ? 'ON' : 'OFF'}</button>
                  </td>
                  <td className="px-4 py-2 text-right">{a.steps?.length || 0}</td>
                  <td className="px-4 py-2 text-right">{a.enrolledCount}</td>
                  <td className="px-4 py-2 text-right">{a.runCount}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(a); setForm({ ...a }); setOpen(true); }} className="text-xs text-[#5A7A8C] hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Automation' : 'New Automation'} width="max-w-3xl" footer={<><SecondaryButton onClick={() => setOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={save}>Save</PrimaryButton></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required><TextInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Trigger" required><SelectInput value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value })}>{TRIGGERS.map(t => <option key={t} value={t}>{TRIGGER_LABELS[t] || t}</option>)}</SelectInput></Field>
        </div>
        <Field label="Description"><TextArea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="flex items-center gap-2 my-3">
          <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="rounded" />
          <span className="text-sm text-[#5A7A8C]">Active</span>
        </div>

        <div className="mt-4 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#3D5266]">Steps ({form.steps.length})</h3>
          <button type="button" onClick={addStep} className="text-xs text-[#5A7A8C]">+ Add step</button>
        </div>
        {form.steps.map((s: any, i: number) => (
          <div key={s.stepId} className="border border-[#D6E5EC] rounded p-3 mb-2 flex items-center gap-3">
            <span className="text-xs text-[#94A8B8] font-mono w-6">{s.order}</span>
            <SelectInput value={s.type} onChange={e => updateStep(i, { type: e.target.value })} style={{ width: 160 }}>
              {STEP_TYPES.map(t => <option key={t}>{t}</option>)}
            </SelectInput>
            <div className="flex-1 text-xs text-[#94A8B8]">{s.type === 'wait' ? 'Delay before next step' : s.type === 'sendEmail' ? 'Send an email' : s.type === 'sendSms' ? 'Send SMS' : s.type === 'condition' ? 'Branch on condition' : s.type === 'addTag' ? 'Add tag to lead' : s.type === 'pushToSales' ? 'Convert to Sales lead' : s.type}</div>
            <button type="button" onClick={() => removeStep(i)} className="text-red-600 text-xs">×</button>
          </div>
        ))}
      </Modal>
    </>
  );
}
