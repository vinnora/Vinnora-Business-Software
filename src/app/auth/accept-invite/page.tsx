'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs-signup'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No invitation token provided.');
      return;
    }

    fetch('/api/org/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage('You have successfully joined the organization!');
        } else if (data.needsSignup) {
          setStatus('needs-signup');
          setEmail(data.email || '');
          setMessage('Please create an account with your invited email address.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to accept invitation.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0077B6] via-[#2D6A4F] to-[#B14411] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">V</div>

        {status === 'loading' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Accepting invitation...</h1>
            <p className="text-sm text-gray-500 mt-2">Please wait.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Welcome aboard!</h1>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
            <Link href="/dashboard" className="inline-block mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'needs-signup' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
            <p className="text-sm text-gray-500 mt-2">{message}</p>
            <Link
              href={`/auth/signup?inviteToken=${token}&email=${encodeURIComponent(email)}`}
              className="inline-block mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition"
            >
              Sign Up
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-gray-900">Invitation Error</h1>
            <p className="text-sm text-red-500 mt-2">{message}</p>
            <Link href="/auth/signin" className="inline-block mt-6 px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Go to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
