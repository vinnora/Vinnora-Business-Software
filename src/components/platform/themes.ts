import type { AppKey } from '@/lib/platform/types';
import type { PlatformTheme } from './ui';

/** Module colours (match each module's Setup / Subscription styling). */
export const MODULE_THEMES: Record<AppKey | 'setup', PlatformTheme> = {
  'sales-service': { accent: '#0176d3', accentBg: '#E0F4F8', text: '#012A4A', muted: '#6B7280', border: '#E5E7EB' },
  accounting: { accent: '#059669', accentBg: '#ECFDF5', text: '#1F2937', muted: '#6B7280', border: '#E5E7EB' },
  inventory: { accent: '#E2671A', accentBg: '#FFF6E5', text: '#4A1D0F', muted: '#A0522D', border: '#FFE5C4' },
  marketing: { accent: '#5A7A8C', accentBg: '#F4F9FB', text: '#3D5266', muted: '#94A8B8', border: '#D6E5EC' },
  hrm: { accent: '#8B6F47', accentBg: '#FAF1E1', text: '#2C2620', muted: '#8B6F47', border: '#E8D5B7' },
  manufacturing: { accent: '#4A4E54', accentBg: '#F3F4F6', text: '#1C1C1E', muted: '#6B7280', border: '#E5E7EB' },
  setup: { accent: '#01497C', accentBg: '#E0F4F8', text: '#012A4A', muted: '#6B7280', border: '#E5E7EB' },
};
