/**
 * React hook for feature gate checking
 * Now supports context-aware tier checking for managed users
 */

import { useState, useCallback } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRbacContext } from '@/context/RbacContext';
import { UserTier, TierLimits, FeatureAccessResult } from '@/types/tiers';
import { canAccessFeature, parseTier } from '@/utils/tierValidation';

interface UseFeatureGateResult {
  canAccess: (feature: keyof TierLimits) => FeatureAccessResult;
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
 * Automatically uses context-specific tier when in managed user context
 */
export function useFeatureGate(): UseFeatureGateResult {
  const { user } = useAuthContext();
  const { contextTier } = useRbacContext();
  
  // Use context-specific tier if available (for managed users), otherwise use base user tier
  const userTier = parseTier(contextTier || user?.tier);
  
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
    userTier,
    showUpgrade,
    upgradeInfo,
    openUpgradePrompt,
    closeUpgradePrompt,
  };
}
