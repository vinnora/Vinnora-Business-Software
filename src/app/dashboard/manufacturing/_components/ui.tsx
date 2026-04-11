'use client';

import type { ReactNode } from 'react';

export const fmtINR = (n = 0) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export function PageHeader({ title, subtitle, count, actions }: { title: string; subtitle?: string; count?: number; actions?: ReactNode }) {
  return (
    <div className="bg-white border-b border-[#E5E7EB] px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#6B7280]">{subtitle}</div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold text-[#1C1C1E]">{title}</h1>
            {typeof count === 'number' && <span className="text-sm text-[#6B7280]">• {count} items</span>}
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-2xl' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1C1C1E]">{title}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1C1C1E] text-2xl leading-none">×</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-[#E5E7EB] bg-[#F3F4F6] flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-[#4A4E54] mb-1">{label} {required && <span className="text-[#D4A843]">*</span>}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:border-[#4A4E54] focus:outline-none focus:ring-1 focus:ring-[#4A4E54]';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputCls} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} bg-white`} />;
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="px-3 py-1.5 bg-gradient-to-r from-[#4A4E54] to-[#6B7280] text-white text-sm rounded hover:from-[#2C2F33] hover:to-[#4A4E54] transition disabled:opacity-60 shadow-sm shadow-[#4A4E54]/30">
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className="px-3 py-1.5 border border-[#E5E7EB] text-sm text-[#4A4E54] rounded hover:bg-[#F3F4F6]">
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gold' }) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    gold: 'bg-[#FEF3C7] text-[#92400E] border border-[#D4A843]',
  };
  return <span className={`inline-block px-2 py-0.5 text-xs rounded ${tones[tone]}`}>{children}</span>;
}

export function Tile({ label, value, hint, tone = 'steel' }: { label: string; value: ReactNode; hint?: string; tone?: 'steel' | 'gold' | 'copper' | 'iron' }) {
  const tones: Record<string, string> = {
    steel: 'border-l-[#4A4E54]',
    gold: 'border-l-[#D4A843]',
    copper: 'border-l-[#B87333]',
    iron: 'border-l-[#1C1C1E]',
  };
  return (
    <div className={`bg-white border border-[#E5E7EB] border-l-4 ${tones[tone]} rounded-lg p-4`}>
      <div className="text-xs uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="text-2xl font-semibold text-[#1C1C1E] mt-1">{value}</div>
      {hint && <div className="text-[10px] text-[#6B7280] mt-1">{hint}</div>}
    </div>
  );
}
