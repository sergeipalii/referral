export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Partner {
  id: string;
  userId: string;
  code: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccrualRule {
  id: string;
  userId: string;
  partnerId: string | null;
  eventName: string;
  ruleType: 'fixed' | 'percentage';
  amount: string;
  revenueProperty: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionEvent {
  id: string;
  userId: string;
  partnerId: string;
  eventName: string;
  eventDate: string;
  count: number;
  revenueSum: string;
  accrualAmount: string;
  accrualRuleId: string | null;
  syncJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  partnerId: string;
  amount: string;
  status: 'pending' | 'completed' | 'cancelled';
  reference: string | null;
  notes: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerBalance {
  partnerId: string;
  partnerName: string;
  partnerCode: string;
  totalAccrued: string;
  totalPaid: string;
  balance: string;
  pendingPayments: string;
}

export interface PartnerSummary {
  partnerId: string;
  partnerName: string;
  partnerCode: string;
  totalConversions: number;
  totalAccrualAmount: string;
  totalPaid: string;
  balance: string;
}

export interface AnalyticsIntegration {
  id: string;
  userId: string;
  providerType: string;
  utmParameterName: string;
  lastSyncedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  userId: string;
  integrationId: string;
  status: 'running' | 'completed' | 'failed';
  rangeStart: string;
  rangeEnd: string;
  rawEventsCount: number;
  conversionsCount: number;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreated {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
