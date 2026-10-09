import React, { useState } from 'react';
import type { UserProfile } from '../types/auth';
import { errorMessage } from '../services/erpApi';

export interface SessionBoundaryProps {
  user: { uid: string; email?: string | null; displayName?: string | null; providerData?: ReadonlyArray<{ providerId: string }> } | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionError: string;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  signIn: React.ReactNode;
  children: React.ReactNode;
}
// A Firebase sign-in is distinct from an authorized ERP session. Never send a
// signed-in, unprovisioned user back through another Google popup without context.
export function SessionBoundary({ user, profile, loading, sessionError, refreshSession, logout, signIn, children }: SessionBoundaryProps) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  async function run(task: () => Promise<void>) {
    setBusy(true); setActionError('');
    try { await task(); } catch (error) { setActionError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="min-h-screen bg-[#171b22] text-white grid place-items-center" role="status">Loading authenticated ERP session…</div>;
  if (!user) return <>{signIn}</>;
  if (!profile || sessionError) return <main className="min-h-screen bg-[#171b22] text-neutral-100 grid place-items-center p-5">
    <section className="erp-panel w-full max-w-xl space-y-4" aria-labelledby="session-heading">
      <h1 id="session-heading" className="text-2xl font-bold">ERP access unavailable</h1>
      <p>Firebase sign-in succeeded for {user.email || user.uid}, but an authorized ERP session is not available.</p>
      <dl className="text-sm text-neutral-300 space-y-1">
        {user.displayName && <div><dt className="inline">Account name: </dt><dd className="inline">{user.displayName}</dd></div>}
        <div><dt className="inline">Firebase UID: </dt><dd className="inline break-all">{user.uid}</dd></div>
        <div><dt className="inline">Linked sign-in providers: </dt><dd className="inline">{user.providerData?.length ? user.providerData.map(provider => provider.providerId === 'google.com' ? 'Google' : provider.providerId === 'password' ? 'Email/password' : provider.providerId).join(', ') : 'Not available'}</dd></div>
      </dl>
      <p role="alert" className="erp-error">{sessionError || 'An active ERP profile with a company, branch and role is required.'}</p>
      <p className="text-sm text-neutral-400">Retry after the connection or access issue is resolved. Signing in again will not create an employee profile or grant permissions.</p>
      <p className="text-sm text-neutral-400">If this is the wrong account, use Sign out / switch account below. On the sign-in screen, use the email/password form for an email/password account or choose your Google account in the popup. The email field does not select the Google identity.</p>
      <div className="flex flex-wrap gap-3">
        <button className="erp-primary" disabled={busy} onClick={() => void run(refreshSession)}>Retry ERP session</button>
        <button className="erp-button" disabled={busy} onClick={() => void run(logout)}>Sign out / switch account</button>
      </div>
      {actionError && <p role="alert" className="erp-error">{actionError}</p>}
    </section>
  </main>;
  return <>{children}</>;
}
