/**
 * Tier validation utilities
 * Provides functions to check if a user's tier allows access to specific features
 */

import { UserTier, TIER_CONFIG, TierLimits, FeatureAccessResult } from '@/types/tiers';

/**
 * Get tier limits for a given tier
 */
export function getTierLimits(tier: UserTier): TierLimits {
  return TIER_CONFIG[tier] || TIER_CONFIG[UserTier.FREE];
}

/**
 * Parse tier from string (with fallback to FREE)
 */
export function parseTier(tierString?: string | null): UserTier {
  if (!tierString) return UserTier.FREE;
  
  const normalized = tierString.toLowerCase();
  if (Object.values(UserTier).includes(normalized as UserTier)) {
    return normalized as UserTier;
  }
  
  return UserTier.FREE;
}

/**
 * Check if a tier allows access to a specific feature
 */
export function canAccessFeature(
  userTier: UserTier | string | undefined,
  feature: keyof TierLimits
): FeatureAccessResult {
  const tier = typeof userTier === 'string' ? parseTier(userTier) : (userTier || UserTier.FREE);
  const limits = getTierLimits(tier);
  const allowed = Boolean(limits[feature]);
  
  if (allowed) {
    return {
      allowed: true,
      currentTier: tier,
    };
  }
  
  // Find the minimum tier that allows this feature
  const requiredTier = findMinimumTierForFeature(feature);
  
  return {
    allowed: false,
    currentTier: tier,
    requiredTier,
    reason: `This feature requires ${requiredTier} tier or higher`,
  };
}

/**
 * Find the minimum tier that allows a specific feature
 */
export function findMinimumTierForFeature(feature: keyof TierLimits): UserTier {
  const tiers = [UserTier.FREE, UserTier.PRO, UserTier.PREMIUM, UserTier.ENTERPRISE];
  
  for (const tier of tiers) {
    const limits = getTierLimits(tier);
    if (limits[feature]) {
      return tier;
    }
  }
  
  return UserTier.ENTERPRISE;
}

/**
 * Check if user has reached a limit (e.g., max links)
 */
export function hasReachedLimit(
  userTier: UserTier | string | undefined,
  limitType: 'maxLinks' | 'maxLinkGroups' | 'apiKeysLimit' | 'maxPages',
  currentCount: number
): FeatureAccessResult {
  const tier = typeof userTier === 'string' ? parseTier(userTier) : (userTier || UserTier.FREE);
  const limits = getTierLimits(tier);
  const limit = limits[limitType];
  
  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentTier: tier,
    };
  }
  
  const allowed = currentCount < limit;
  
  if (allowed) {
    return {
      allowed: true,
      currentTier: tier,
    };
  }
  
  return {
    allowed: false,
    currentTier: tier,
    reason: `You've reached the limit of ${limit} ${limitType}. Upgrade to add more.`,
  };
}

/**
 * Get all features available for a tier
 */
export function getAvailableFeatures(userTier: UserTier | string | undefined): string[] {
  const tier = typeof userTier === 'string' ? parseTier(userTier) : (userTier || UserTier.FREE);
  const limits = getTierLimits(tier);
  
  return Object.entries(limits)
    .filter(([_, value]) => value === true || (typeof value === 'number' && value !== 0))
    .map(([key]) => key);
}

/**
 * Compare two tiers (returns true if tier1 >= tier2)
 */
export function compareTiers(tier1: UserTier, tier2: UserTier): boolean {
  const tierOrder = [UserTier.FREE, UserTier.PRO, UserTier.PREMIUM, UserTier.ENTERPRISE];
  return tierOrder.indexOf(tier1) >= tierOrder.indexOf(tier2);
}

/**
 * Check if a font is available for a tier
 */
export function canUseFontFamily(
  userTier: UserTier | string | undefined,
  fontIsPro: boolean | undefined
): FeatureAccessResult {
  if (!fontIsPro) {
    // Non-pro fonts are available to all tiers
    return {
      allowed: true,
      currentTier: typeof userTier === 'string' ? parseTier(userTier) : (userTier || UserTier.FREE),
    };
  }
  
  return canAccessFeature(userTier, 'premiumFonts');
}

/**
 * Check if a theme is available for a tier
 */
export function canUseTheme(
  userTier: UserTier | string | undefined,
  themeIsPro: boolean | undefined
): FeatureAccessResult {
  if (!themeIsPro) {
    // Non-pro themes are available to all tiers
    return {
      allowed: true,
      currentTier: typeof userTier === 'string' ? parseTier(userTier) : (userTier || UserTier.FREE),
    };
  }
  
  return canAccessFeature(userTier, 'customThemes');
}
