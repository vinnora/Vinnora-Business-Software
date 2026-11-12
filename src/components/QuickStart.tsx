'use client';

import { useEffect, useState } from 'react';

export type QuickStartStep = {
  title: string;
  body: string;
};

type Props = {
  moduleKey: string;
  moduleName: string;
  steps: QuickStartStep[];
  accentFrom: string;
  accentTo: string;
};

export default function QuickStart({ moduleKey, moduleName, steps, accentFrom, accentTo }: Props) {
  const storageKey = `vinnora.quickstart.${moduleKey}`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const status = window.localStorage.getItem(storageKey);
    if (status !== 'done' && status !== 'skipped') {
      setOpen(true);
    }
  }, [storageKey]);

  if (!open || steps.length === 0) return null;

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  const close = (status: 'done' | 'skipped') => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, status);
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickstart-title"
    >
      <div className="mx-4 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="px-6 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%)` }}
        >
          <div className="text-xs uppercase tracking-wide text-white/70">Quick start</div>
          <div id="quickstart-title" className="text-lg font-semibold">
            Welcome to {moduleName}
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="mb-3 flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ background: i <= index ? accentTo : '#E5E7EB' }}
              />
            ))}
          </div>
          <div className="mb-1 text-xs font-medium text-gray-500">
            Step {index + 1} of {steps.length}
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900">{step.title}</h3>
          <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-3">
          <button
            type="button"
            onClick={() => close('skipped')}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="rounded border border-gray-300 bg-white px-4 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={() => close('done')}
                className="rounded px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: accentTo }}
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="rounded px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: accentTo }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
