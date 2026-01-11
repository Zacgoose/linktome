/**
 * User tier/subscription types and feature limits
 */

/**
 * Available user tiers
 */
export enum UserTier {
  FREE = 'free',
  PRO = 'pro',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/**
 * Feature limits per tier
 */
export interface TierLimits {
  // Page features
  maxPages: number;
  
  // Link features
  maxLinks: number;
  maxLinkGroups: number;
  customLayouts: boolean;
  linkAnimations: boolean;
  linkScheduling: boolean;
  linkLocking: boolean;
  
  // Short link features
  maxShortLinks: number;
  shortLinkAnalytics: boolean;
  
  // Appearance features
  customThemes: boolean;
  premiumFonts: boolean;
  customLogos: boolean;
  videoBackgrounds: boolean;
  removeFooter: boolean;
  
  // Analytics features
  advancedAnalytics: boolean;
  analyticsExport: boolean;
  analyticsRetentionDays: number;
  
  // API features
  apiAccess: boolean;
  apiKeysLimit: number;
  apiRequestsPerMinute: number;
  apiRequestsPerDay: number;
  
  // Other features
  customDomain: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}

/**
 * Tier configuration mapping
 */
export const TIER_CONFIG: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    maxPages: 1,
    maxLinks: 10,
    maxLinkGroups: 2,
    customLayouts: false,
    linkAnimations: false,
    linkScheduling: false,
    linkLocking: false,
    maxShortLinks: 0,
    shortLinkAnalytics: false,
    customThemes: true,
    premiumFonts: false,
    customLogos: false,
    videoBackgrounds: false,
    removeFooter: false,
    advancedAnalytics: false,
    analyticsExport: false,
    analyticsRetentionDays: 30,
    apiAccess: false,
    apiKeysLimit: 0,
    apiRequestsPerMinute: 0,
    apiRequestsPerDay: 0,
    customDomain: false,
    prioritySupport: false,
    whiteLabel: false,
  },
  [UserTier.PRO]: {
    maxPages: 3,
    maxLinks: 50,
    maxLinkGroups: 10,
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    maxShortLinks: 5,
    shortLinkAnalytics: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: false,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: 90,
    apiAccess: true,
    apiKeysLimit: 3,
    apiRequestsPerMinute: 60,
    apiRequestsPerDay: 10000,
    customDomain: false,
    prioritySupport: false,
    whiteLabel: false,
  },
  [UserTier.PREMIUM]: {
    maxPages: 10,
    maxLinks: 100,
    maxLinkGroups: 25,
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    maxShortLinks: 20,
    shortLinkAnalytics: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: true,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: 365,
    apiAccess: true,
    apiKeysLimit: 10,
    apiRequestsPerMinute: 120,
    apiRequestsPerDay: 50000,
    customDomain: true,
    prioritySupport: true,
    whiteLabel: false,
  },
  [UserTier.ENTERPRISE]: {
    maxPages: -1, // unlimited
    maxLinks: -1, // unlimited
    maxLinkGroups: -1, // unlimited
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    maxShortLinks: -1, // unlimited
    shortLinkAnalytics: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: true,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: -1, // unlimited
    apiAccess: true,
    apiKeysLimit: -1, // unlimited
    apiRequestsPerMinute: 300,
    apiRequestsPerDay: -1, // unlimited
    customDomain: true,
    prioritySupport: true,
    whiteLabel: true,
  },
};

/**
 * Feature access result
 */
export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiredTier?: UserTier;
  currentTier: UserTier;
}

/**
 * Tier display information
 */
export interface TierInfo {
  tier: UserTier;
  displayName: string;
  color: string;
  icon: string;
  description: string;
  pricing: {
    monthly: number;
    annual: number;
  };
}

/**
 * Tier display configurations
 */
export const TIER_INFO: Record<UserTier, TierInfo> = {
  [UserTier.FREE]: {
    tier: UserTier.FREE,
    displayName: 'Free',
    color: '#9e9e9e',
    icon: '🆓',
    description: 'Basic features for getting started',
    pricing: {
      monthly: 0,
      annual: 0,
    },
  },
  [UserTier.PRO]: {
    tier: UserTier.PRO,
    displayName: 'Pro',
    color: '#3f51b5',
    icon: '⭐',
    description: 'Advanced features for professionals',
    pricing: {
      monthly: 1.99,
      annual: 19.99,
    },
  },
  [UserTier.PREMIUM]: {
    tier: UserTier.PREMIUM,
    displayName: 'Premium',
    color: '#9c27b0',
    icon: '💎',
    description: 'Premium features for power users',
    pricing: {
      monthly: 3.99,
      annual: 39.99,
    },
  },
  [UserTier.ENTERPRISE]: {
    tier: UserTier.ENTERPRISE,
    displayName: 'Enterprise',
    color: '#f44336',
    icon: '🏢',
    description: 'Enterprise-grade features and support',
    pricing: {
      monthly: 10.99,
      annual: 109.99,
    },
  },
};
