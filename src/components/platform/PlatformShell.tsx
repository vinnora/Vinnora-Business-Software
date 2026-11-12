'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { EnvironmentSwitcher } from './EnvironmentSwitcher';

const LINKS = [
  { href: '/dashboard/reports', label: 'Reports & Dashboards' },
  { href: '/dashboard/setup', label: 'Setup' },
];

/** Header used by organisation-wide pages (Setup, Reports & Dashboards). */
export function PlatformShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-[#012A4A] via-[#013A63] to-[#01497C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-bold" aria-label="All apps">
              V
            </Link>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">Vinnora</div>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  pathname.startsWith(l.href) || (l.href === '/dashboard/reports' && pathname.startsWith('/dashboard/dashboards'))
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <EnvironmentSwitcher />
            <Link href="/dashboard" className="px-3 py-1.5 text-sm text-white/80 hover:text-white">
              ← All apps
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
