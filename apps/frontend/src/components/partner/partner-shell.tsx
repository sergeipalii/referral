'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePartnerAuth } from '@/contexts/partner-auth-context';
import { Button } from '@/components/ui/button';

/**
 * Layout + auth gate for authenticated partner pages. Redirects to
 * /partner/login when unauthenticated and shows a spinner during the initial
 * auth probe.
 */
export function PartnerShell({ children }: { children: ReactNode }) {
  const { partner, loading, logout } = usePartnerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !partner) {
      router.push('/partner/login');
    }
  }, [partner, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!partner) return null;

  const handleLogout = () => {
    logout();
    router.push('/partner/login');
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Partner portal
            </span>
            <span className="text-sm text-gray-900 font-medium">
              {partner.name}
            </span>
            <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {partner.code}
            </code>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 hidden sm:inline">
              {partner.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
