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
    <div className="bg-white border-b border-[#D6E5EC] px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#94A8B8]">{subtitle}</div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold text-[#3D5266]">{title}</h1>
            {typeof count === 'number' && <span className="text-sm text-[#94A8B8]">• {count} items</span>}
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
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6E5EC]">
          <h2 className="font-semibold text-[#3D5266]">{title}</h2>
          <button onClick={onClose} className="text-[#94A8B8] hover:text-[#3D5266] text-2xl leading-none">
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-[#D6E5EC] bg-[#F4F9FB] flex justify-end gap-2">
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
      <label className="block text-xs font-medium text-[#5A7A8C] mb-1">
        {label} {required && <span className="text-[#B9B5D8]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-1.5 text-sm border border-[#D6E5EC] rounded focus:border-[#5A7A8C] focus:outline-none focus:ring-1 focus:ring-[#5A7A8C]';

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
      className="px-3 py-1.5 bg-gradient-to-r from-[#5A7A8C] to-[#94A8B8] text-white text-sm rounded hover:from-[#3D5266] hover:to-[#5A7A8C] transition disabled:opacity-60 shadow-sm shadow-[#5A7A8C]/30"
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
      className="px-3 py-1.5 border border-[#D6E5EC] text-sm text-[#5A7A8C] rounded hover:bg-[#F4F9FB]"
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
  tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'air';
}) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    air: 'bg-[#D6E5EC] text-[#3D5266] border border-[#B9B5D8]',
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded ${tones[tone]}`}>{children}</span>
  );
}

export function Tile({
  label,
  value,
  hint,
  tone = 'storm',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'storm' | 'lavender' | 'pollen' | 'twilight';
}) {
  const tones: Record<string, string> = {
    storm: 'border-l-[#5A7A8C]',
    lavender: 'border-l-[#B9B5D8]',
    pollen: 'border-l-[#F7E5A1]',
    twilight: 'border-l-[#3D5266]',
  };
  return (
    <div className={`bg-white border border-[#D6E5EC] border-l-4 ${tones[tone]} rounded-lg p-4`}>
      <div className="text-xs uppercase tracking-wide text-[#94A8B8]">{label}</div>
      <div className="text-2xl font-semibold text-[#3D5266] mt-1">{value}</div>
      {hint && <div className="text-[10px] text-[#94A8B8] mt-1">{hint}</div>}
    </div>
  );
}
