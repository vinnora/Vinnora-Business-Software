'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { AppKey } from '@/lib/platform/types';

type TabItem = { apiName: string; label: string; pluralLabel: string };

/** Sidebar links for custom objects in a module (rendered inside the module layout). */
export function CustomObjectNav({
  app,
  basePath,
  linkClassName = 'flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent',
  activeClassName = 'bg-white/10',
}: {
  app: AppKey;
  basePath: string;
  linkClassName?: string;
  activeClassName?: string;
}) {
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    let live = true;
    fetch(`/api/platform/tabs?app=${app}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && Array.isArray(d) && setTabs(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [app, pathname]);

  if (!tabs.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-white/10">
      <div className="px-5 py-1 text-[10px] uppercase tracking-wider opacity-60">Custom</div>
      {tabs.map((t) => {
        const href = `${basePath}/o/${t.apiName}`;
        return (
          <Link key={t.apiName} href={href} className={`${linkClassName} ${pathname === href ? activeClassName : ''}`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path strokeLinecap="round" d="M8 9h8M8 13h8M8 17h5" />
            </svg>
            <span>{t.pluralLabel}</span>
          </Link>
        );
      })}
    </div>
  );
}
