import type { ReactNode } from 'react';
import { PartnerAuthProvider } from '@/contexts/partner-auth-context';

export default function PartnerRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Partner-scoped pages run under their own auth context so the partner and
  // an owner can be signed in side by side in different tabs without colliding
  // on localStorage or the /users/self request at boot.
  return <PartnerAuthProvider>{children}</PartnerAuthProvider>;
}
