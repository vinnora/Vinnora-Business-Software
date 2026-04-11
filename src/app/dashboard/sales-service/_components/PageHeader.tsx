'use client';

import type { ReactNode } from 'react';

export function PageHeader({
  icon,
  title,
  subtitle,
  count,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded bg-[#0176d3] text-white flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{subtitle}</div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              {typeof count === 'number' && (
                <span className="text-sm text-gray-500">• {count} items</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}
