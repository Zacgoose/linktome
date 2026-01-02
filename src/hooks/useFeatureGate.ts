/**
 * React hook for feature gate checking
 */

import { useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { UserTier, TierLimits, FeatureAccessResult } from '@/types/tiers';
import { canAccessFeature, parseTier } from '@/utils/tierValidation';
import { trackFeatureUsage } from '@/utils/featureGate';

interface UseFeatureGateResult {
  canAccess: (feature: keyof TierLimits) => FeatureAccessResult;
  checkAndTrack: (feature: keyof TierLimits, featureName: string) => boolean;
  userTier: UserTier;
  showUpgrade: boolean;
  upgradeInfo: {
    feature: string;
    requiredTier?: UserTier;
    currentTier: UserTier;
  } | null;
  openUpgradePrompt: (feature: string, requiredTier: UserTier) => void;
  closeUpgradePrompt: () => void;
}

/**
 * Hook to check feature access based on user tier
 */
export function useFeatureGate(): UseFeatureGateResult {
  const { user } = useAuthContext();
  const userTier = parseTier(user?.tier);
  
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    feature: string;
    requiredTier?: UserTier;
    currentTier: UserTier;
  } | null>(null);

  /**
   * Check if user can access a feature
   */
  const canAccess = useCallback(
    (feature: keyof TierLimits): FeatureAccessResult => {
      return canAccessFeature(userTier, feature);
    },
    [userTier]
  );

  /**
   * Check access and track the attempt
   */
  const checkAndTrack = useCallback(
    (feature: keyof TierLimits, featureName: string): boolean => {
      const result = canAccessFeature(userTier, feature);
      
      trackFeatureUsage({
        feature: featureName,
        userId: user?.UserId || 'unknown',
        tier: userTier,
        success: result.allowed,
        metadata: result.allowed ? undefined : {
          reason: result.reason,
          requiredTier: result.requiredTier,
        },
      });

      if (!result.allowed && result.requiredTier) {
        setUpgradeInfo({
          feature: featureName,
          requiredTier: result.requiredTier,
          currentTier: userTier,
        });
        setShowUpgrade(true);
      }

      return result.allowed;
    },
    [userTier, user?.UserId]
  );

  /**
   * Open upgrade prompt manually
   */
  const openUpgradePrompt = useCallback(
    (feature: string, requiredTier: UserTier) => {
      setUpgradeInfo({
        feature,
        requiredTier,
        currentTier: userTier,
      });
      setShowUpgrade(true);
    },
    [userTier]
  );

  /**
   * Close upgrade prompt
   */
  const closeUpgradePrompt = useCallback(() => {
    setShowUpgrade(false);
    setUpgradeInfo(null);
  }, []);

  return {
    canAccess,
    checkAndTrack,
    userTier,
    showUpgrade,
    upgradeInfo,
    openUpgradePrompt,
    closeUpgradePrompt,
  };
}
