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
  email: string | null;
  hasPassword: boolean;
  invitationExpiresAt: string | null;
  lastLoginAt: string | null;
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
  signingSecret: string;
  webhookToken: string;
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

// ─── Partner portal ─────────────────────────────────────────────────────

export interface PartnerAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PartnerSelf {
  id: string;
  name: string;
  code: string;
  description: string | null;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface PartnerDashboard {
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  totalConversions: number;
  totalAccrued: string;
  totalPaid: string;
  pendingPayments: string;
  balance: string;
  lastConversionDate: string | null;
}

/** Response from POST /partner-auth/invitations — shown to the owner once. */
export interface PartnerInvitationCreated {
  token: string;
  expiresAt: string;
  partnerId: string;
  email: string;
}
