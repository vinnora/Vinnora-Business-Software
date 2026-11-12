'use client';

import { useEffect, useRef, useState } from 'react';

type Env = { current: { id: string; name: string; type: string } | null; sandboxes: { id: string; name: string; type: string }[] };

let cached: Promise<Env> | null = null;
function loadEnv(): Promise<Env> {
  if (!cached) {
    cached = fetch('/api/platform/environment')
      .then((r) => (r.ok ? r.json() : { current: null, sandboxes: [] }))
      .catch(() => ({ current: null, sandboxes: [] }));
  }
  return cached;
}

export async function switchEnvironment(sandboxId: string | null) {
  const res = await fetch('/api/platform/environment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sandboxId }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Could not switch environment');
  }
  cached = null;
  window.location.href = '/dashboard';
}

export function useEnvironment() {
  const [env, setEnv] = useState<Env | null>(null);
  useEffect(() => {
    let live = true;
    loadEnv().then((e) => live && setEnv(e));
    return () => {
      live = false;
    };
  }, []);
  return env;
}

/** Header dropdown: Production / sandboxes. Hidden when the user has no sandboxes. */
export function EnvironmentSwitcher({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const env = useEnvironment();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!env || (!env.current && env.sandboxes.length === 0)) return null;
  const label = env.current ? `Sandbox: ${env.current.name}` : 'Production';
  const btn =
    tone === 'dark'
      ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
      : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-800';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 text-sm border rounded-lg transition inline-flex items-center gap-2 ${btn}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`w-2 h-2 rounded-full ${env.current ? 'bg-[#eda100]' : 'bg-[#0ca30c]'}`} aria-hidden />
        {label}
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 py-1 z-50" role="listbox">
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-500">Switch environment</div>
          <EnvOption active={!env.current} label="Production" sub="Live data" onClick={() => switchEnvironment(null).catch((e) => setError(e.message))} />
          {env.sandboxes.map((s) => (
            <EnvOption
              key={s.id}
              active={env.current?.id === s.id}
              label={s.name}
              sub={`${s.type === 'developer' ? 'Developer' : s.type === 'partial' ? 'Partial Copy' : 'Full Copy'} sandbox`}
              onClick={() => switchEnvironment(s.id).catch((e) => setError(e.message))}
            />
          ))}
          {error && <div className="px-3 py-1 text-xs text-red-600">{error}</div>}
        </div>
      )}
    </div>
  );
}

function EnvOption({ active, label, sub, onClick }: { active: boolean; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" role="option" aria-selected={active} onClick={onClick} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2">
      <span className="w-4 text-[#0176d3] font-bold">{active ? '✓' : ''}</span>
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-[11px] text-gray-500">{sub}</span>
      </span>
    </button>
  );
}

/** Persistent indicator shown on every dashboard page while in a sandbox. */
export function SandboxIndicator() {
  const env = useEnvironment();
  const [error, setError] = useState<string | null>(null);
  if (!env?.current) return null;
  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#eda100] z-[60] pointer-events-none" aria-hidden />
      <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-3 rounded-full bg-[#0b0b0b] text-white text-xs pl-3 pr-1 py-1 shadow-lg" role="status">
        <span className="w-2 h-2 rounded-full bg-[#eda100]" aria-hidden />
        <span title="Only Sales & Service and custom objects are sandboxed. Other apps are unavailable here.">
          <b>SANDBOX</b>: {env.current.name}
        </span>
        <button
          type="button"
          onClick={() => switchEnvironment(null).catch((e) => setError(e.message))}
          className="rounded-full bg-white/15 hover:bg-white/25 px-3 py-1"
        >
          Back to Production
        </button>
        {error && <span className="text-red-300">{error}</span>}
      </div>
    </>
  );
}
