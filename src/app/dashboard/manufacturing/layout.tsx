import Link from 'next/link';
import { CustomObjectNav } from '@/components/platform/CustomObjectNav';
import type { ReactNode } from 'react';
import { ManufacturingIcon } from '@/components/ModuleIcon';
import QuickStart from '@/components/QuickStart';
import { QUICK_START } from '@/lib/quick-start-steps';

const NAV = [
  { href: '/dashboard/manufacturing', label: 'Home', icon: 'home' },
  { href: '/dashboard/manufacturing/work-orders', label: 'Work Orders', icon: 'clipboard' },
  { href: '/dashboard/manufacturing/bom', label: 'Bill of Materials', icon: 'layers' },
  { href: '/dashboard/manufacturing/materials', label: 'Materials', icon: 'box' },
  { href: '/dashboard/manufacturing/quality', label: 'Quality Control', icon: 'shield' },
  { href: '/dashboard/manufacturing/machines', label: 'Machines', icon: 'cog' },
  { href: '/dashboard/manufacturing/production-logs', label: 'Production Logs', icon: 'activity' },
  { href: '/dashboard/manufacturing/suppliers', label: 'Suppliers', icon: 'truck' },
  { href: '/dashboard/manufacturing/purchase-requisitions', label: 'Requisitions', icon: 'cart' },
  { href: '/dashboard/manufacturing/traceability', label: 'Traceability', icon: 'link' },
  { href: '/dashboard/manufacturing/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/dashboard/manufacturing/setup', label: 'Settings', icon: 'gear' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const c = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'clipboard':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 14l2 2 4-4" /></svg>;
    case 'layers':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l10 6-10 6L2 8l10-6zM2 16l10 6 10-6M2 12l10 6 10-6" /></svg>;
    case 'box':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></svg>;
    case 'shield':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /></svg>;
    case 'cog':
      return <svg {...c}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    case 'activity':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
    case 'truck':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3zM14 11h4l3 3v3h-7zM7 17a2 2 0 110 4 2 2 0 010-4zm10 0a2 2 0 110 4 2 2 0 010-4z" /></svg>;
    case 'cart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2 13h12l2-9H6M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" /></svg>;
    case 'link':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" /></svg>;
    case 'chart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" /></svg>;
    case 'gear':
      return <svg {...c}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    default:
      return null;
  }
}

export default function ManufacturingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      <aside className="w-60 text-white flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #1C1C1E 0%, #2C2F33 40%, #4A4E54 100%)' }}>
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <ManufacturingIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Manufacturing</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#D4A843]">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <CustomObjectNav app="manufacturing" basePath="/dashboard/manufacturing" />
        </nav>
        <div className="absolute bottom-12 left-0 right-0 h-16 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center bottom, rgba(212,168,67,0.5) 0%, transparent 70%)' }} />
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">← All apps</Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input type="text" placeholder="Search work orders, materials, machines…" className="w-full max-w-md px-4 py-1.5 text-sm bg-[#F3F4F6] border border-transparent rounded focus:bg-white focus:border-[#4A4E54] focus:outline-none" />
          </div>
          <div className="flex items-center gap-3 text-[#4A4E54]">
            <button className="p-2 hover:bg-[#F3F4F6] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A4E54] to-[#1C1C1E] flex items-center justify-center text-white text-sm font-semibold">U</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <QuickStart
        moduleKey="manufacturing"
        moduleName={QUICK_START.manufacturing.name}
        steps={QUICK_START.manufacturing.steps}
        accentFrom={QUICK_START.manufacturing.accentFrom}
        accentTo={QUICK_START.manufacturing.accentTo}
      />
    </div>
  );
}
