'use client';

import Link from 'next/link';

const PLANS = [
  {
    id: 'free',
    name: 'Starter',
    price: '0',
    period: 'Forever free',
    desc: 'Any 1 app, full features',
    features: ['1 app of your choice', 'Full feature access', 'Default workflows', 'Basic integrations'],
    cta: 'Current Plan',
    highlight: false,
  },
  {
    id: 'custom',
    name: 'Custom',
    price: '90',
    period: '/app/user/month',
    desc: 'Pick any 3 apps',
    features: ['Choose any 3 apps', 'Cross-app connections', 'All workflows', 'Yearly: \u20B975/app/mo (save 17%)'],
    cta: 'Upgrade',
    highlight: false,
  },
  {
    id: 'all-in-one',
    name: 'All-in-One',
    price: '499',
    period: '/user/month',
    desc: 'All 6 apps, fully integrated',
    features: ['All 6 apps integrated', 'Full cross-app connections', 'All integrations', 'Priority support', 'Yearly: \u20B9374/mo (save 25%)'],
    cta: 'Upgrade',
    highlight: true,
  },
];

export function SubscriptionPlan({
  accentColor = '#0077B6',
  accentBg = '#E0F4F8',
  textColor = '#012A4A',
  mutedColor = '#6B7280',
  borderColor = '#E5E7EB',
}: {
  accentColor?: string;
  accentBg?: string;
  textColor?: string;
  mutedColor?: string;
  borderColor?: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1" style={{ color: textColor }}>Subscription &amp; Plan</h2>
      <p className="text-sm mb-6" style={{ color: mutedColor }}>
        Manage your subscription. Upgrade to unlock more apps and cross-app integrations.
      </p>

      {/* Current plan badge */}
      <div className="rounded-lg border p-4 mb-6" style={{ borderColor, background: accentBg }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: accentColor }}>Current Plan</div>
            <div className="text-xl font-bold mt-1" style={{ color: textColor }}>Starter (Free)</div>
            <div className="text-sm mt-1" style={{ color: mutedColor }}>1 app included. Upgrade to access more apps and cross-app features.</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: textColor }}>{'\u20B9'}0</div>
            <div className="text-xs" style={{ color: mutedColor }}>/user/month</div>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-lg border p-5 ${plan.highlight ? 'ring-2 ring-current shadow-lg' : ''}`}
            style={{
              borderColor: plan.highlight ? accentColor : borderColor,
              color: plan.highlight ? accentColor : undefined,
            }}
          >
            {plan.highlight && (
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded inline-block mb-2" style={{ background: accentColor, color: 'white' }}>
                Best Value
              </div>
            )}
            <div className="text-xs uppercase tracking-wide font-semibold" style={{ color: accentColor }}>{plan.name}</div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold" style={{ color: textColor }}>{'\u20B9'}{plan.price}</span>
              <span className="text-xs" style={{ color: mutedColor }}>{plan.period}</span>
            </div>
            <p className="text-xs mt-1 mb-3" style={{ color: mutedColor }}>{plan.desc}</p>
            <ul className="space-y-1.5 mb-4">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs" style={{ color: textColor }}>
                  <span style={{ color: accentColor }} className="mt-0.5">{'\u2713'}</span>
                  {f}
                </li>
              ))}
            </ul>
            {plan.id === 'free' ? (
              <div className="text-center text-xs font-medium py-2 rounded" style={{ background: accentBg, color: accentColor }}>
                Current Plan
              </div>
            ) : (
              <Link
                href="/auth/signup"
                className="block text-center text-xs font-medium py-2 rounded text-white transition hover:opacity-90"
                style={{ background: accentColor }}
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Usage info */}
      <div className="rounded-lg border p-4" style={{ borderColor }}>
        <div className="text-sm font-semibold mb-2" style={{ color: textColor }}>Plan Usage</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: mutedColor }}>Apps Active</div>
            <div className="text-lg font-bold mt-1" style={{ color: textColor }}>1 / 1</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: mutedColor }}>Users</div>
            <div className="text-lg font-bold mt-1" style={{ color: textColor }}>1</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: mutedColor }}>Billing Cycle</div>
            <div className="text-lg font-bold mt-1" style={{ color: textColor }}>Free</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide" style={{ color: mutedColor }}>Next Renewal</div>
            <div className="text-lg font-bold mt-1" style={{ color: textColor }}>N/A</div>
          </div>
        </div>
      </div>
    </div>
  );
}
