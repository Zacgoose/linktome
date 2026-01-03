/**
 * useTierProtection hook
 * Combines useFeatureGate with UpgradePrompt rendering
 * Reduces boilerplate in pages
 */

import { useFeatureGate } from './useFeatureGate';
import UpgradePrompt from '@/components/UpgradePrompt';

/**
 * Hook that provides tier checking and upgrade prompt management
 * Use this instead of manually managing useFeatureGate + UpgradePrompt
 * 
 * @example
 * const { canAccess, UpgradePromptComponent } = useTierProtection();
 * 
 * return (
 *   <>
 *     {canAccess('feature').allowed ? <Feature /> : <Upgrade />}
 *     <UpgradePromptComponent />
 *   </>
 * );
 */
export function useTierProtection() {
  const {
    canAccess,
    userTier,
    showUpgrade,
    upgradeInfo,
    openUpgradePrompt,
    closeUpgradePrompt,
  } = useFeatureGate();

  /**
   * Pre-configured UpgradePrompt component
   * Automatically wired to the hook's state
   */
  const UpgradePromptComponent = () => {
    if (!showUpgrade || !upgradeInfo) {
      return null;
    }

    return (
      <UpgradePrompt
        open={showUpgrade}
        onClose={closeUpgradePrompt}
        feature={upgradeInfo.feature}
        requiredTier={upgradeInfo.requiredTier!}
        currentTier={upgradeInfo.currentTier}
      />
    );
  };

  return {
    canAccess,
    userTier,
    openUpgradePrompt,
    closeUpgradePrompt,
    UpgradePromptComponent,
  };
}
