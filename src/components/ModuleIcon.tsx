/**
 * Domain icons for each business module — used wherever a module is shown
 * (landing page, dashboard launcher, sidebar avatars, etc.).
 *
 * Pure SVG. Stroke colour follows currentColor so the parent's text colour
 * controls the icon tint.
 */

type Props = { size?: number; className?: string };

const base = (size: number, cls: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: cls,
  xmlns: 'http://www.w3.org/2000/svg',
});

/** Sales & Service — headset / customer support */
export function SalesServiceIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 14v-2a9 9 0 0118 0v2" />
      <path d="M21 14v3a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3z" />
      <path d="M3 14v3a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
      <path d="M12 19v1a2 2 0 002 2h2" />
    </svg>
  );
}

/** Accounting — calculator */
export function AccountingIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <rect x="7" y="6" width="10" height="3" rx="0.5" />
      <circle cx="8.5" cy="13" r="0.6" fill="currentColor" />
      <circle cx="12" cy="13" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="13" r="0.6" fill="currentColor" />
      <circle cx="8.5" cy="16" r="0.6" fill="currentColor" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="16" r="0.6" fill="currentColor" />
      <circle cx="8.5" cy="19" r="0.6" fill="currentColor" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
      <circle cx="15.5" cy="19" r="0.6" fill="currentColor" />
    </svg>
  );
}

/** Inventory — stacked boxes */
export function InventoryIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
      <path d="M7.5 5.5l9 5" />
    </svg>
  );
}

/** Marketing — megaphone */
export function MarketingIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 11v2a2 2 0 002 2h1l3 4 1-1-1-3h2l9 4V5l-9 4H5a2 2 0 00-2 2z" />
      <path d="M18 8v8" />
    </svg>
  );
}

/** HRM — group of people */
export function HrmIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 20c0-2 1.5-3.5 4-3.5" />
    </svg>
  );
}

/** Manufacturing — gear/cog */
export function ManufacturingIcon({ size = 28, className = '' }: Props) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}
