'use client';

import { signOut, useSession } from 'next-auth/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Badge, Btn, ErrorBanner, FormField, Input, Loading, ThemeScope, api, useLoad } from '@/components/platform/ui';
import { MODULE_THEMES } from '@/components/platform/themes';
import { initials } from './UserAvatar';

type Me = {
  id: string;
  name: string;
  email: string;
  orgRole: string;
  workspace: string;
  profileName: string;
  apps: string[];
  memberSince: string | null;
  editable: boolean;
};

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager', member: 'Member', viewer: 'Viewer' };

export function ProfileSettings() {
  const me = useLoad(() => api<Me>('/api/me'), []);
  const { update } = useSession();

  return (
    <ThemeScope theme={MODULE_THEMES.setup}>
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-[var(--p-text)]">Profile &amp; personal settings</h2>
        <p className="text-sm text-[var(--p-muted)] mb-4">Your own account details. Workspace-wide settings are under Settings.</p>
        <ErrorBanner error={me.error} />
        {me.loading && !me.data ? (
          <Loading />
        ) : me.data ? (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0096C7] to-[#012A4A] text-white text-xl font-semibold flex items-center justify-center">
                  {initials(me.data)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-[var(--p-text)] truncate">{me.data.name || me.data.email}</div>
                  <div className="text-sm text-[var(--p-muted)] truncate">{me.data.email}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge tone="blue">{ROLE_LABELS[me.data.orgRole] || me.data.orgRole}</Badge>
                    {me.data.profileName && <Badge>{me.data.profileName}</Badge>}
                  </div>
                </div>
              </div>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
                <Info label="Workspace">{me.data.workspace || '—'}</Info>
                <Info label="Member since">
                  {me.data.memberSince ? new Date(me.data.memberSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </Info>
                <Info label="Apps you can use" className="sm:col-span-2">
                  {me.data.apps.length ? me.data.apps.join(', ') : '—'}
                </Info>
              </dl>
            </Card>

            <NameCard
              me={me.data}
              onSaved={async (name) => {
                me.setData({ ...me.data!, name });
                window.dispatchEvent(new CustomEvent('vinnora:profile', { detail: { name } }));
                await update({ name }).catch(() => {});
              }}
            />
            <PasswordCard disabled={!me.data.editable} />

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[var(--p-text)]">Sign out</h3>
                  <p className="text-sm text-[var(--p-muted)]">End your session on this device.</p>
                </div>
                <Btn variant="danger" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                  Sign out
                </Btn>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </ThemeScope>
  );
}

function NameCard({ me, onSaved }: { me: Me; onSaved: (name: string) => Promise<void> }) {
  const [name, setName] = useState(me.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dirty = name.trim() !== me.name && name.trim().length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      const r = await api<{ name: string }>('/api/me', { method: 'PATCH', body: { name } });
      await onSaved(r.name);
      setName(r.name);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h3 className="font-semibold text-[var(--p-text)] mb-3">Personal information</h3>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="grid sm:grid-cols-2 gap-x-4">
          <FormField label="Full name" required>
            <Input value={name} maxLength={80} disabled={!me.editable} onChange={(e) => (setName(e.target.value), setDone(false))} />
          </FormField>
          <FormField label="Email" help="Your sign-in email. Ask a workspace admin if it needs to change.">
            <Input value={me.email} disabled />
          </FormField>
        </div>
        <div className="flex items-center gap-3">
          <Btn variant="primary" type="submit" disabled={!dirty || saving || !me.editable}>
            {saving ? 'Saving…' : 'Save changes'}
          </Btn>
          {done && <span className="text-sm text-green-700">Saved.</span>}
        </div>
      </form>
    </Card>
  );
}

function PasswordCard({ disabled }: { disabled: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return;
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      await api('/api/me/password', { body: { currentPassword: current, newPassword: next } });
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h3 className="font-semibold text-[var(--p-text)] mb-3">Password</h3>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="grid sm:grid-cols-3 gap-x-4">
          <FormField label="Current password" required>
            <Input type="password" autoComplete="current-password" value={current} disabled={disabled} onChange={(e) => setCurrent(e.target.value)} />
          </FormField>
          <FormField label="New password" required help="At least 8 characters.">
            <Input type="password" autoComplete="new-password" value={next} disabled={disabled} onChange={(e) => setNext(e.target.value)} />
          </FormField>
          <FormField label="Confirm new password" required error={mismatch ? "Passwords don't match." : undefined}>
            <Input type="password" autoComplete="new-password" value={confirm} disabled={disabled} onChange={(e) => setConfirm(e.target.value)} />
          </FormField>
        </div>
        <div className="flex items-center gap-3">
          <Btn variant="primary" type="submit" disabled={disabled || saving || !current || next.length < 8 || next !== confirm}>
            {saving ? 'Updating…' : 'Update password'}
          </Btn>
          {done && <span className="text-sm text-green-700">Password updated.</span>}
        </div>
      </form>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="bg-white border border-[var(--p-border)] rounded-lg p-5">{children}</section>;
}

function Info({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wide text-[var(--p-muted)]">{label}</dt>
      <dd className="text-[var(--p-text)] mt-0.5">{children}</dd>
    </div>
  );
}
