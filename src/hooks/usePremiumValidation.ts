/**
 * Hook for validating premium features before save
 * Provides consistent validation logic across all forms
 */

import { useCallback } from 'react';
import { useFeatureGate } from './useFeatureGate';
import { TierLimits } from '@/types/tiers';

export interface PremiumFeatureCheck {
  featureKey: keyof TierLimits;
  featureName: string;
  isUsing: boolean;
}

/**
 * Hook to validate premium features before saving
 * Returns a function that checks all features and shows upgrade prompt if needed
 */
export function usePremiumValidation() {
  const { canAccess, openUpgradePrompt } = useFeatureGate();

  /**
   * Validates an array of premium feature checks
   * Returns true if validation passes (can save), false if blocked (shows upgrade prompt)
   */
  const validateFeatures = useCallback(
    (checks: PremiumFeatureCheck[]): boolean => {
      const blockedFeatures: { feature: string; requiredTier: any }[] = [];

      for (const check of checks) {
        if (check.isUsing) {
          const access = canAccess(check.featureKey);
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
    [canAccess, openUpgradePrompt]
  );

  return { validateFeatures };
}
