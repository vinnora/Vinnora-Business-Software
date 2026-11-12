import Link from 'next/link';
import { CustomObjectNav } from '@/components/platform/CustomObjectNav';
import type { ReactNode } from 'react';
import { SalesServiceIcon } from '@/components/ModuleIcon';
import QuickStart from '@/components/QuickStart';
import { QUICK_START } from '@/lib/quick-start-steps';

const NAV = [
  { href: '/dashboard/sales-service', label: 'Today', icon: 'home' },
  { href: '/dashboard/sales-service/accounts', label: 'Companies', icon: 'briefcase' },
  { href: '/dashboard/sales-service/contacts', label: 'People', icon: 'user' },
  { href: '/dashboard/sales-service/leads', label: 'Enquiries', icon: 'spark' },
  { href: '/dashboard/sales-service/opportunities', label: 'Deals', icon: 'chart' },
  { href: '/dashboard/sales-service/activities', label: 'Follow-ups', icon: 'clock' },
  { href: '/dashboard/sales-service/cases', label: 'Tickets', icon: 'ticket' },
  { href: '/dashboard/sales-service/field-service', label: 'Field', icon: 'wrench' },
  { href: '/dashboard/sales-service/knowledge', label: 'Help Library', icon: 'book' },
  { href: '/dashboard/sales-service/setup', label: 'Settings', icon: 'gear' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
        </svg>
      );
    case 'briefcase':
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path strokeLinecap="round" d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path strokeLinecap="round" d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 2" />
        </svg>
      );
    case 'ticket':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 100 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 100-4V8z" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4zm0 13a3 3 0 013-3h11" />
        </svg>
      );
    case 'wrench':
      return (
        <svg {...common}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 01-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SalesServiceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#E0F4F8]">
      {/* Sidebar */}
      <aside
        className="w-60 text-white flex flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #012A4A 0%, #013A63 50%, #01497C 100%)',
        }}
      >
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center">
              <SalesServiceIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Sell &amp; Support</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#48CAE4]"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <CustomObjectNav app="sales-service" basePath="/dashboard/sales-service" />
        </nav>
        {/* Decorative wave at bottom of sidebar */}
        <svg
          viewBox="0 0 240 40"
          preserveAspectRatio="none"
          className="absolute bottom-12 left-0 right-0 w-full h-8 opacity-30 pointer-events-none"
        >
          <path d="M0,20 Q60,5 120,20 T240,20 L240,40 L0,40 Z" fill="#0096C7" />
        </svg>
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">
            ← All apps
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top utility bar */}
        <header className="h-14 bg-white border-b border-[#CAF0F8] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search Vinnora..."
              className="w-full max-w-md px-4 py-1.5 text-sm bg-[#E0F4F8] border border-transparent rounded focus:bg-white focus:border-[#0096C7] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-[#01497C]">
            <button className="p-2 hover:bg-[#E0F4F8] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button className="p-2 hover:bg-[#E0F4F8] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0096C7] to-[#012A4A] flex items-center justify-center text-white text-sm font-semibold">
              U
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <QuickStart
        moduleKey="sales-service"
        moduleName={QUICK_START['sales-service'].name}
        steps={QUICK_START['sales-service'].steps}
        accentFrom={QUICK_START['sales-service'].accentFrom}
        accentTo={QUICK_START['sales-service'].accentTo}
      />
    </div>
  );
}
