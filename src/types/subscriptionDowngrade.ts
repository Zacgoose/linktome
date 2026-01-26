/**
 * Types for subscription downgrade handling
 */

import { UserTier } from './tiers';
import { Page } from './pages';
import { Link, LinkGroup, AppearanceData } from './links';
import { ShortLink, SubAccount } from './api';

/**
 * Strategy for handling feature downgrade
 */
export type DowngradeStrategy = 
  | 'keep-first' // Keep the first item(s) up to the limit
  | 'keep-default' // Keep the default/primary item
  | 'keep-newest' // Keep the newest item(s)
  | 'keep-oldest' // Keep the oldest item(s)
  | 'user-choice'; // Let user choose which to keep

/**
 * Status of a feature after downgrade
 */
export type FeatureDowngradeStatus = 
  | 'retained' // Feature will be kept as-is
  | 'removed' // Feature will be removed
  | 'restricted' // Feature will be limited/restricted
  | 'reverted'; // Feature will be reverted to default

/**
 * Result of a single feature downgrade operation
 */
export interface FeatureDowngradeResult {
  featureName: string;
  status: FeatureDowngradeStatus;
  details: string;
  affectedItems?: string[]; // IDs or names of affected items
}

/**
 * Result of pages downgrade
 */
export interface PagesDowngradeResult extends FeatureDowngradeResult {
  featureName: 'pages';
  pagesToKeep: Page[];
  pagesToRemove: Page[];
  defaultPageId: string; // ID of the page that will remain as default
}

/**
 * Result of theme downgrade
 */
export interface ThemeDowngradeResult extends FeatureDowngradeResult {
  featureName: 'theme';
  currentTheme: string;
  isPremium: boolean;
  willRevert: boolean;
  defaultTheme?: string; // Theme to revert to if current is premium
}

/**
 * Result of links downgrade
 */
export interface LinksDowngradeResult extends FeatureDowngradeResult {
  featureName: 'links';
  linksToKeep: Link[];
  linksToRemove: Link[];
  featuresRemoved: string[]; // e.g., ['animations', 'scheduling', 'locking']
}

/**
 * Result of short links downgrade
 */
export interface ShortLinksDowngradeResult extends FeatureDowngradeResult {
  featureName: 'shortLinks';
  shortLinksToKeep: ShortLink[];
  shortLinksToRemove: ShortLink[];
}

/**
 * Result of subaccounts downgrade
 */
export interface SubAccountsDowngradeResult extends FeatureDowngradeResult {
  featureName: 'subAccounts';
  subAccountsToSuspend: SubAccount[];
  message: string;
}

/**
 * Result of API access downgrade
 */
export interface ApiAccessDowngradeResult extends FeatureDowngradeResult {
  featureName: 'apiAccess';
  apiKeysToRevoke: string[];
  newRateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

/**
 * Overall downgrade assessment
 */
export interface SubscriptionDowngradeAssessment {
  fromTier: UserTier;
  toTier: UserTier;
  effectiveDate: Date;
  features: {
    pages?: PagesDowngradeResult;
    theme?: ThemeDowngradeResult;
    links?: LinksDowngradeResult;
    shortLinks?: ShortLinksDowngradeResult;
    subAccounts?: SubAccountsDowngradeResult;
    apiAccess?: ApiAccessDowngradeResult;
    fonts?: FeatureDowngradeResult;
    customLogos?: FeatureDowngradeResult;
    videoBackgrounds?: FeatureDowngradeResult;
    analytics?: FeatureDowngradeResult;
    customDomain?: FeatureDowngradeResult;
    whiteLabel?: FeatureDowngradeResult;
  };
  requiresUserAction: boolean; // Whether user needs to choose what to keep
  warnings: string[]; // User-facing warnings about what will be lost
  impactSummary: string; // Summary of the downgrade impact
}

/**
 * Options for downgrade operation
 */
export interface DowngradeOptions {
  strategy?: DowngradeStrategy;
  dryRun?: boolean; // If true, only assess without making changes
  notifyUser?: boolean; // Whether to send notification to user
  userSelections?: {
    // User's choices for what to keep
    pageIds?: string[];
    linkIds?: string[];
    shortLinkSlugs?: string[];
  };
}

/**
 * Request for downgrade preview
 */
export interface DowngradePreviewRequest {
  userId: string;
  targetTier: UserTier;
  options?: DowngradeOptions;
}

/**
 * Response for downgrade preview
 */
export interface DowngradePreviewResponse {
  assessment: SubscriptionDowngradeAssessment;
  canProceedAutomatically: boolean; // Whether downgrade can happen without user input
  requiredActions: string[]; // Actions user must take before downgrade
}

/**
 * Request to execute downgrade
 */
export interface ExecuteDowngradeRequest {
  userId: string;
  targetTier: UserTier;
  options: DowngradeOptions;
  userConfirmed: boolean; // User must explicitly confirm
}

/**
 * Response after executing downgrade
 */
export interface ExecuteDowngradeResponse {
  success: boolean;
  message: string;
  assessment: SubscriptionDowngradeAssessment;
  errors?: string[];
}
