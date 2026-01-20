/**
 * Standardized API response types following the LinkToMe API Response Format
 * See: API_RESPONSE_FORMAT.md in linktome-api repository
 */

import { UserTier } from './tiers';

/**
 * Standard error response format
 * HTTP Status: 4xx or 5xx
 */
export interface ApiError {
  error: string;
}

/**
 * User authentication data returned in login/signup/refresh responses
 */
export interface UserAuth {
  UserId: string;
  email: string;
  username: string;
  userRole: string;
  roles: string[];
  permissions: string[];
  userManagements: UserManagement[];
  subAccounts?: SubAccount[]; // Array of sub-accounts for agency admin users
  tier?: UserTier; // User's subscription tier
  twoFactorEnabled?: boolean; // Whether user has 2FA enabled
  twoFactorEmailEnabled?: boolean; // Whether email 2FA is enabled
  twoFactorTotpEnabled?: boolean; // Whether TOTP 2FA is enabled
  // Sub-account fields (optional, for display purposes)
  IsSubAccount?: boolean; // Whether this is a sub-account
  AuthDisabled?: boolean; // Whether authentication is disabled
}

/**
 * User management relationship
 */
export interface UserManagement {
  UserId: string;
  DisplayName: string;
  Email: string;
  role: string;
  state: string;
  direction: 'manager' | 'managed';
  permissions: string[];
  tier?: UserTier; // Managed user's subscription tier
  created?: string;
  updated?: string;
}

/**
 * Login/Signup response
 * HTTP Status: 200 (success) or 400/401 (error)
 */
export interface LoginResponse {
  user?: UserAuth;
  requires2FA?: boolean;
  requiresTwoFactor?: boolean; // Backend uses this field name
  twoFactorMethod?: 'email' | 'totp' | 'both';
  availableMethods?: ('email' | 'totp')[]; // Array of available 2FA methods when user has multiple enabled
  sessionId?: string;
}

/**
 * 2FA verification request
 */
export interface TwoFactorVerifyRequest {
  sessionId: string;
  token: string; // 6-digit code (email/TOTP) or backup code
  method: 'email' | 'totp' | 'backup'; // Type of verification
}

/**
 * 2FA setup response for TOTP
 */
export interface TotpSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes?: string[];
}

/**
 * User profile data
 */
export interface UserProfile {
  UserId: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
}

/**
 * Link data
 */
export interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
  active: boolean;
  icon?: string;
}

/**
 * Links list response
 */
export interface LinksResponse {
  links: Link[];
}

/**
 * Generic list response wrapper
 */
export interface ListResponse<T> {
  items?: T[];
  [key: string]: any;
}

/**
 * API Key data
 */
export interface ApiKey {
  keyId: string;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  lastUsedIP: string | null;
}

/**
 * API Keys list response
 */
export interface ApiKeysResponse {
  keys: ApiKey[];
  availablePermissions: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  usage: {
    dailyUsed: number;
    dailyRemaining: number;
    perKey: Record<string, { minuteUsed: number; minuteRemaining: number }>;
  };
}

/**
 * User Pack Purchase request
 */
export interface PurchaseUserPackRequest {
  packType: 'starter' | 'business' | 'enterprise' | 'none';
  billingCycle: 'monthly' | 'annual';
  customLimit?: number; // Optional: Only for enterprise pack
}

/**
 * User Pack Purchase response
 */
export interface PurchaseUserPackResponse {
  userId: string;
  packType: string;
  packLimit: number;
  role: string;
  expiresAt: string | null;
  message: string;
}

/**
 * Sub-Account data
 */
export interface SubAccount {
  userId: string;
  username: string;
  displayName?: string;
  role?: string; // Sub-account role (e.g., 'sub_account_user')
  permissions?: string[]; // Sub-account permissions array
  type?: string; // e.g., 'client', 'brand', 'other'
  status: string; // 'active', 'suspended', 'deleted'
  createdAt?: string;
  pagesCount?: number;
  linksCount?: number;
}

/**
 * Sub-Accounts list response
 */
export interface SubAccountsResponse {
  subAccounts: SubAccount[];
  total: number;
  limits?: {
    maxSubAccounts: number;
    usedSubAccounts: number;
    remainingSubAccounts: number;
    userPackType?: string | null;
    userPackExpired?: boolean;
  };
}

/**
 * Create Sub-Account request
 */
export interface CreateSubAccountRequest {
  username: string;
  displayName?: string;
  type?: string; // 'client' | 'brand' | 'other'
}

/**
 * Create Sub-Account response
 */
export interface CreateSubAccountResponse {
  message: string;
  subAccount: SubAccount;
}


/**
 * Create API key response
 */
export interface CreateKeyResponse {
  message: string;
  key: {
    keyId: string;
    key: string;
    name: string;
    permissions: string[];
  };
}

/**
 * Analytics Types
 */
export interface ClicksByDay {
  date: string;
  count: number;
}

export interface ViewsByDay {
  date: string;
  count: number;
}

export interface RecentPageView {
  ipAddress: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
  pageId?: string; // Page association for multi-page tracking
}

export interface RecentLinkClick {
  linkTitle: string;
  userAgent: string;
  timestamp: string;
  linkUrl: string;
  referrer: string;
  ipAddress: string;
  linkId: string;
  pageId?: string; // Page association for multi-page tracking
}

export interface LinkClicksByLink {
  linkId: string;
  clickCount: number;
  linkTitle: string;
  linkUrl: string;
  pageId?: string; // Page association for multi-page tracking
}

export interface AnalyticsSummary {
  totalLinkClicks: number;
  uniqueVisitors: number;
  totalPageViews: number;
}

/**
 * Per-page analytics summary for multi-page breakdown
 */
export interface PageAnalyticsSummary {
  pageId: string;
  pageName: string;
  pageSlug: string;
  totalPageViews: number;
  totalLinkClicks: number;
}

export interface AnalyticsData {
  clicksByDay: ClicksByDay[];
  recentPageViews: RecentPageView[];
  linkClicksByLink: LinkClicksByLink[];
  summary: AnalyticsSummary;
  viewsByDay: ViewsByDay[];
  recentLinkClicks: RecentLinkClick[];
  pageBreakdown?: PageAnalyticsSummary[]; // Per-page statistics for multi-page users
}

/**
 * Analytics API response
 */
export type AnalyticsResponse = AnalyticsData;

/**
 * Short Link data
 */
export interface ShortLink {
  slug: string;
  targetUrl: string;
  title: string;
  active: boolean;
  clicks: number;
  createdAt: string;
  lastClickedAt: string | null;
}

/**
 * Short Links list response
 */
export interface ShortLinksResponse {
  shortLinks: ShortLink[];
  total: number;
}

/**
 * Short Link operation types
 */
export type ShortLinkOperation = 'add' | 'update' | 'remove';

/**
 * Short Link update request item
 */
export interface ShortLinkUpdateItem {
  operation: ShortLinkOperation;
  slug?: string; // Required for update/remove, not used for add
  targetUrl?: string;
  title?: string;
  active?: boolean;
}

/**
 * Update Short Links request
 */
export interface UpdateShortLinksRequest {
  shortLinks: ShortLinkUpdateItem[];
}

/**
 * Update Short Links response
 */
export interface UpdateShortLinksResponse {
  success: boolean;
  created: Array<{
    slug: string;
    targetUrl: string;
    title: string;
  }>;
}

/**
 * Short Link redirect response
 */
export interface ShortLinkRedirectResponse {
  redirectTo: string;
}

/**
 * Short Link Analytics Summary
 */
export interface ShortLinkAnalyticsSummary {
  totalRedirects: number;
  uniqueVisitors: number;
}

/**
 * Top Short Link data
 */
export interface TopShortLink {
  slug: string;
  targetUrl: string;
  clicks: number;
}

/**
 * Redirects by day data
 */
export interface RedirectsByDay {
  date: string;
  clicks: number;
}

/**
 * Top referrer data
 */
export interface TopReferrer {
  referrer: string;
  count: number;
}

/**
 * Recent redirect data
 */
export interface RecentRedirect {
  timestamp: string;
  slug: string;
  targetUrl: string;
  ipAddress: string;
  userAgent: string;
  referrer: string;
}

/**
 * Short Link Analytics response
 */
export interface ShortLinkAnalyticsResponse {
  summary: ShortLinkAnalyticsSummary;
  hasAdvancedAnalytics: boolean;
  message?: string; // For free tier
  topShortLinks?: TopShortLink[];
  redirectsByDay?: RedirectsByDay[];
  topReferrers?: TopReferrer[];
  recentRedirects?: RecentRedirect[];
}

/**
 * Site Admin Timer data
 */
export interface Timer {
  id: string;
  command: string;
  description: string;
  cron: string;
  priority: number;
  runOnProcessor: string;
  isSystem: boolean;
  status: string;
  lastOccurrence: string | null;
  nextOccurrence: string | null;
  orchestratorId: string | null;
  errorMsg: string | null;
  manuallyTriggered: boolean;
  manuallyTriggeredBy: string | null;
  manuallyTriggeredByRole: string | null;
  manuallyTriggeredAt: string | null;
}

/**
 * Site Admin List Timers response
 */
export interface ListTimersResponse {
  success: boolean;
  timers: Timer[];
  count: number;
}

/**
 * Site Admin Run Timer request
 */
export interface RunTimerRequest {
  timerId: string;
}

/**
 * Site Admin Run Timer response
 */
export interface RunTimerResponse {
  success: boolean;
  message: string;
  timerId: string;
  command: string;
  status: string;
  orchestratorId: string | null;
  executedAt: string;
  executedBy: string;
  executedByRole: string;
}

/**
 * Create Checkout Session request
 */
export interface CreateCheckoutSessionRequest {
  tier: 'pro' | 'premium' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
}

/**
 * Create Checkout Session response
 */
export interface CreateCheckoutSessionResponse {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Create Portal Session response
 */
export interface CreatePortalSessionResponse {
  portalUrl: string;
}

/**
 * Cancel Subscription response
 */
export interface CancelSubscriptionResponse {
  message: string;
  cancelledAt: string;
  accessUntil: string;
}
