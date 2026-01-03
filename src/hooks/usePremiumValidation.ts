/**
 * Hook for validating premium features before save
 * Provides consistent validation logic across all forms
 */

import { useCallback } from 'react';
import { TierLimits, UserTier } from '@/types/tiers';
import { canAccessFeature } from '@/utils/tierValidation';

export interface PremiumFeatureCheck {
  featureKey: keyof TierLimits;
  featureName: string;
  isUsing: boolean;
}

interface UsePremiumValidationProps {
  userTier: UserTier;
  openUpgradePrompt: (feature: string, requiredTier: UserTier) => void;
}

/**
 * Hook to validate premium features before saving
 * Returns a function that checks all features and shows upgrade prompt if needed
 */
export function usePremiumValidation({ userTier, openUpgradePrompt }: UsePremiumValidationProps) {
  /**
   * Validates an array of premium feature checks
   * Returns true if validation passes (can save), false if blocked (shows upgrade prompt)
   */
  const validateFeatures = useCallback(
    (checks: PremiumFeatureCheck[]): boolean => {
      const blockedFeatures: { feature: string; requiredTier: any }[] = [];

      for (const check of checks) {
        if (check.isUsing) {
          const access = canAccessFeature(userTier, check.featureKey);
          if (!access.allowed && access.requiredTier) {
            blockedFeatures.push({
              feature: check.featureName,
              requiredTier: access.requiredTier,
            });
          }
        }
      }

      // If any premium features are blocked, show upgrade prompt for the first one
      if (blockedFeatures.length > 0) {
        const firstBlocked = blockedFeatures[0];
        openUpgradePrompt(firstBlocked.feature, firstBlocked.requiredTier);
        return false; // Block save
      }

      return true; // Allow save
    },
    [userTier, openUpgradePrompt]
  );

  return { validateFeatures };
}
