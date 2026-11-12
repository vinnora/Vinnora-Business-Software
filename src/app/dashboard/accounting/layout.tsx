import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { CustomObjectNav } from '@/components/platform/CustomObjectNav';
import type { ReactNode } from 'react';
import { AccountingIcon } from '@/components/ModuleIcon';
import QuickStart from '@/components/QuickStart';
import { QUICK_START } from '@/lib/quick-start-steps';

const NAV = [
  { href: '/dashboard/accounting', label: 'Home', icon: 'home' },
  { href: '/dashboard/accounting/transactions', label: 'Transactions', icon: 'swap' },
  { href: '/dashboard/accounting/invoices', label: 'Invoices', icon: 'doc' },
  { href: '/dashboard/accounting/bills', label: 'Bills', icon: 'receipt' },
  { href: '/dashboard/accounting/chart-of-accounts', label: 'Chart of Accounts', icon: 'tree' },
  { href: '/dashboard/accounting/general-ledger', label: 'General Ledger', icon: 'ledger' },
  { href: '/dashboard/accounting/payroll', label: 'Payroll', icon: 'wallet' },
  { href: '/dashboard/accounting/budgets', label: 'Budgets', icon: 'chart' },
  { href: '/dashboard/accounting/projects', label: 'Projects', icon: 'target' },
  { href: '/dashboard/accounting/assets', label: 'Assets', icon: 'building' },
  { href: '/dashboard/accounting/taxes', label: 'Taxes', icon: 'percent' },
  { href: '/dashboard/accounting/reports', label: 'Reports', icon: 'report' },
  { href: '/dashboard/accounting/integrations', label: 'Integrations', icon: 'plug' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const c = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'swap':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-3-3 3-3M4 13h12M17 8l3 3-3 3M20 11H8" /></svg>;
    case 'doc':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h6" /></svg>;
    case 'receipt':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3zm3 5h8m-8 4h8m-8 4h5" /></svg>;
    case 'tree':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h6M4 12h10M4 18h6M14 6h6m-6 6h6m-6 6h6" /></svg>;
    case 'ledger':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 9h16M4 14h16M9 4v16M15 4v16" /></svg>;
    case 'wallet':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2" /></svg>;
    case 'chart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" /></svg>;
    case 'target':
      return <svg {...c}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case 'building':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a1 1 0 011-1h14a1 1 0 011 1v16M4 21h16M9 9h2m4 0h2M9 13h2m4 0h2M9 17h2m4 0h2" /></svg>;
    case 'percent':
      return <svg {...c}><circle cx="7" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><path strokeLinecap="round" d="M19 5L5 19" /></svg>;
    case 'report':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M14 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V10l-6-6zm0 0v6h6" /></svg>;
    case 'plug':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7V3M15 7V3M7 7h10v5a5 5 0 01-10 0V7zM12 17v4" /></svg>;
    default:
      return null;
  }
}

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F7F9F2]">
      <aside
        className="w-60 text-white flex flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0B2818 0%, #1B4332 50%, #2D6A4F 100%)',
        }}
      >
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden">
              <AccountingIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Accounting</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#74C69D]"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <CustomObjectNav app="accounting" basePath="/dashboard/accounting" />
        </nav>
        {/* Decorative leaf canopy silhouette at bottom of sidebar */}
        <svg
          viewBox="0 0 240 40"
          preserveAspectRatio="none"
          className="absolute bottom-12 left-0 right-0 w-full h-10 opacity-30 pointer-events-none"
        >
          <path
            d="M0,30 Q30,10 60,25 Q90,5 120,22 Q150,8 180,24 Q210,10 240,28 L240,40 L0,40 Z"
            fill="#52B788"
          />
        </svg>
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">
            ← All apps
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#D8F3DC] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search transactions, invoices, accounts..."
              className="w-full max-w-md px-4 py-1.5 text-sm bg-[#F7F9F2] border border-transparent rounded focus:bg-white focus:border-[#40916C] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-[#1B4332]">
            <button className="p-2 hover:bg-[#F7F9F2] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <UserAvatar className="bg-gradient-to-br from-[#40916C] to-[#1B4332]" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <QuickStart
        moduleKey="accounting"
        moduleName={QUICK_START.accounting.name}
        steps={QUICK_START.accounting.steps}
        accentFrom={QUICK_START.accounting.accentFrom}
        accentTo={QUICK_START.accounting.accentTo}
      />
    </div>
  );
}
