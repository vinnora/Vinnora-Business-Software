'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RecordFormModal, moduleSubmit, useDescribe } from '@/components/platform/RecordForm';
import { ThemeScope } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';

const TAB_LABELS = { related: 'Linked Records', details: 'Details', activity: 'Follow-ups' } as const;
// Display names for stored activity types (stored values stay unchanged).
const ACTIVITY_TYPE_LABELS: Record<string, string> = { Task: 'To-do' };

const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Account360Page() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'related' | 'details' | 'activity'>('related');
  const [editingAccount, setEditingAccount] = useState(false);
  const canEdit = useDescribe('Account').data?.access.edit ?? true;

  useEffect(() => {
    fetch(`/api/sales-service/accounts/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (!data || !data.account)
    return <div className="p-6 text-sm text-gray-500">{data?.error || 'Company not found.'}</div>;

  const { account, contacts, opportunities, cases, activities } = data;

  const pipelineValue = opportunities
    .filter((o: any) => !['Closed Won', 'Closed Lost'].includes(o.stage))
    .reduce((s: number, o: any) => s + o.amount, 0);
  const wonValue = opportunities
    .filter((o: any) => o.stage === 'Closed Won')
    .reduce((s: number, o: any) => s + o.amount, 0);
  const openCases = cases.filter((c: any) => !['Resolved', 'Closed'].includes(c.status)).length;

  return (
    <div>
      {/* Account header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded bg-gradient-to-br from-[#0176d3] to-[#032d60] text-white flex items-center justify-center text-2xl font-bold">
            {account.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-gray-500">Company</div>
            <h1 className="text-2xl font-semibold text-gray-900">{account.name}</h1>
            <div className="text-sm text-gray-600 mt-1">
              {[account.type, account.industry, account.billingCity, account.billingCountry]
                .filter(Boolean)
                .join(' • ')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setEditingAccount(true)}
                className="px-3 py-1.5 bg-[#0176d3] text-white text-sm rounded hover:bg-[#014486]"
              >
                Edit
              </button>
            )}
            <Link
              href="/dashboard/sales-service/accounts"
              className="text-sm text-[#0176d3] hover:underline"
            >
              ← Back to Companies
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <KpiPill label="People" value={contacts.length} />
          <KpiPill label="Open Pipeline" value={fmtINR(pipelineValue)} />
          <KpiPill label="Closed Won" value={fmtINR(wonValue)} />
          <KpiPill label="Open Tickets" value={openCases} tone={openCases > 0 ? 'warn' : 'ok'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {(['related', 'details', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 ${
                tab === t ? 'border-[#0176d3] text-[#0176d3] font-medium' : 'border-transparent text-gray-600'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {tab === 'related' && (
          <>
            <RelatedList
              title="People"
              count={contacts.length}
              cta={{ href: '/dashboard/sales-service/contacts', label: 'New' }}
              empty="No people at this company."
            >
              {contacts.map((c: any) => (
                <li key={c._id} className="px-4 py-2 border-t border-gray-100 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#0176d3]">{c.firstName} {c.lastName}</span>
                    {c.title && <span className="text-gray-500 ml-2">• {c.title}</span>}
                  </div>
                  <span className="text-xs text-gray-500">{c.email}</span>
                </li>
              ))}
            </RelatedList>

            <RelatedList
              title="Deals"
              count={opportunities.length}
              cta={{ href: '/dashboard/sales-service/opportunities', label: 'New' }}
              empty="No deals yet."
            >
              {opportunities.map((o: any) => (
                <li key={o._id} className="px-4 py-2 border-t border-gray-100 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#0176d3]">{o.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{o.stage}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{fmtINR(o.amount)}</div>
                    <div className="text-[10px] text-gray-500">
                      Close {new Date(o.closeDate).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              ))}
            </RelatedList>

            <RelatedList
              title="Tickets"
              count={cases.length}
              cta={{ href: '/dashboard/sales-service/cases', label: 'New' }}
              empty="No tickets for this company."
            >
              {cases.map((c: any) => (
                <li key={c._id} className="px-4 py-2 border-t border-gray-100 text-sm flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{c.caseNumber}</span>
                    <span className="font-medium text-[#0176d3] ml-2">{c.subject}</span>
                  </div>
                  <span className="text-xs">{c.status} • {c.priority}</span>
                </li>
              ))}
            </RelatedList>
          </>
        )}

        {tab === 'details' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wide text-gray-500">Company Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Type" value={account.type} />
              <Detail label="Industry" value={account.industry} />
              <Detail label="Phone" value={account.phone} />
              <Detail label="Website" value={account.website} />
              <Detail label="Annual Revenue" value={account.annualRevenue ? fmtINR(account.annualRevenue) : '—'} />
              <Detail label="Employees" value={account.employees} />
              <Detail label="Owner" value={account.ownerName} />
              <Detail label="Created" value={new Date(account.createdAt).toLocaleDateString()} />
              <div className="col-span-2">
                <Detail
                  label="Billing Address"
                  value={[account.billingStreet, account.billingCity, account.billingState, account.billingCountry, account.billingPostalCode]
                    .filter(Boolean)
                    .join(', ') || '—'}
                />
              </div>
              {account.description && (
                <div className="col-span-2">
                  <Detail label="Description" value={account.description} />
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-500">
              Follow-up Timeline
            </h3>
            {activities.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">No follow-ups logged.</div>
            ) : (
              <ul className="space-y-2">
                {activities.map((a: any) => (
                  <li key={a._id} className="flex items-start gap-3 border-b border-gray-100 pb-2 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm">
                      {a.type === 'Call' ? '📞' : a.type === 'Email' ? '✉️' : a.type === 'Meeting' ? '📅' : '✓'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{a.subject}</div>
                      <div className="text-xs text-gray-500">
                        {ACTIVITY_TYPE_LABELS[a.type] || a.type} • {new Date(a.createdAt).toLocaleString()}
                      </div>
                      {a.description && <div className="text-sm text-gray-600 mt-1">{a.description}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <ThemeScope theme={MODULE_THEMES['sales-service']}>
        <RecordFormModal
          object="Account"
          open={editingAccount}
          record={account}
          submit={moduleSubmit('/api/sales-service/accounts', account._id)}
          onClose={() => setEditingAccount(false)}
          onSaved={(saved) => {
            setEditingAccount(false);
            setData({ ...data, account: { ...account, ...saved } });
          }}
        />
      </ThemeScope>
    </div>
  );
}

function KpiPill({ label, value, tone = 'ok' }: { label: string; value: any; tone?: 'ok' | 'warn' }) {
  return (
    <div className={`rounded border px-3 py-2 ${tone === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value || '—'}</div>
    </div>
  );
}

function RelatedList({
  title,
  count,
  cta,
  empty,
  children,
}: {
  title: string;
  count: number;
  cta: { href: string; label: string };
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-[#f3f3f3] flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">
          {title} <span className="text-gray-500">({count})</span>
        </div>
        <Link href={cta.href} className="text-xs text-[#0176d3] hover:underline">
          {cta.label}
        </Link>
      </div>
      {count === 0 ? (
        <div className="p-4 text-sm text-gray-500 text-center">{empty}</div>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  );
}
