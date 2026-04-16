'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePartnerAuth } from '@/contexts/partner-auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

/**
 * Wrapped in Suspense because useSearchParams is only allowed inside a
 * Suspense boundary in Next.js App Router.
 */
export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const { acceptInvitation } = usePartnerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get('token') ?? '';

  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(urlToken);
  }, [urlToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await acceptInvitation(token, password);
      router.push('/partner');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not accept invitation',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Partner portal
          </span>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Set your password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;ll use this password together with the email your program
            owner invited.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!urlToken && (
            <Input
              label="Invitation token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from your invitation"
            />
          )}
          <Input
            label="New password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm password"
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Set password &amp; sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
