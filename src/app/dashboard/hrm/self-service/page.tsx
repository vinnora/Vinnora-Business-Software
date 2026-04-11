'use client';

const cards = [
  {
    title: 'My Profile',
    icon: (
      <svg className="w-8 h-8 text-[#8B6F47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
      </svg>
    ),
    description: 'View and update your personal information, contact details, and emergency contacts.',
  },
  {
    title: 'My Leave Balance',
    icon: (
      <svg className="w-8 h-8 text-[#8B6F47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    description: 'Check your available leave balance, apply for leave, and view leave history.',
  },
  {
    title: 'My Payslips',
    icon: (
      <svg className="w-8 h-8 text-[#8B6F47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    description: 'Download monthly payslips, view salary breakdowns, and tax documents.',
  },
  {
    title: 'My Attendance',
    icon: (
      <svg className="w-8 h-8 text-[#8B6F47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'View your attendance records, check-in/out times, and overtime hours.',
  },
];

export default function SelfServicePage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-[#8B6F47]">HRM</div>
        <h1 className="text-2xl font-semibold text-[#2C2620]">Employee Self-Service</h1>
        <p className="text-sm text-[#6B5841] mt-1">Access your personal HR information and services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cards.map(card => (
          <div key={card.title} className="bg-white border border-[#E8D5B7] rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#FAF1E1] rounded-lg">{card.icon}</div>
              <div>
                <h3 className="font-semibold text-[#2C2620] mb-1">{card.title}</h3>
                <p className="text-sm text-[#6B5841]">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#FAF1E1] border border-[#E8D5B7] rounded-lg p-5">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-[#B5651D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-sm text-[#6B5841]">Connect your employee profile to access self-service features.</p>
        </div>
      </div>
    </div>
  );
}
