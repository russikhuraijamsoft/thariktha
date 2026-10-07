import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/erpApi';
export function AuthScreen() {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(task: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await task(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-[#12161c] text-neutral-100 flex items-center justify-center p-5">
    <section className="w-full max-w-md bg-[#1e232a] border border-neutral-700 rounded-2xl p-8 shadow-xl">
      <ShieldCheck className="text-purple-300 mb-4" />
      <h1 className="text-2xl font-bold">Talk of the Town Cricket Closet ERP</h1>
      <p className="text-neutral-400 mt-2 mb-6">Imphal, Manipur, India · Staff sign in</p>
      <form onSubmit={e => { e.preventDefault(); void run(() => login(email, password)); }} className="space-y-4">
        <label className="block text-sm">Email<input className="erp-input" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block text-sm">Password<input className="erp-input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="erp-primary w-full" disabled={busy} type="submit">{busy ? 'Please wait…' : 'Sign in'}</button>
      </form>
      <div className="flex gap-3 mt-4 flex-wrap"><button className="erp-button" disabled={busy} onClick={() => void run(loginWithGoogle)}>Google sign in</button>
        <button className="erp-button" disabled={busy || !email} onClick={() => void run(async () => { await resetPassword(email); setMessage('Password reset requested. Check your email if the account is eligible.'); })}>Reset password</button></div>
      {error && <p role="alert" className="erp-error mt-4">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      <p className="text-xs text-neutral-400 mt-6">An active, preprovisioned ERP profile is required. Account registration and role assignment are performed by a trusted operator. No offline business writes are available.</p>
    </section>
  </main>;
}
