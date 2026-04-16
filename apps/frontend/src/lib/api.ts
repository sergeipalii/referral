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
