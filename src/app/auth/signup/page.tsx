'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, company }),
      });

      if (res.ok) {
        router.push('/auth/signin?message=Account created successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Sign-up failed');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#5A7A8C]/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#8B6F47]/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-[#4A4E54]/20 rounded-full blur-[100px]" />

        <div className="absolute top-10 left-10 right-10 z-10">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center font-bold text-xl">V</div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/60">Vinnora</div>
              <div className="text-2xl font-semibold">Business Ally</div>
            </div>
          </Link>
        </div>
        <div className="absolute bottom-12 left-10 right-10 z-10 text-white">
          <h2 className="text-3xl font-light leading-tight">
            Join your team.
            <br />
            <span className="font-semibold">Move forward together.</span>
          </h2>
          <p className="mt-3 text-sm text-white/70 max-w-md">
            From the first enquiry to the last invoice — Vinnora keeps every team aligned in one
            connected workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Free plan available', 'No credit card', 'Setup in 1 min'].map((tag) => (
              <span key={tag} className="text-[10px] text-white/50 bg-white/10 px-2 py-1 rounded">{tag}</span>
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
              <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
              <p className="text-sm text-gray-500 mt-1">Get started with Vinnora in under a minute.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-400">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-400">*</span></label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold bg-gray-900 hover:bg-gray-800 transition shadow-sm disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-gray-900 font-medium hover:underline">Sign in</Link>
            </p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Start with one app free. Upgrade anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900';
