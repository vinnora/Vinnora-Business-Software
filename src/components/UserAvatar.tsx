'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Me = { name?: string; email?: string };

let cached: Me | null = null;

export function initials(me: Me | null): string {
  const src = (me?.name || me?.email || '').trim();
  if (!src) return 'U';
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (me?.name && parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U';
}

/** Header avatar: shows the signed-in user's initials and opens Profile & personal settings. */
export function UserAvatar({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(cached);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Me | null) => {
        if (!alive || !d) return;
        cached = d;
        setMe(d);
      })
      .catch(() => {});
    const onRename = (e: Event) => {
      cached = { ...cached, ...(e as CustomEvent<Me>).detail };
      setMe(cached);
    };
    window.addEventListener('vinnora:profile', onRename);
    return () => {
      alive = false;
      window.removeEventListener('vinnora:profile', onRename);
    };
  }, []);

  const label = me?.name || me?.email ? `${me?.name || me?.email} — Profile & settings` : 'Profile & settings';
  return (
    <Link
      href={`/dashboard/profile?from=${encodeURIComponent(pathname)}`}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-offset-2 hover:ring-2 hover:ring-current transition ${className}`}
    >
      {initials(me)}
    </Link>
  );
}
