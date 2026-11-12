'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('Invalid credentials');
      setLoading(false);
    } else {
      // Return to the app the user picked (only same-site paths), else the All Apps dashboard.
      const target = new URLSearchParams(window.location.search).get('callbackUrl') || '';
      const safe = target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\') ? target : '/dashboard';
      // Full navigation so every component re-reads the new session.
      window.location.assign(safe);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        {/* Multi-color gradient blobs */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-[#0077B6]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-[#2D6A4F]/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-[#B14411]/15 rounded-full blur-[100px]" />

        <div className="absolute top-10 left-10 right-10 z-10">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center font-bold text-xl">V</div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Vinnora</div>
              <div className="text-2xl font-semibold">Business Ally</div>
            </div>
          </Link>
        </div>
        <div className="absolute bottom-10 left-10 right-10 z-10 text-white">
          <h2 className="text-3xl font-light leading-tight">
            Run your business
            <br />
            <span className="font-semibold">with confidence.</span>
          </h2>
          <p className="mt-3 text-sm text-white/70 max-w-md">
            Six integrated apps for sales, accounting, inventory, marketing, HR and
            manufacturing — one platform, one login.
          </p>
          <div className="mt-6 flex gap-3">
            {['Sell & Support', 'Accounting', 'Inventory', 'Marketing', 'HRM', 'Manufacturing'].map((app) => (
              <span key={app} className="text-[10px] text-white/50 bg-white/10 px-2 py-1 rounded">{app}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-6">
            <Link href="/" className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center text-white font-bold text-xl">V</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-1">Sign in to your Vinnora account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold bg-gray-900 hover:bg-gray-800 transition shadow-sm disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              New to Vinnora?{' '}
              <Link href="/auth/signup" className="text-gray-900 font-medium hover:underline">
                Create an account
              </Link>
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Start with one app free. No credit card needed.
          </p>
        </div>
      </div>
    </div>
  );
}
