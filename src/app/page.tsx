import Link from 'next/link';
import {
  SalesServiceIcon,
  AccountingIcon,
  InventoryIcon,
  MarketingIcon,
  HrmIcon,
  ManufacturingIcon,
} from '@/components/ModuleIcon';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const MODULES = [
  { name: 'Sell & Support', icon: SalesServiceIcon, desc: 'CRM, enquiries, deals, quotations, tickets and field service.', color: '#0077B6', bg: '#E0F4F8' },
  { name: 'Accounting', icon: AccountingIcon, desc: 'Ledger, invoices, payroll, taxes and reports.', color: '#2D6A4F', bg: '#D8F3DC' },
  { name: 'Inventory', icon: InventoryIcon, desc: 'Stock, forecasting, warehouses and procurement.', color: '#B14411', bg: '#FFF1D6' },
  { name: 'Marketing', icon: MarketingIcon, desc: 'Promotions, segmentation and pricing strategy.', color: '#5A7A8C', bg: '#E8F1F5' },
  { name: 'HRM', icon: HrmIcon, desc: 'Recruitment, employee records and performance.', color: '#8B6F47', bg: '#F2E4CF' },
  { name: 'Manufacturing', icon: ManufacturingIcon, desc: 'Production, BOM, quality control and shop floor.', color: '#4A4E54', bg: '#F3F4F6' },
];

const PAIN_POINTS = [
  { stat: '6+', label: 'separate tools the average SMB juggles', icon: '🔀' },
  { stat: '12hrs', label: 'per week lost to manual data transfers', icon: '⏱' },
  { stat: '40%', label: 'of data errors from copy-pasting between apps', icon: '❌' },
  { stat: '₹15K+', label: 'per user/mo when buying tools individually', icon: '💸' },
];

const FEATURES_COMPARE = [
  { feature: 'CRM & Sales Pipeline', vinnora: true, separate: 'Zoho CRM / other CRM software' },
  { feature: 'Accounting & GST', vinnora: true, separate: 'Tally / QuickBooks' },
  { feature: 'Inventory & Warehousing', vinnora: true, separate: 'Zoho Inventory / Unicommerce' },
  { feature: 'Marketing Automation', vinnora: true, separate: 'Mailchimp / HubSpot' },
  { feature: 'HRMS & Payroll', vinnora: true, separate: 'Keka / GreytHR' },
  { feature: 'Manufacturing & BOM', vinnora: true, separate: 'SAP / Katana' },
  { feature: 'Cross-app automation', vinnora: true, separate: 'Zapier (extra cost)' },
  { feature: 'Unified dashboard', vinnora: true, separate: 'Not available' },
  { feature: 'Single login & billing', vinnora: true, separate: '6 separate accounts' },
  { feature: 'India compliance built-in', vinnora: true, separate: 'Varies by tool' },
];

const INDUSTRIES = [
  'Retail & E-commerce', 'Manufacturing', 'Professional Services', 'Healthcare',
  'Education', 'Real Estate', 'Logistics', 'Agriculture', 'Hospitality', 'Startups',
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ============== HEADER ============== */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center text-white font-bold text-sm">V</div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-gray-400">Vinnora</div>
              <div className="text-sm font-semibold text-gray-900">Business Ally</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#apps" className="hover:text-gray-900 transition">Apps</a>
            <a href="#pricing" className="hover:text-gray-900 transition">Pricing</a>
            <a href="#compare" className="hover:text-gray-900 transition">Compare</a>
            <a href="#why" className="hover:text-gray-900 transition">Why Vinnora</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition">Sign In</Link>
            <Link href="/auth/signup" className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition">Start Free</Link>
          </div>
        </div>
      </header>

      {/* ============== HERO ============== */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Subtle multi-color gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#0077B6]/8 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#2D6A4F]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] bg-[#B14411]/6 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-[#5A7A8C]/6 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gray-500 bg-gray-50 border border-gray-200 px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            One platform &middot; Six apps &middot; Zero friction
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 max-w-4xl mx-auto">
            Stop juggling tools.<br />
            <span className="bg-gradient-to-r from-[#0077B6] via-[#2D6A4F] to-[#B14411] bg-clip-text text-transparent">
              Run everything from one place.
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Vinnora brings sales, accounting, inventory, marketing, HR and manufacturing
            into a single, connected workspace. Start with <strong>one app free</strong>, scale when you are ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth/signup" className="px-7 py-3.5 text-base font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition shadow-xl shadow-gray-900/20">
              Start free &mdash; no card needed
            </Link>
            <a href="#pricing" className="px-7 py-3.5 text-base font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              View pricing
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-gray-400">
            <span>GST &amp; TDS compliant</span>
            <span>&middot;</span>
            <span>WhatsApp &amp; Tally connected</span>
            <span>&middot;</span>
            <span>No vendor lock-in</span>
            <span>&middot;</span>
            <span>Made for India</span>
          </div>
        </div>
      </section>

      {/* ============== PAIN POINTS ============== */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">The problem with separate tools</h2>
            <p className="text-sm text-gray-500 mt-2">When your CRM doesn&apos;t talk to your accounting, everyone loses.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.stat} className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                <div className="text-2xl mb-2">{p.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{p.stat}</div>
                <div className="text-xs text-gray-500 mt-1 leading-snug">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== APPS ============== */}
      <section id="apps" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2">The Suite</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Six apps. One connected platform.
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              Each app is purpose-built for its domain. Together they share data, automate hand-offs,
              and give you a single source of truth. Flexible enough for any industry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.name} className="group border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all bg-white">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: m.bg, color: m.color }}>
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{m.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{m.desc}</p>
                  <div className="mt-4 h-0.5 rounded" style={{ background: `linear-gradient(90deg, ${m.color}, ${m.color}40)` }} />
                </div>
              );
            })}
          </div>

          {/* Industry tags */}
          <div className="mt-12 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Works for every industry</div>
            <div className="flex flex-wrap justify-center gap-2">
              {INDUSTRIES.map((ind) => (
                <span key={ind} className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-full">{ind}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== HOW IT CONNECTS ============== */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2">Integrated by Design</div>
            <h2 className="text-3xl sm:text-4xl font-bold">Your apps talk to each other. Automatically.</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Close a deal in Sell &amp; Support? An invoice appears in Accounting. Hire someone in HR? They show up in CRM.
              Run low on stock? Sell &amp; Support gets an alert. That&apos;s Vinnora.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { from: 'Sell & Support', to: 'Accounting', flow: 'Closed deal auto-creates invoice with line items, tax, and customer mapped.' },
              { from: 'Marketing', to: 'Sell & Support', flow: 'Qualified enquiries automatically appear in the sales pipeline, scored and tagged.' },
              { from: 'HR', to: 'Sell & Support', flow: 'New employees auto-create CRM people records. Exit triggers offboarding workflows.' },
              { from: 'Inventory', to: 'Sell & Support', flow: 'Low stock alerts notify account managers. Out-of-stock pauses quoting.' },
              { from: 'HR Payroll', to: 'Accounting', flow: 'Processed payroll auto-posts salary expense entries to the general ledger.' },
              { from: 'Manufacturing', to: 'Inventory', flow: 'Completed work orders update finished goods stock. QC failures flag materials.' },
            ].map((c) => (
              <div key={c.from + c.to} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-white/90 bg-white/10 px-2 py-0.5 rounded">{c.from}</span>
                  <span className="text-white/30">&#8594;</span>
                  <span className="text-xs font-semibold text-white/90 bg-white/10 px-2 py-0.5 rounded">{c.to}</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{c.flow}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== PRICING ============== */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2">Pricing</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Start free. Upgrade when it makes sense.
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              No hidden fees. No per-feature charges. Pick a plan that matches where your business is today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Free */}
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">Starter</div>
              <h3 className="text-2xl font-bold text-gray-900">Free</h3>
              <p className="text-gray-500 text-sm mt-1">Forever. No card required.</p>
              <div className="mt-5 mb-6">
                <span className="text-5xl font-bold text-gray-900">&#8377;0</span>
                <span className="text-gray-400 text-sm"> / user / month</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-700 mb-8">
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> <strong>Any 1 app</strong> of your choice</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Full feature access within that app</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Default workflows &amp; automations</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Basic integrations (WhatsApp, Email)</li>
                <li className="flex items-start gap-2"><span className="text-gray-300 mt-0.5">&#10007;</span><span className="text-gray-400">Cross-app connections</span></li>
                <li className="flex items-start gap-2"><span className="text-gray-300 mt-0.5">&#10007;</span><span className="text-gray-400">Multi-app data flow</span></li>
              </ul>
              <Link href="/auth/signup" className="block text-center px-4 py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Get started free</Link>
              <p className="text-[10px] text-gray-400 text-center mt-2">No credit card. No time limit.</p>
            </div>

            {/* All-in-One — highlighted */}
            <div className="relative bg-gray-900 text-white rounded-2xl p-7 shadow-2xl shadow-gray-900/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0077B6] to-[#00B4D8] text-white text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-1 rounded-full shadow-lg">
                Most Popular
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">All-in-One</div>
              <h3 className="text-2xl font-bold">&#8377;499</h3>
              <p className="text-gray-400 text-sm mt-1">per user / month</p>
              <div className="mt-3 mb-1 flex items-center gap-2">
                <span className="text-sm font-medium text-[#48CAE4]">Yearly: &#8377;374/mo</span>
                <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-semibold">SAVE 25%</span>
              </div>
              <p className="text-xs text-gray-500 mb-5">&#8377;4,488/user/year billed annually</p>
              <ul className="space-y-3 text-sm text-gray-300 mb-8">
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> <strong className="text-white">All 6 apps</strong> &mdash; fully integrated</li>
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> Cross-app connections (Sell &amp; Support &#8594; Accounting, etc.)</li>
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> Unified dashboard &amp; reporting</li>
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> All workflows &amp; automations</li>
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> All integrations (WhatsApp, Tally, SAP&hellip;)</li>
                <li className="flex items-start gap-2"><span className="text-[#48CAE4] font-bold mt-0.5">&#10003;</span> Priority support</li>
              </ul>
              <Link href="/auth/signup" className="block text-center px-4 py-3 text-sm font-semibold text-gray-900 bg-white rounded-xl hover:bg-gray-100 transition shadow-lg">Start 14-day free trial</Link>
              <p className="text-[10px] text-gray-500 text-center mt-2">Cancel anytime. Full access from day one.</p>
            </div>

            {/* Custom */}
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">Custom Bundle</div>
              <h3 className="text-2xl font-bold text-gray-900">Pick 3 Apps</h3>
              <p className="text-gray-500 text-sm mt-1">Build your own suite.</p>
              <div className="mt-5 mb-1">
                <span className="text-5xl font-bold text-gray-900">&#8377;90</span>
                <span className="text-gray-400 text-sm"> / app / user / month</span>
              </div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Yearly: &#8377;75/app/mo</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">SAVE 17%</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">3 apps = &#8377;270/user/month (or &#8377;225 yearly)</p>
              <ul className="space-y-3 text-sm text-gray-700 mb-8">
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Choose <strong>any 3 apps</strong></li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Cross-app connections between chosen apps</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> All workflows &amp; automations</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> All integrations for chosen apps</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Add more apps anytime at &#8377;90/app</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold mt-0.5">&#10003;</span> Standard support</li>
              </ul>
              <Link href="/auth/signup" className="block text-center px-4 py-3 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition">Build your bundle</Link>
              <p className="text-[10px] text-gray-400 text-center mt-2">Upgrade to All-in-One anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== FEATURE COMPARISON TABLE ============== */}
      <section id="compare" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2">Comparison</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              One platform vs. six separate tools
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
              See what you get with Vinnora versus buying and managing each tool individually.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">Feature</th>
                  <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-gray-900 font-bold">Vinnora</th>
                  <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-gray-500 font-semibold">Separate Tools</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES_COMPARE.map((f, i) => (
                  <tr key={f.feature} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-700">{f.feature}</td>
                    <td className="px-5 py-3 text-center"><span className="text-green-600 font-bold">&#10003; Built-in</span></td>
                    <td className="px-5 py-3 text-center text-gray-400 text-xs">{f.separate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-900 px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">Total with Vinnora All-in-One</div>
                <div className="text-gray-400 text-xs">Everything above. One login. One bill.</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">&#8377;499<span className="text-sm font-normal text-gray-400">/user/mo</span></div>
                <div className="text-xs text-gray-500">vs &#8377;5,300–15,500 with separate tools</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== COST COMPARISON VISUAL ============== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">The real cost of separate tools</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              For a team of 10 users, here&apos;s what you&apos;d spend monthly buying each tool individually vs. Vinnora.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-red-200 rounded-2xl p-6">
              <div className="text-xs uppercase tracking-wide text-red-500 font-bold mb-4">Separate Tools (10 users)</div>
              <div className="space-y-3">
                {[
                  { tool: 'CRM (Zoho or similar)', cost: '₹1,500/user' },
                  { tool: 'Accounting (Tally/QB)', cost: '₹800/user' },
                  { tool: 'Inventory (Unicommerce)', cost: '₹1,200/user' },
                  { tool: 'Marketing (HubSpot)', cost: '₹2,000/user' },
                  { tool: 'HRMS (Keka)', cost: '₹800/user' },
                  { tool: 'Manufacturing (Katana)', cost: '₹2,500/user' },
                  { tool: 'Zapier (to connect them)', cost: '₹500/user' },
                ].map((t) => (
                  <div key={t.tool} className="flex justify-between text-sm">
                    <span className="text-gray-600">{t.tool}</span>
                    <span className="text-gray-900 font-medium">{t.cost}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-red-100">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total per user/mo</span>
                  <span className="font-bold text-red-600 text-lg">&#8377;9,300</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">10 users / month</span>
                  <span className="font-bold text-red-600">&#8377;93,000</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-500">Annual cost</span>
                  <span className="font-bold text-red-600">&#8377;11,16,000</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-red-500 bg-red-50 rounded-lg p-3">
                Plus: no integration between tools, manual data re-entry, 6+ vendor relationships, inconsistent reporting.
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-6">
              <div className="text-xs uppercase tracking-wide text-[#48CAE4] font-bold mb-4">Vinnora All-in-One (10 users)</div>
              <div className="space-y-3">
                {[
                  { item: 'All 6 apps included', note: 'No per-app charges' },
                  { item: 'Cross-app automation', note: 'Built-in, no Zapier needed' },
                  { item: 'All integrations', note: 'WhatsApp, Tally, SAP, Zoho' },
                  { item: 'India compliance', note: 'GST, TDS, PF, Aadhaar' },
                  { item: 'Unified dashboard', note: 'One source of truth' },
                  { item: 'Priority support', note: 'Included' },
                ].map((t) => (
                  <div key={t.item} className="flex justify-between text-sm">
                    <span className="text-gray-300">&#10003; {t.item}</span>
                    <span className="text-gray-500 text-xs">{t.note}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="font-semibold">Total per user/mo</span>
                  <span className="font-bold text-[#48CAE4] text-lg">&#8377;499</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-400">10 users / month</span>
                  <span className="font-bold text-[#48CAE4]">&#8377;4,990</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm text-gray-400">Annual (25% off)</span>
                  <span className="font-bold text-[#48CAE4]">&#8377;44,880</span>
                </div>
              </div>
              <div className="mt-3 bg-[#48CAE4]/10 rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-[#48CAE4]">Save &#8377;10,71,120/year</span>
                <div className="text-xs text-gray-400 mt-1">That&apos;s 96% less than buying tools separately.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== WHY VINNORA ============== */}
      <section id="why" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400 mb-2">Why Vinnora</div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Built for how businesses actually work</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Flexible for any business', body: 'Whether you run a 5-person startup or a 500-person manufacturer, Vinnora adapts. Pick the apps you need, customize workflows, and scale at your own pace.', icon: '🔧' },
              { title: 'India-first compliance', body: 'GST, TDS, PAN, HRA, PF, Aadhaar, E-Way Bills — not bolted on as plugins but built into the core. Works out of the box for Indian businesses.', icon: '🇮🇳' },
              { title: 'No-code automations', body: 'Set up email alerts, auto-assign enquiries, create invoices on deal close, trigger onboarding — all without writing a single line of code.', icon: '⚡' },
              { title: 'One source of truth', body: 'No more conflicting reports from different tools. Every app reads from and writes to the same database, so your numbers always match.', icon: '🎯' },
              { title: 'Open integrations', body: 'Connect WhatsApp, Tally, Zoho, SAP, ShipRocket, Slack, and more. Use webhooks and API tokens to plug in anything else.', icon: '🔌' },
              { title: 'Start free, grow later', body: 'Begin with one app at zero cost. When you outgrow it, add more apps or switch to All-in-One. No lock-in, no forced upgrades.', icon: '🌱' },
            ].map((p) => (
              <div key={p.title} className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition">
                <div className="text-2xl mb-3">{p.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== FINAL CTA ============== */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Ready to simplify your business?</h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto">
            Join thousands of Indian businesses running on Vinnora. Set up in under a minute.
            One app free forever &mdash; upgrade only when you want to.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth/signup" className="px-7 py-3.5 text-base font-semibold text-gray-900 bg-white rounded-xl hover:bg-gray-100 transition shadow-xl">
              Create your free account
            </Link>
            <Link href="/auth/signin" className="px-7 py-3.5 text-base font-medium text-white border border-white/20 rounded-xl hover:bg-white/10 transition">
              I already have one
            </Link>
          </div>
          <div className="mt-6 text-xs text-gray-500">No credit card required &middot; Free plan never expires &middot; Cancel paid plans anytime</div>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center text-white font-bold text-xs">V</div>
              <span className="text-sm font-semibold text-gray-400">Vinnora Business Ally</span>
            </div>
            <div className="flex flex-wrap gap-6 text-xs">
              <a href="#apps" className="hover:text-white transition">Apps</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <a href="#compare" className="hover:text-white transition">Compare</a>
              <a href="#why" className="hover:text-white transition">Why Vinnora</a>
              <Link href="/auth/signin" className="hover:text-white transition">Sign In</Link>
            </div>
            <div className="text-xs">&copy; {new Date().getFullYear()} Vinnora. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
