'use client';

import { useEffect, useState } from 'react';
import { Badge } from '../_components/ui';

type CalEvent = { _id: string; title: string; date: string; type: 'campaign' | 'email' | 'sms' | 'social' | 'event'; status: string };

const TYPE_COLOR: Record<string, string> = { campaign: 'blue', email: 'purple', sms: 'amber', social: 'green', event: 'air' };

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/marketing/campaigns').then(r => r.json()),
      fetch('/api/marketing/events').then(r => r.json()),
      fetch('/api/marketing/social').then(r => r.json()),
    ]).then(([campaigns, mktEvents, posts]) => {
      const all: CalEvent[] = [];
      (Array.isArray(campaigns) ? campaigns : []).forEach((c: any) => {
        if (c.startDate) all.push({ _id: c._id, title: c.name, date: c.startDate, type: 'campaign', status: c.status });
      });
      (Array.isArray(mktEvents) ? mktEvents : []).forEach((e: any) => {
        all.push({ _id: e._id, title: e.name, date: e.startDate, type: 'event', status: e.status });
      });
      (Array.isArray(posts) ? posts : []).forEach((p: any) => {
        const d = p.publishedAt || p.scheduledAt || p.createdAt;
        if (d) all.push({ _id: p._id, title: `${p.platform}: ${p.content.slice(0, 40)}`, date: d, type: 'social', status: p.status });
      });
      setEvents(all);
    }).finally(() => setLoading(false));
  }, []);

  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1).getDay();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) =>
    events.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === mo && d.getDate() === day; });

  const prevMonth = () => setMonth(new Date(year, mo - 1, 1));
  const nextMonth = () => setMonth(new Date(year, mo + 1, 1));
  const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-[#94A8B8]">Marketing</div>
        <h1 className="text-2xl font-semibold text-[#3D5266]">Marketing Calendar</h1>
      </div>

      <div className="bg-white border border-[#D6E5EC] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-3 py-1 text-sm text-[#5A7A8C] hover:bg-[#F4F9FB] rounded">← Prev</button>
          <h2 className="text-lg font-semibold text-[#3D5266]">{monthLabel}</h2>
          <button onClick={nextMonth} className="px-3 py-1 text-sm text-[#5A7A8C] hover:bg-[#F4F9FB] rounded">Next →</button>
        </div>

        {loading ? <div className="text-center text-[#94A8B8] py-8">Loading…</div> : (
          <>
            <div className="grid grid-cols-7 text-xs uppercase text-[#94A8B8] text-center mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#D6E5EC]">
              {cells.map((day, i) => {
                const dayEvents = day ? eventsForDay(day) : [];
                const isToday = day && new Date().getFullYear() === year && new Date().getMonth() === mo && new Date().getDate() === day;
                return (
                  <div key={i} className={`bg-white min-h-[80px] p-1 ${!day ? 'bg-[#F4F9FB]' : ''}`}>
                    {day && (
                      <>
                        <div className={`text-xs mb-1 ${isToday ? 'bg-[#5A7A8C] text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-[#5A7A8C]'}`}>{day}</div>
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e._id} className="mb-0.5">
                            <Badge tone={TYPE_COLOR[e.type] as any || 'gray'}>
                              <span className="truncate block max-w-[100px] text-[9px]">{e.title}</span>
                            </Badge>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] text-[#94A8B8]">+{dayEvents.length - 3} more</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
