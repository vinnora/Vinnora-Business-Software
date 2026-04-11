'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { Modal, Field, TextInput, TextArea, SelectInput } from '../_components/Modal';

type Activity = {
  _id: string;
  type: string;
  subject: string;
  status: string;
  priority?: string;
  dueDate?: string;
  completedAt?: string;
  relatedToType?: string;
  relatedToName?: string;
  description?: string;
  createdAt: string;
};

const TYPES = ['Call', 'Email', 'Meeting', 'Task', 'Note'];
const STATUSES = ['Open', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Normal', 'High'];

const TYPE_ICON: Record<string, string> = {
  Call: '📞',
  Email: '✉️',
  Meeting: '📅',
  Task: '✓',
  Note: '📝',
};

const TYPE_COLORS: Record<string, string> = {
  Call: 'bg-green-100 text-green-800',
  Email: 'bg-blue-100 text-blue-800',
  Meeting: 'bg-purple-100 text-purple-800',
  Task: 'bg-amber-100 text-amber-800',
  Note: 'bg-gray-100 text-gray-700',
};

export default function ActivitiesPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Activity>>({
    type: 'Task',
    status: 'Open',
    priority: 'Normal',
  });

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    const data = await fetch(`/api/sales-service/activities?${params}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [typeFilter]);

  const save = async () => {
    if (!form.type || !form.subject) return;
    await fetch('/api/sales-service/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setOpen(false);
    setForm({ type: 'Task', status: 'Open', priority: 'Normal' });
    load();
  };

  const complete = async (id: string) => {
    await fetch('/api/sales-service/activities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: id, status: 'Completed' }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    await fetch(`/api/sales-service/activities?id=${id}`, { method: 'DELETE' });
    load();
  };

  // Group by date
  const grouped = items.reduce((acc: Record<string, Activity[]>, a) => {
    const key = a.dueDate
      ? new Date(a.dueDate).toLocaleDateString()
      : new Date(a.createdAt).toLocaleDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Activities"
        subtitle="Timeline"
        count={items.length}
        actions={
          <>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
            >
              + Log Activity
            </button>
          </>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
            No activities yet. Click <strong>+ Log Activity</strong> to record one.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, acts]) => (
              <div key={date}>
                <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">{date}</div>
                <div className="space-y-2">
                  {acts.map((a) => (
                    <div
                      key={a._id}
                      className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3 hover:shadow-sm transition"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${TYPE_COLORS[a.type]}`}>
                        {TYPE_ICON[a.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{a.subject}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${TYPE_COLORS[a.type]}`}>
                            {a.type}
                          </span>
                          {a.status === 'Completed' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        {a.relatedToName && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Related to {a.relatedToType}: <span className="text-[#0176d3]">{a.relatedToName}</span>
                          </div>
                        )}
                        {a.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {a.status !== 'Completed' && (
                          <button
                            onClick={() => complete(a._id)}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Mark complete
                          </button>
                        )}
                        <button onClick={() => remove(a._id)} className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Log Activity"
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
          <Field label="Type">
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="col-span-2">
            <Field label="Subject" required>
              <TextInput value={form.subject || ''} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
          </div>
          <Field label="Priority">
            <SelectInput value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Due Date">
            <TextInput
              type="datetime-local"
              value={form.dueDate || ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <TextArea
                rows={4}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </>
  );
}
