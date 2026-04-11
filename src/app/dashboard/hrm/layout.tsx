import Link from 'next/link';
import type { ReactNode } from 'react';
import { HrmIcon } from '@/components/ModuleIcon';

const NAV = [
  { href: '/dashboard/hrm', label: 'Home', icon: 'home' },
  { href: '/dashboard/hrm/employees', label: 'Employees', icon: 'users' },
  { href: '/dashboard/hrm/recruitment', label: 'Recruitment', icon: 'briefcase' },
  { href: '/dashboard/hrm/leave', label: 'Leave', icon: 'calendar' },
  { href: '/dashboard/hrm/attendance', label: 'Attendance', icon: 'clock' },
  { href: '/dashboard/hrm/payroll', label: 'Payroll', icon: 'wallet' },
  { href: '/dashboard/hrm/performance', label: 'Performance', icon: 'star' },
  { href: '/dashboard/hrm/onboarding', label: 'Onboarding', icon: 'rocket' },
  { href: '/dashboard/hrm/self-service', label: 'Self Service', icon: 'user' },
  { href: '/dashboard/hrm/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/dashboard/hrm/setup', label: 'Setup', icon: 'gear' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const c = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'users':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.74" /></svg>;
    case 'briefcase':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>;
    case 'calendar':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM16 2v4M8 2v4M3 10h18" /></svg>;
    case 'clock':
      return <svg {...c}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>;
    case 'wallet':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7zM16 12h.01M2 7l18-3" /></svg>;
    case 'star':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" /></svg>;
    case 'rocket':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 01-4 2z" /></svg>;
    case 'user':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>;
    case 'chart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" /></svg>;
    case 'gear':
      return <svg {...c}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    default:
      return null;
  }
}

export default function HrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#FAF1E1]">
      <aside className="w-60 text-white flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #2C2620 0%, #463A2D 50%, #6B5841 100%)' }}>
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <HrmIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Human Resources</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#C9A178]">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-12 left-0 right-0 h-16 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center bottom, rgba(201,161,120,0.6) 0%, transparent 70%)' }} />
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">← All apps</Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#E8D5B7] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input type="text" placeholder="Search employees, jobs, leave…" className="w-full max-w-md px-4 py-1.5 text-sm bg-[#FAF1E1] border border-transparent rounded focus:bg-white focus:border-[#8B6F47] focus:outline-none" />
          </div>
          <div className="flex items-center gap-3 text-[#6B5841]">
            <button className="p-2 hover:bg-[#FAF1E1] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B6F47] to-[#2C2620] flex items-center justify-center text-white text-sm font-semibold">U</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
