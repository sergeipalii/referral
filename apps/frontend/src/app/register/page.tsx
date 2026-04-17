'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

export default function RegisterPage() {
  // useSearchParams needs Suspense in App Router.
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { user, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Already logged in → go straight to dashboard.
  useEffect(() => {
    if (user) router.replace('/partners');
  }, [user, router]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If the landing page sent the user here with ?plan=pro or ?plan=business,
  // after registration we redirect to /billing?upgrade=<plan> which will
  // auto-start the Stripe Checkout flow. For plain registration (no plan
  // param) we go straight to the dashboard.
  const targetPlan = searchParams.get('plan');
  const postRegisterUrl =
    targetPlan === 'pro' || targetPlan === 'business'
      ? `/billing?upgrade=${targetPlan}`
      : '/partners';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name || undefined);
      router.push(postRegisterUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="block text-center text-lg font-bold text-indigo-600 mb-6"
        >
          Referral System
        </Link>
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Create account
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            Sign in
          </Link>
        </p>
        {targetPlan && (
          <p className="mt-3 text-center text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
            After registration you&apos;ll be redirected to start your{' '}
            <strong>{targetPlan === 'pro' ? 'Pro' : 'Business'}</strong> free
            trial.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}
