'use client';

import Link from 'next/link';
import type { AppKey } from '@/lib/platform/types';
import { APP_LABELS } from '@/lib/platform/types';
import { ObjectManager } from './ObjectManager';
import { MODULE_THEMES } from './themes';
import { ThemeScope } from './ui';

/** "Data Model" tab content for a module's Settings page. */
export function ModuleObjectManager({ app }: { app: AppKey }) {
  return <ObjectManager app={app} theme={MODULE_THEMES[app]} />;
}

/** "Users & Access" tab content: links to the organisation-wide Setup. */
export function ModuleAccessLink({ app }: { app: AppKey }) {
  const items = [
    { tab: 'users', title: 'Users', desc: 'Assign each person a role, access packs and access pack groups.' },
    { tab: 'profiles', title: 'Roles', desc: `Control access to ${APP_LABELS[app]} and its modules, fields and Settings.` },
    { tab: 'permissionSets', title: 'Access Packs', desc: 'Grant extra access to specific people without changing their role.' },
    { tab: 'groups', title: 'Access Pack Groups', desc: 'Bundle access packs for a job.' },
  ];
  return (
    <ThemeScope theme={MODULE_THEMES[app]}>
      <h2 className="text-lg font-semibold text-[var(--p-text)]">Users &amp; Access</h2>
      <p className="text-sm text-[var(--p-muted)] mb-4">
        Roles and access packs apply across every app, so they are managed in workspace-wide Settings.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((i) => (
          <Link
            key={i.tab}
            href={`/dashboard/setup?tab=${i.tab}`}
            className="block bg-white border border-[var(--p-border)] rounded-lg p-4 hover:border-[var(--p-accent)] hover:shadow-sm transition"
          >
            <div className="font-medium text-[var(--p-accent)]">{i.title} →</div>
            <div className="text-sm text-gray-600 mt-1">{i.desc}</div>
          </Link>
        ))}
      </div>
    </ThemeScope>
  );
}
