import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';
import { CustomObjectNav } from '@/components/platform/CustomObjectNav';
import type { ReactNode } from 'react';
import { InventoryIcon } from '@/components/ModuleIcon';
import QuickStart from '@/components/QuickStart';
import { QUICK_START } from '@/lib/quick-start-steps';

const NAV = [
  { href: '/dashboard/inventory', label: 'Home', icon: 'home' },
  { href: '/dashboard/inventory/items', label: 'Items', icon: 'box' },
  { href: '/dashboard/inventory/raw-materials', label: 'Raw Materials', icon: 'leaf' },
  { href: '/dashboard/inventory/warehouses', label: 'Warehouses', icon: 'warehouse' },
  { href: '/dashboard/inventory/suppliers', label: 'Suppliers', icon: 'truck' },
  { href: '/dashboard/inventory/purchase-orders', label: 'Purchase Orders', icon: 'cart' },
  { href: '/dashboard/inventory/stock-transfers', label: 'Stock Transfers', icon: 'swap' },
  { href: '/dashboard/inventory/stock-audits', label: 'Stock Audits', icon: 'check' },
  { href: '/dashboard/inventory/cycle-counts', label: 'Cycle Counts', icon: 'cycle' },
  { href: '/dashboard/inventory/eway-bills', label: 'E-Way Bills', icon: 'doc' },
  { href: '/dashboard/inventory/barcodes', label: 'Barcodes', icon: 'barcode' },
  { href: '/dashboard/inventory/labels', label: 'Labels', icon: 'tag' },
  { href: '/dashboard/inventory/reports', label: 'Reports', icon: 'chart' },
  { href: '/dashboard/inventory/setup', label: 'Settings', icon: 'gear' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const c = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'box':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></svg>;
    case 'leaf':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M11 20A7 7 0 014 13V8a7 7 0 0114 0v5a7 7 0 01-7 7zM5 20l14-14" /></svg>;
    case 'warehouse':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V9l9-6 9 6v12M9 21v-8h6v8M3 21h18" /></svg>;
    case 'truck':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v10H3zM14 11h4l3 3v3h-7zM7 17a2 2 0 110 4 2 2 0 010-4zm10 0a2 2 0 110 4 2 2 0 010-4z" /></svg>;
    case 'cart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2 13h12l2-9H6M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" /></svg>;
    case 'swap':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-3-3 3-3M4 13h12M17 8l3 3-3 3M20 11H8" /></svg>;
    case 'check':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'cycle':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3" /></svg>;
    case 'doc':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h6" /></svg>;
    case 'barcode':
      return <svg {...c}><path strokeLinecap="round" d="M4 6v12M7 6v12M10 6v8M13 6v12M16 6v8M19 6v12" /></svg>;
    case 'tag':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12l-8 8-9-9V3h8l9 9zM7 7h.01" /></svg>;
    case 'chart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" /></svg>;
    case 'gear':
      return <svg {...c}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    default:
      return null;
  }
}

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#FFF6E5]">
      <aside
        className="w-60 text-white flex flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #2C1810 0%, #4A1D0F 50%, #6B2410 100%)',
        }}
      >
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <InventoryIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Inventory</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#FFC15E]"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <CustomObjectNav app="inventory" basePath="/dashboard/inventory" />
        </nav>
        {/* Decorative ember glow at bottom of sidebar */}
        <div
          className="absolute bottom-12 left-0 right-0 h-16 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center bottom, rgba(255,193,94,0.6) 0%, transparent 70%)',
          }}
        />
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">
            ← All apps
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#FFE5C4] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search items, suppliers, warehouses..."
              className="w-full max-w-md px-4 py-1.5 text-sm bg-[#FFF6E5] border border-transparent rounded focus:bg-white focus:border-[#E2671A] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-[#6B2410]">
            <button className="p-2 hover:bg-[#FFF6E5] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <UserAvatar className="bg-gradient-to-br from-[#E2671A] to-[#4A1D0F]" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <QuickStart
        moduleKey="inventory"
        moduleName={QUICK_START.inventory.name}
        steps={QUICK_START.inventory.steps}
        accentFrom={QUICK_START.inventory.accentFrom}
        accentTo={QUICK_START.inventory.accentTo}
      />
    </div>
  );
}
