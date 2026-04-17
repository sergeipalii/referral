import type {
  ConversionEvent,
  PaginatedResponse,
  PartnerAuthTokens,
  PartnerDashboard,
  PartnerSelf,
  Payment,
} from './types';
import { ApiError } from './api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Storage keys deliberately distinct from the owner client so that an owner
 * and a partner can be signed in simultaneously on the same device (browser
 * tabs with different roles) without stomping on each other.
 */
const PARTNER_ACCESS_KEY = 'partnerAccessToken';
const PARTNER_REFRESH_KEY = 'partnerRefreshToken';

class PartnerApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(PARTNER_ACCESS_KEY);
      this.refreshToken = localStorage.getItem(PARTNER_REFRESH_KEY);
    }
  }

  setTokens(tokens: PartnerAuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    localStorage.setItem(PARTNER_ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(PARTNER_REFRESH_KEY, tokens.refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem(PARTNER_ACCESS_KEY);
    localStorage.removeItem(PARTNER_REFRESH_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async doRefresh(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/partner-auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (!res.ok) {
      this.clearTokens();
      throw new Error('Session expired');
    }
    const tokens: PartnerAuthTokens = await res.json();
    this.setTokens(tokens);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.doRefresh().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;

      headers['Authorization'] = `Bearer ${this.accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.message || res.statusText, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ─── Auth ────────────────────────────────────────────────────────────

  login(email: string, password: string) {
    return this.request<PartnerAuthTokens>('/partner-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  acceptInvitation(token: string, password: string) {
    return this.request<PartnerAuthTokens>('/partner-auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // ─── Profile ─────────────────────────────────────────────────────────

  getSelf() {
    return this.request<PartnerSelf>('/partner-portal/self');
  }

  updateSelf(data: {
    description?: string;
    payoutDetails?: Record<string, unknown> | null;
  }) {
    return this.request<PartnerSelf>('/partner-portal/self', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getDashboard() {
    return this.request<PartnerDashboard>('/partner-portal/dashboard');
  }

  getConversions(params?: {
    page?: number;
    limit?: number;
    eventName?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.eventName) q.set('eventName', params.eventName);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.request<PaginatedResponse<ConversionEvent>>(
      `/partner-portal/conversions?${q}`,
    );
  }

  // ─── Promo codes (read-only) ─────────────────────────────────────

  getPromoCodes() {
    return this.request<
      {
        id: string;
        code: string;
        usageLimit: number | null;
        usedCount: number;
        isActive: boolean;
        createdAt: string;
      }[]
    >('/partner-portal/promo-codes');
  }

  // ─── Analytics ─────────────────────────────────────────────────────

  getAnalyticsTimeseries(params?: {
    dateFrom?: string;
    dateTo?: string;
    eventName?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.eventName) q.set('eventName', params.eventName);
    return this.request<
      { date: string; conversions: number; revenue: string; accrual: string }[]
    >(`/partner-portal/analytics/timeseries?${q}`);
  }

  getAnalyticsEventBreakdown(params?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.request<
      {
        eventName: string;
        conversions: number;
        revenue: string;
        accrual: string;
      }[]
    >(`/partner-portal/analytics/event-breakdown?${q}`);
  }

  getPayments(params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.request<PaginatedResponse<Payment>>(
      `/partner-portal/payments?${q}`,
    );
  }
}

export const partnerApi = new PartnerApiClient();
