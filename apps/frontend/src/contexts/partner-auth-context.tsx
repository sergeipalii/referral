'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { partnerApi } from '@/lib/partner-api';
import type { PartnerSelf } from '@/lib/types';

interface PartnerAuthContextValue {
  partner: PartnerSelf | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const PartnerAuthContext = createContext<PartnerAuthContextValue | null>(null);

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [partner, setPartner] = useState<PartnerSelf | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSelf = useCallback(async () => {
    if (!partnerApi.isAuthenticated()) {
      setLoading(false);
      return;
    }
    try {
      const me = await partnerApi.getSelf();
      setPartner(me);
    } catch {
      partnerApi.clearTokens();
      setPartner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelf();
  }, [fetchSelf]);

  const login = async (email: string, password: string) => {
    const tokens = await partnerApi.login(email, password);
    partnerApi.setTokens(tokens);
    const me = await partnerApi.getSelf();
    setPartner(me);
  };

  const acceptInvitation = async (token: string, password: string) => {
    const tokens = await partnerApi.acceptInvitation(token, password);
    partnerApi.setTokens(tokens);
    const me = await partnerApi.getSelf();
    setPartner(me);
  };

  const logout = () => {
    partnerApi.clearTokens();
    setPartner(null);
  };

  return (
    <PartnerAuthContext.Provider
      value={{
        partner,
        loading,
        login,
        acceptInvitation,
        logout,
        refresh: fetchSelf,
      }}
    >
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) {
    throw new Error(
      'usePartnerAuth must be used within PartnerAuthProvider',
    );
  }
  return ctx;
}
