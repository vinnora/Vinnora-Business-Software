'use client';

import { useState } from 'react';
import { PageHeader } from '../_components/PageHeader';
import { ActionErrorBanner, useActionError } from '../_components/ActionError';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

type Opportunity = {
  _id: string;
  name: string;
  accountName?: string;
  accountId?: string;
  amount: number;
  stage: string;
  probability: number;
  closeDate: string;
  ownerName?: string;
  nextStep?: string;
};

const API = '/api/sales-service/opportunities';

const STAGES = [
  'Prospecting',
  'Qualification',
  'Needs Analysis',
  'Value Proposition',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

const STAGE_COLORS: Record<string, string> = {
  Prospecting: 'border-t-gray-400',
  Qualification: 'border-t-blue-400',
  'Needs Analysis': 'border-t-cyan-400',
  'Value Proposition': 'border-t-indigo-400',
  Proposal: 'border-t-violet-500',
  Negotiation: 'border-t-amber-500',
  'Closed Won': 'border-t-green-500',
  'Closed Lost': 'border-t-red-500',
};

const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function OpportunitiesPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [editing, setEditing] = useState<Opportunity | 'new' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const actionError = useActionError();
  const access = useDescribe('Opportunity').data?.access;
  const canCreate = access?.create ?? true;
  const canEdit = access?.edit ?? true;
  const canDelete = access?.delete ?? true;

  const { data, error: loadError, loading, reload, setData } = useLoad(() => api<Opportunity[]>(API), []);
  const items = Array.isArray(data) ? data : [];

  const moveStage = async (id: string, stage: string) => {
    setData((prev) => (prev ? prev.map((o) => (o._id === id ? { ...o, stage } : o)) : prev));
    await actionError.run(() => api(API, { method: 'PATCH', body: { _id: id, stage } }));
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    await actionError.run(() => api(`${API}?id=${id}`, { method: 'DELETE' }));
    reload();
  };

  const totalValue = items
    .filter((o) => !['Closed Won', 'Closed Lost'].includes(o.stage))
    .reduce((s, o) => s + o.amount, 0);

  return (
    <>
      <PageHeader
        title="Deals"
        subtitle="Sales Pipeline"
        count={items.length}
        actions={
          <>
            <div className="hidden md:flex text-xs text-gray-600 mr-2">
              Open pipeline: <strong className="ml-1 text-gray-900">{fmtINR(totalValue)}</strong>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden flex text-sm">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 ${view === 'kanban' ? 'bg-[#0176d3] text-white' : 'bg-white'}`}
              >
                Kanban
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 ${view === 'list' ? 'bg-[#0176d3] text-white' : 'bg-white'}`}
              >
                List
              </button>
            </div>
            {canCreate && (
              <button
                onClick={() => setEditing('new')}
                className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
              >
                + New
              </button>
            )}
          </>
        }
      />

      <ActionErrorBanner error={actionError.error} onDismiss={() => actionError.setError(null)} />

      {view === 'kanban' && loadError ? (
        <div className="p-6 text-sm text-red-600">{loadError}</div>
      ) : view === 'kanban' ? (
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageItems = items.filter((o) => o.stage === stage);
              const stageTotal = stageItems.reduce((s, o) => s + o.amount, 0);
              return (
                <div
                  key={stage}
                  className={`w-64 bg-[#f3f3f3] rounded border-t-4 ${STAGE_COLORS[stage]}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => draggingId && moveStage(draggingId, stage)}
                >
                  <div className="px-3 py-2 border-b border-gray-200">
                    <div className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{stage}</div>
                    <div className="text-xs text-gray-500">
                      {stageItems.length} • {fmtINR(stageTotal)}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[100px]">
                    {stageItems.map((o) => (
                      <div
                        key={o._id}
                        draggable={canEdit}
                        onDragStart={() => setDraggingId(o._id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`bg-white rounded shadow-sm border border-gray-200 p-3 hover:shadow-md transition ${canEdit ? 'cursor-move' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium text-[#0176d3] truncate">{o.name}</div>
                          {canEdit && (
                            <button onClick={() => setEditing(o)} className="text-xs text-[#0176d3] hover:underline shrink-0">
                              Edit
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{o.accountName || '—'}</div>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="font-semibold text-gray-900">{fmtINR(o.amount)}</span>
                          <span className="text-gray-500">{o.probability}%</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Close {new Date(o.closeDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                    {stageItems.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-4">Drop here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Company</th>
                  <th className="text-left px-4 py-2.5">Deal Stage</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-right px-4 py-2.5">Prob</th>
                  <th className="text-left px-4 py-2.5">Close Date</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading…</td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-red-600">{loadError}</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No deals yet.</td>
                  </tr>
                ) : (
                  items.map((o) => (
                    <tr key={o._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                      <td className="px-4 py-2.5 font-medium text-[#0176d3]">{o.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{o.accountName || '—'}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={o.stage}
                          onChange={(e) => moveStage(o._id, e.target.value)}
                          disabled={!canEdit}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right">{fmtINR(o.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{o.probability}%</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(o.closeDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {canEdit && (
                          <button onClick={() => setEditing(o)} className="text-xs text-[#0176d3] hover:underline mr-3">
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => remove(o._id)} className="text-xs text-red-600 hover:underline">
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ThemeScope theme={MODULE_THEMES['sales-service']}>
        <RecordFormModal
          object="Opportunity"
          open={editing !== null}
          record={editing && editing !== 'new' ? editing : undefined}
          submit={moduleSubmit(API, editing && editing !== 'new' ? editing._id : undefined)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      </ThemeScope>
    </>
  );
}
