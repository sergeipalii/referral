'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePartnerAuth } from '@/contexts/partner-auth-context';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/partner', label: 'Dashboard', icon: 'D', exact: true },
  { href: '/partner/analytics', label: 'Analytics', icon: 'A' },
  { href: '/partner/conversions', label: 'Conversions', icon: 'C' },
  { href: '/partner/payments', label: 'Payments', icon: '$' },
  { href: '/partner/settings', label: 'Settings', icon: 'S' },
];

/**
 * Layout + auth gate for authenticated partner pages. Redirects to
 * /partner/login when unauthenticated and shows a spinner during the initial
 * auth probe. Renders a minimal left nav over the shared content area — same
 * pattern as the owner's DashboardShell but scoped to the partner.
 */
export function PartnerShell({ children }: { children: ReactNode }) {
  const { partner, loading, logout } = usePartnerAuth();
  const router = useRouter();
  const pathname = usePathname();

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
      <aside className="fixed inset-y-0 left-0 z-30 w-56 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <Link href="/partner" className="text-lg font-bold text-indigo-600">
            Partner Portal
          </Link>
          <div className="mt-1 text-xs text-gray-500 truncate">
            {partner.name}
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3 space-y-1">
          <div className="px-2 text-xs text-gray-500 truncate" title={partner.email}>
            {partner.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <div className="pl-56">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
