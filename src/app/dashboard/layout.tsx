import type { ReactNode } from 'react';
import { SandboxIndicator } from '@/components/platform/EnvironmentSwitcher';

export default function DashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SandboxIndicator />
    </>
  );
}
