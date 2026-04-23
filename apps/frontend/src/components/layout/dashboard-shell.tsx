'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { PastDueBanner } from '@/components/billing/past-due-banner';
import { PlanCapBanner } from '@/components/billing/plan-cap-banner';

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Close the drawer whenever navigation completes on mobile so the new page
  // is visible without an extra tap on the backdrop.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-56">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <PastDueBanner />
        <PlanCapBanner />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
