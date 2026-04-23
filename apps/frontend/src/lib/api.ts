import type {
  AuthTokens,
  User,
  Partner,
  AccrualRule,
  ConversionEvent,
  Payment,
  PartnerBalance,
  PartnerSummary,
  ApiKey,
  ApiKeyCreated,
  PaginatedResponse,
  PartnerInvitationCreated,
  SubscriptionView,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async doRefresh(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
    if (!res.ok) {
      this.clearTokens();
      throw new Error('Session expired');
    }
    const tokens: AuthTokens = await res.json();
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
      // Broadcast plan-limit errors (402) so the global UpgradeModalHost can
      // pop the plan-aware CTA. Each call site doesn't need to wire it up.
      // Error is still thrown so local catches can short-circuit their own
      // recovery if they want.
      if (res.status === 402 && typeof body === 'object' && body !== null) {
        const planBody = body as { error?: string };
        if (planBody.error === 'plan_limit') {
          // Lazy import keeps ApiClient standalone (no React at module load).
          import('@/components/billing/upgrade-modal')
            .then(({ emitPlanLimit }) =>
              emitPlanLimit(body as Parameters<typeof emitPlanLimit>[0]),
            )
            .catch(() => {
              /* best-effort — fall through to thrown error below */
            });
        }
      }
      throw new ApiError(res.status, body.message || res.statusText, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private get<T>(path: string) {
    return this.request<T>(path);
  }

  private post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private patch<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  private put<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  private delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Auth
  register(email: string, password: string, name?: string) {
    return this.post<AuthTokens>('/auth/register', { email, password, name });
  }

  login(email: string, password: string) {
    return this.post<AuthTokens>('/auth/login', { email, password });
  }

  // User
  getSelf() {
    return this.get<User>('/users/self');
  }

  // Partners
  getPartners(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.isActive !== undefined)
      q.set('isActive', String(params.isActive));
    return this.get<PaginatedResponse<Partner>>(`/partners?${q}`);
  }

  getPartner(id: string) {
    return this.get<Partner>(`/partners/${id}`);
  }

  createPartner(data: { name: string; description?: string }) {
    return this.post<Partner>('/partners', data);
  }

  updatePartner(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>,
  ) {
    return this.patch<Partner>(`/partners/${id}`, data);
  }

  deletePartner(id: string) {
    return this.delete(`/partners/${id}`);
  }

  // Partner invitations (owner side)
  createPartnerInvitation(partnerId: string, email: string) {
    return this.post<PartnerInvitationCreated>('/partner-auth/invitations', {
      partnerId,
      email,
    });
  }

  revokePartnerInvitation(partnerId: string) {
    return this.delete(`/partner-auth/invitations/${partnerId}`);
  }

  // Accrual Rules
  getRules(params?: {
    page?: number;
    limit?: number;
    partnerId?: string;
    eventName?: string;
    isActive?: boolean;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.partnerId) q.set('partnerId', params.partnerId);
    if (params?.eventName) q.set('eventName', params.eventName);
    if (params?.isActive !== undefined)
      q.set('isActive', String(params.isActive));
    return this.get<PaginatedResponse<AccrualRule>>(`/accrual-rules?${q}`);
  }

  createRule(data: {
    partnerId?: string;
    eventName: string;
    ruleType:
      | 'fixed'
      | 'percentage'
      | 'recurring_fixed'
      | 'recurring_percentage';
    amount: string;
    revenueProperty?: string;
    recurrenceDurationMonths?: number | null;
  }) {
    return this.post<AccrualRule>('/accrual-rules', data);
  }

  updateRule(
    id: string,
    data: Partial<{
      eventName: string;
      ruleType: string;
      amount: string;
      revenueProperty: string;
      recurrenceDurationMonths: number | null;
      isActive: boolean;
    }>,
  ) {
    return this.patch<AccrualRule>(`/accrual-rules/${id}`, data);
  }

  deleteRule(id: string) {
    return this.delete(`/accrual-rules/${id}`);
  }

  // Conversions
  getConversions(params?: {
    page?: number;
    limit?: number;
    partnerId?: string;
    eventName?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.partnerId) q.set('partnerId', params.partnerId);
    if (params?.eventName) q.set('eventName', params.eventName);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.get<PaginatedResponse<ConversionEvent>>(`/conversions?${q}`);
  }

  getConversionSummary(params?: { dateFrom?: string; dateTo?: string }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.get<PartnerSummary[]>(`/conversions/summary?${q}`);
  }

  // Payments
  getPayments(params?: {
    page?: number;
    limit?: number;
    partnerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.partnerId) q.set('partnerId', params.partnerId);
    if (params?.status) q.set('status', params.status);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.get<PaginatedResponse<Payment>>(`/payments?${q}`);
  }

  getPartnerBalance(partnerId: string) {
    return this.get<PartnerBalance>(`/payments/balance/${partnerId}`);
  }

  createPayment(data: {
    partnerId: string;
    amount: string;
    status?: string;
    reference?: string;
    notes?: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    return this.post<Payment>('/payments', data);
  }

  createBatchPayments(data: {
    periodStart: string;
    periodEnd: string;
    partnerIds?: string[];
    minAmount?: number;
    reference?: string;
  }) {
    return this.post<import('./types').BatchPaymentsResult>(
      '/payments/batch',
      data,
    );
  }

  /**
   * Download payments CSV using the same filters as the list view. Returns
   * the raw text — the caller decides how to save it (e.g. via saveAs).
   */
  async exportPaymentsCsv(params?: {
    partnerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<string> {
    const q = new URLSearchParams();
    if (params?.partnerId) q.set('partnerId', params.partnerId);
    if (params?.status) q.set('status', params.status);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);

    // Custom path because the shared `request<T>` assumes JSON. The tracking
    // / auth flow is identical (Bearer + refresh-on-401); we just need text
    // out instead of JSON.
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    let res = await fetch(`${API_BASE}/payments/export?${q}`, { headers });
    if (res.status === 401 && this.refreshToken) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.doRefresh().finally(() => {
          this.refreshPromise = null;
        });
      }
      await this.refreshPromise;
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      res = await fetch(`${API_BASE}/payments/export?${q}`, { headers });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        body.message || res.statusText,
        body,
      );
    }
    return res.text();
  }

  updatePayment(
    id: string,
    data: Partial<{
      amount: string;
      status: string;
      reference: string;
      notes: string;
    }>,
  ) {
    return this.patch<Payment>(`/payments/${id}`, data);
  }

  deletePayment(id: string) {
    return this.delete(`/payments/${id}`);
  }

  // API Keys
  getApiKeys() {
    return this.get<ApiKey[]>('/auth/api-keys');
  }

  createApiKey(name: string) {
    return this.post<ApiKeyCreated>('/auth/api-keys', { name });
  }

  deleteApiKey(id: string) {
    return this.delete(`/auth/api-keys/${id}`);
  }

  // Promo codes
  createPromoCode(data: {
    partnerId: string;
    code: string;
    usageLimit?: number | null;
  }) {
    return this.post<{
      id: string;
      partnerId: string;
      code: string;
      usageLimit: number | null;
      usedCount: number;
      isActive: boolean;
      createdAt: string;
    }>('/promo-codes', data);
  }

  getPromoCodes(partnerId?: string) {
    const q = new URLSearchParams();
    if (partnerId) q.set('partnerId', partnerId);
    return this.get<
      {
        id: string;
        partnerId: string;
        code: string;
        usageLimit: number | null;
        usedCount: number;
        isActive: boolean;
        createdAt: string;
      }[]
    >(`/promo-codes?${q}`);
  }

  deletePromoCode(id: string) {
    return this.delete(`/promo-codes/${id}`);
  }

  // Analytics
  getAnalyticsKpis(params?: { dateFrom?: string; dateTo?: string }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.get<{
      totalConversions: number;
      totalRevenue: string;
      totalAccrual: string;
      totalPaid: string;
      prev: {
        totalConversions: number;
        totalRevenue: string;
        totalAccrual: string;
        totalPaid: string;
      };
    }>(`/analytics/kpis?${q}`);
  }

  getAnalyticsTimeseries(params?: {
    dateFrom?: string;
    dateTo?: string;
    partnerId?: string;
    eventName?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.partnerId) q.set('partnerId', params.partnerId);
    if (params?.eventName) q.set('eventName', params.eventName);
    return this.get<
      { date: string; conversions: number; revenue: string; accrual: string }[]
    >(`/analytics/timeseries?${q}`);
  }

  getAnalyticsTopPartners(params?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.limit) q.set('limit', String(params.limit));
    return this.get<
      {
        partnerId: string;
        partnerName: string;
        partnerCode: string;
        conversions: number;
        revenue: string;
        accrual: string;
      }[]
    >(`/analytics/top-partners?${q}`);
  }

  getAnalyticsEventBreakdown(params?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    const q = new URLSearchParams();
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    return this.get<
      {
        eventName: string;
        conversions: number;
        revenue: string;
        accrual: string;
      }[]
    >(`/analytics/event-breakdown?${q}`);
  }

  // Billing
  getSubscription() {
    return this.get<SubscriptionView>('/billing/subscription');
  }

  createCheckout(planKey: 'starter' | 'pro' | 'business') {
    return this.post<{ url: string }>('/billing/checkout', { planKey });
  }

  createPortal() {
    return this.post<{ url: string }>('/billing/portal');
  }

  getInvoices() {
    return this.get<InvoiceView[]>('/billing/invoices');
  }
}

export interface InvoiceView {
  id: string;
  stripeInvoiceId: string;
  amountDue: string;
  amountPaid: string;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export const api = new ApiClient();
