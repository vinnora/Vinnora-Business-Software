'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FieldError } from '@/lib/platform/types';

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */

export interface PlatformTheme {
  accent: string;
  accentBg: string;
  text: string;
  muted: string;
  border: string;
}

export const DEFAULT_THEME: PlatformTheme = {
  accent: '#0176d3',
  accentBg: '#E0F4F8',
  text: '#012A4A',
  muted: '#6B7280',
  border: '#E5E7EB',
};

/** Sets CSS variables used by every platform component. */
export function ThemeScope({ theme = DEFAULT_THEME, children, className = '' }: { theme?: PlatformTheme; children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={
        {
          '--p-accent': theme.accent,
          '--p-accent-bg': theme.accentBg,
          '--p-text': theme.text,
          '--p-muted': theme.muted,
          '--p-border': theme.border,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* API helper                                                          */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;
  errors: FieldError[];
  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function api<T = unknown>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const d = (data || {}) as { error?: string; errors?: FieldError[] };
    throw new ApiError(d.error || `Request failed (${res.status})`, res.status, d.errors || []);
  }
  return data as T;
}

/** Load data with loading/error state and a reload function. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await loader();
      if (id === seq.current) setData(d);
    } catch (e) {
      if (id === seq.current) setError((e as Error).message);
    } finally {
      if (id === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, loading, reload, setData };
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Btn({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const variants: Record<BtnVariant, string> = {
    primary: 'bg-[var(--p-accent)] text-white hover:brightness-110',
    secondary: 'bg-white border border-[var(--p-border)] text-gray-700 hover:bg-gray-50',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50',
    ghost: 'text-[var(--p-accent)] hover:bg-[var(--p-accent-bg)]',
  };
  return <button type="button" {...props} className={`${base} ${sizes} ${variants[variant]} ${className}`} />;
}

const inputCls =
  'w-full px-3 py-1.5 text-sm border border-gray-300 rounded bg-white focus:border-[var(--p-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)] disabled:bg-gray-50 disabled:text-gray-500';

export function Input({ className = '', ...props }: React.ComponentProps<'input'>) {
  return <input {...props} className={`${inputCls} ${className}`} />;
}

export function TextArea({ className = '', ...props }: React.ComponentProps<'textarea'>) {
  return <textarea {...props} className={`${inputCls} ${className}`} />;
}

export function Select({ className = '', ...props }: React.ComponentProps<'select'>) {
  return <select {...props} className={`${inputCls} ${className}`} />;
}

export function FormField({
  label,
  required,
  help,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 ${className}`}>
      <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
        {required && <span className="text-red-500">*</span>}
        {label}
        {help && (
          <span className="text-gray-400 cursor-help" title={help}>
            ⓘ
          </span>
        )}
      </label>
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${disabled ? 'opacity-60' : 'cursor-pointer'}`} title={title}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--p-accent)]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'blue' | 'amber' | 'red' | 'accent' }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    accent: 'bg-[var(--p-accent-bg)] text-[var(--p-accent)]',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded ${tones[tone]}`}>{children}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const width = size === 'xl' ? 'max-w-6xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-2xl';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${width} max-h-[92vh] flex flex-col`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 rounded-b-lg">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-[var(--p-border)] overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
            active === t.id
              ? 'border-[var(--p-accent)] text-[var(--p-accent)] font-medium'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          {t.label}
          {typeof t.count === 'number' && <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="bg-white border border-dashed border-gray-300 rounded p-8 text-center text-sm text-gray-500">{children}</div>;
}

export function ErrorBanner({ error, errors }: { error?: string | null; errors?: FieldError[] }) {
  const general = (errors || []).filter((e) => !e.field);
  if (!error && !general.length) return null;
  return (
    <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {general.length ? (
        <ul className="list-disc pl-4 space-y-0.5">
          {general.map((e, i) => (
            <li key={i}>{e.message}</li>
          ))}
        </ul>
      ) : (
        error
      )}
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="text-sm text-gray-500 py-6 text-center">{label}</div>;
}

export function SectionTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold text-[var(--p-text)]">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--p-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Table wrapper with horizontal scroll. */
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white border border-[var(--p-border)] rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">{head}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const th = 'text-left font-semibold px-3 py-2';
export const td = 'px-3 py-2 border-t border-gray-100 align-top';
