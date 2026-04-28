import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/auth-context';
import { UpgradeModalHost } from '@/components/billing/upgrade-modal';
import { SandboxBanner } from '@/components/sandbox-banner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Referral System',
  description:
    'Manage referral partners, track conversions, and automate payouts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SandboxBanner />
        <AuthProvider>
          {children}
          {/* Mounted once at the root so any 402 Payment Required response
              from ApiClient pops a plan-aware upgrade modal regardless of
              which feature the owner just tried to use. */}
          <UpgradeModalHost />
        </AuthProvider>
      </body>
    </html>
  );
}
