'use client';

import type { ReactNode } from 'react';

export const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export function PageHeader({
  title,
  subtitle,
  count,
  actions,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-white border-b border-[#FFE5C4] px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#A0522D]">{subtitle}</div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold text-[#4A1D0F]">{title}</h1>
            {typeof count === 'number' && <span className="text-sm text-[#A0522D]">• {count} items</span>}
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#FFE5C4]">
          <h2 className="font-semibold text-[#4A1D0F]">{title}</h2>
          <button onClick={onClose} className="text-[#A0522D] hover:text-[#4A1D0F] text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-[#FFE5C4] bg-[#FFF6E5] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-[#6B2410] mb-1">
        {label} {required && <span className="text-[#E2671A]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-1.5 text-sm border border-[#FFE5C4] rounded focus:border-[#E2671A] focus:outline-none focus:ring-1 focus:ring-[#E2671A]';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputCls} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} bg-white`} />;
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-3 py-1.5 bg-gradient-to-r from-[#E2671A] to-[#F4A03A] text-white text-sm rounded hover:from-[#B14411] hover:to-[#E2671A] transition disabled:opacity-60 shadow-sm shadow-[#E2671A]/30"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="px-3 py-1.5 border border-[#FFE5C4] text-sm text-[#6B2410] rounded hover:bg-[#FFF6E5]"
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'fire';
}) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-[#FFE5C4] text-[#B14411]',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    fire: 'bg-[#FFE5C4] text-[#6B2410] border border-[#F4A03A]',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded ${tones[tone]}`}>{children}</span>
  );
}

export function Tile({
  label,
  value,
  hint,
  tone = 'fire',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'fire' | 'amber' | 'glow' | 'red';
}) {
  const tones: Record<string, string> = {
    fire: 'border-l-[#E2671A]',
    amber: 'border-l-[#F4A03A]',
    glow: 'border-l-[#FFC15E]',
    red: 'border-l-[#B14411]',
  };
  return (
    <div className={`bg-white border border-[#FFE5C4] border-l-4 ${tones[tone]} rounded-lg p-4`}>
      <div className="text-xs uppercase tracking-wide text-[#A0522D]">{label}</div>
      <div className="text-2xl font-semibold text-[#4A1D0F] mt-1">{value}</div>
      {hint && <div className="text-[10px] text-[#A0522D] mt-1">{hint}</div>}
    </div>
  );
}
