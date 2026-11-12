'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../_components/PageHeader';
import { ActionErrorBanner, useActionError } from '../_components/ActionError';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

type Account = {
  _id: string;
  name: string;
  type: string;
  industry?: string;
  phone?: string;
  website?: string;
  billingCity?: string;
  billingCountry?: string;
  annualRevenue?: number;
  employees?: number;
  ownerName?: string;
};

const API = '/api/sales-service/accounts';

export default function AccountsPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const actionError = useActionError();
  const access = useDescribe('Account').data?.access;
  const canCreate = access?.create ?? true;
  const canEdit = access?.edit ?? true;
  const canDelete = access?.delete ?? true;

  const { data, error: loadError, loading, reload } = useLoad(
    () => api<Account[]>(query ? `${API}?search=${encodeURIComponent(query)}` : API),
    [query],
  );
  const items = Array.isArray(data) ? data : [];

  const applySearch = () => {
    if (search === query) reload();
    else setQuery(search);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this account?')) return;
    await actionError.run(() => api(`${API}?id=${id}`, { method: 'DELETE' }));
    reload();
  };

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Sales"
        count={items.length}
        actions={
          <>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Search accounts…"
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-[#0176d3] focus:outline-none"
            />
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

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f3f3f3] text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Type</th>
                <th className="text-left px-4 py-2.5">Industry</th>
                <th className="text-left px-4 py-2.5">Phone</th>
                <th className="text-left px-4 py-2.5">Location</th>
                <th className="text-right px-4 py-2.5">Revenue</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-600">{loadError}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No accounts yet.
                    {canCreate && (
                      <>
                        {' '}
                        Click <strong>+ New</strong> to add one.
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                    <td className="px-4 py-2.5 font-medium text-[#0176d3]">
                      <Link href={`/dashboard/sales-service/accounts/${a._id}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-100">{a.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{a.industry || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{a.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {[a.billingCity, a.billingCountry].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {a.annualRevenue ? `₹${a.annualRevenue.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {canEdit && (
                        <button onClick={() => setEditing(a)} className="text-xs text-[#0176d3] hover:underline mr-3">
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => remove(a._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
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

      <ThemeScope theme={MODULE_THEMES['sales-service']}>
        <RecordFormModal
          object="Account"
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
