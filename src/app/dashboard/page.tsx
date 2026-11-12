'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import type { ComponentType } from 'react';
import { Waves } from '@/components/ocean/Waves';
import { Bubbles } from '@/components/ocean/Bubbles';
import { EnvironmentSwitcher } from '@/components/platform/EnvironmentSwitcher';
import {
  SalesServiceIcon,
  AccountingIcon,
  InventoryIcon,
  MarketingIcon,
  HrmIcon,
  ManufacturingIcon,
} from '@/components/ModuleIcon';

type ModuleEntry = {
  name: string;
  description: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  accent: string;
};

const modules: ModuleEntry[] = [
  {
    name: 'Sell & Support',
    description: 'CRM, deals, tickets & field service',
    href: '/dashboard/sales-service',
    icon: SalesServiceIcon,
    gradient: 'linear-gradient(90deg, #0077B6, #00B4D8)',
    accent: '#0077B6',
  },
  {
    name: 'Accounting',
    description: 'Ledger, invoices, payroll & reports',
    href: '/dashboard/accounting',
    icon: AccountingIcon,
    gradient: 'linear-gradient(90deg, #1B4332, #52B788)',
    accent: '#2D6A4F',
  },
  {
    name: 'Inventory',
    description: 'Stock, forecasting & warehousing',
    href: '/dashboard/inventory',
    icon: InventoryIcon,
    gradient: 'linear-gradient(90deg, #B14411, #FFC15E)',
    accent: '#B14411',
  },
  {
    name: 'Marketing',
    description: 'Promotions & pricing strategy',
    href: '/dashboard/marketing',
    icon: MarketingIcon,
    gradient: 'linear-gradient(90deg, #5A7A8C, #D6E5EC)',
    accent: '#5A7A8C',
  },
  {
    name: 'HRM',
    description: 'Recruitment & employee records',
    href: '/dashboard/hrm',
    icon: HrmIcon,
    gradient: 'linear-gradient(90deg, #8B6F47, #E8D5B7)',
    accent: '#8B6F47',
  },
  {
    name: 'Manufacturing',
    description: 'Production, BOM, quality & shop floor',
    href: '/dashboard/manufacturing',
    icon: ManufacturingIcon,
    gradient: 'linear-gradient(90deg, #4A4E54, #D4A843)',
    accent: '#4A4E54',
  },
];

export default function Dashboard() {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email || 'there';

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#CAF0F8] via-[#E0F4F8] to-[#FDF6E3]">
      <Bubbles count={14} />

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-r from-[#012A4A] via-[#013A63] to-[#01497C] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center font-bold text-lg">
              V
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Vinnora</div>
              <h1 className="text-xl font-semibold">Business Ally</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <span className="text-sm text-white/80 hidden sm:inline">Welcome, {userName}</span>
                <EnvironmentSwitcher />
                <Link
                  href="/dashboard/reports"
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
                >
                  Reports
                </Link>
                <Link
                  href="/dashboard/setup"
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
                >
                  Settings
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="px-3 py-1.5 text-sm text-white border border-white/20 rounded-lg hover:bg-white/10 transition">Sign In</Link>
                <Link href="/auth/signup" className="px-3 py-1.5 text-sm text-[#012A4A] bg-white rounded-lg hover:bg-white/90 transition font-medium">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-[#01497C]">Your Apps</div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#012A4A] mt-1">
            Pick an App that suits your business
          </h2>
          <p className="text-sm text-[#013A63] mt-2 max-w-xl">
            Every app connects to the others so your team stays in sync from first enquiry to
            final report. Start with one app free, or unlock the full suite.
          </p>
        </div>
      </section>

      {/* Module grid */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.name}
                href={m.href}
                className="group relative bg-white/85 backdrop-blur border border-white/60 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: m.gradient }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: `${m.accent}15`,
                    color: m.accent,
                  }}
                >
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-semibold text-[#012A4A]">{m.name}</h3>
                <p className="text-sm text-[#01497C] mt-1">{m.description}</p>
                <div
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
                  style={{ color: m.accent }}
                >
                  Open app
                  <span aria-hidden>→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <Waves variant="rolling" height={120} />
      </div>
    </div>
  );
}
