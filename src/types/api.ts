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
  tier?: UserTier; // User's subscription tier
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
  created?: string;
  updated?: string;
}

/**
 * Login/Signup response
 * HTTP Status: 200 (success) or 400/401 (error)
 */
export interface LoginResponse {
  user: UserAuth;
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
}

export interface RecentLinkClick {
  linkTitle: string;
  userAgent: string;
  timestamp: string;
  linkUrl: string;
  referrer: string;
  ipAddress: string;
  linkId: string;
}

export interface LinkClicksByLink {
  linkId: string;
  clickCount: number;
  linkTitle: string;
  linkUrl: string;
}

export interface AnalyticsSummary {
  totalLinkClicks: number;
  uniqueVisitors: number;
  totalPageViews: number;
}

export interface AnalyticsData {
  clicksByDay: ClicksByDay[];
  recentPageViews: RecentPageView[];
  linkClicksByLink: LinkClicksByLink[];
  summary: AnalyticsSummary;
  viewsByDay: ViewsByDay[];
  recentLinkClicks: RecentLinkClick[];
}

/**
 * Analytics API response
 */
export type AnalyticsResponse = AnalyticsData;
