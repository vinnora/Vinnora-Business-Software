import Link from 'next/link';
import { CustomObjectNav } from '@/components/platform/CustomObjectNav';
import type { ReactNode } from 'react';
import { MarketingIcon } from '@/components/ModuleIcon';
import QuickStart from '@/components/QuickStart';
import { QUICK_START } from '@/lib/quick-start-steps';

const NAV = [
  { href: '/dashboard/marketing', label: 'Home', icon: 'home' },
  { href: '/dashboard/marketing/campaigns', label: 'Promotions', icon: 'megaphone' },
  { href: '/dashboard/marketing/email', label: 'Email', icon: 'mail' },
  { href: '/dashboard/marketing/sms', label: 'SMS', icon: 'phone' },
  { href: '/dashboard/marketing/social', label: 'Social Media', icon: 'share' },
  { href: '/dashboard/marketing/leads', label: 'Enquiries', icon: 'magnet' },
  { href: '/dashboard/marketing/events', label: 'Events', icon: 'calendar' },
  { href: '/dashboard/marketing/surveys', label: 'Surveys', icon: 'clipboard' },
  { href: '/dashboard/marketing/automation', label: 'Automation', icon: 'zap' },
  { href: '/dashboard/marketing/content', label: 'Content', icon: 'folder' },
  { href: '/dashboard/marketing/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/dashboard/marketing/calendar', label: 'Calendar', icon: 'grid' },
  { href: '/dashboard/marketing/tasks', label: 'To-dos', icon: 'check' },
  { href: '/dashboard/marketing/setup', label: 'Settings', icon: 'gear' },
];

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const c = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' };
  switch (name) {
    case 'home':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" /></svg>;
    case 'megaphone':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 01-6 6H5l-2 4V4l2 4h7a6 6 0 016 0zM15 18a2 2 0 004 0v-2" /></svg>;
    case 'mail':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8l9-4 9 4" /></svg>;
    case 'phone':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-1z" /></svg>;
    case 'share':
      return <svg {...c}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path strokeLinecap="round" d="M8.6 13.5l6.8 3M15.4 7.5l-6.8 3" /></svg>;
    case 'magnet':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M6 4v6a6 6 0 0012 0V4M6 4H3v6a9 9 0 0018 0V4h-3" /></svg>;
    case 'calendar':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM16 2v4M8 2v4M3 10h18" /></svg>;
    case 'clipboard':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 14l2 2 4-4" /></svg>;
    case 'zap':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8" /></svg>;
    case 'folder':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>;
    case 'chart':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 3 3 6-7" /></svg>;
    case 'grid':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>;
    case 'check':
      return <svg {...c}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'gear':
      return <svg {...c}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>;
    default:
      return null;
  }
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F4F9FB]">
      <aside
        className="w-60 text-white flex flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #3D5266 0%, #5A7A8C 50%, #94A8B8 100%)',
        }}
      >
        <div className="px-5 py-4 border-b border-white/10 relative">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <MarketingIcon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/60">Vinnora</div>
              <div className="text-sm font-semibold">Marketing</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto relative">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/10 transition border-l-2 border-transparent hover:border-[#B9B5D8]"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          <CustomObjectNav app="marketing" basePath="/dashboard/marketing" />
        </nav>
        {/* Decorative lavender glow */}
        <div
          className="absolute bottom-12 left-0 right-0 h-16 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center bottom, rgba(185,181,216,0.6) 0%, transparent 70%)',
          }}
        />
        <div className="px-5 py-3 border-t border-white/10 text-xs text-white/60 relative">
          <Link href="/dashboard" className="hover:text-white">
            ← All apps
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#D6E5EC] flex items-center px-6 gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search promotions, enquiries, content..."
              className="w-full max-w-md px-4 py-1.5 text-sm bg-[#F4F9FB] border border-transparent rounded focus:bg-white focus:border-[#5A7A8C] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-[#5A7A8C]">
            <button className="p-2 hover:bg-[#F4F9FB] rounded">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A6 6 0 0119 11V8a7 7 0 10-14 0v3a6 6 0 01-.6 4.6L3 17h5m7 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A7A8C] to-[#3D5266] flex items-center justify-center text-white text-sm font-semibold">
              U
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <QuickStart
        moduleKey="marketing"
        moduleName={QUICK_START.marketing.name}
        steps={QUICK_START.marketing.steps}
        accentFrom={QUICK_START.marketing.accentFrom}
        accentTo={QUICK_START.marketing.accentTo}
      />
    </div>
  );
}
