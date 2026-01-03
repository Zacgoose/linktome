/**
 * TierLimitAlert component
 * Displays alerts when user has reached tier limits
 */

import { Alert, Button } from '@mui/material';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { TierLimits } from '@/types/tiers';

interface TierLimitAlertProps {
  /** The limit feature to check */
  limitKey: keyof TierLimits;
  /** Display name for the limit */
  limitName: string;
  /** Current usage count */
  currentCount: number;
  /** Optional custom message */
  message?: string;
  /** Whether to show if limit not reached (default: false) */
  alwaysShow?: boolean;
}

export default function TierLimitAlert({
  limitKey,
  limitName,
  currentCount,
  message,
  alwaysShow = false,
}: TierLimitAlertProps) {
  const { canAccess, openUpgradePrompt } = useFeatureGate();
  const access = canAccess(limitKey);

  // Check if limit is a number and if it's been reached
  const limit = access.limit;
  const isLimitReached = typeof limit === 'number' && limit !== -1 && currentCount >= limit;
  const isNearingLimit = typeof limit === 'number' && limit !== -1 && currentCount >= limit * 0.8;

  if (!isLimitReached && !isNearingLimit && !alwaysShow) {
    return null;
  }

  const severity = isLimitReached ? 'warning' : 'info';
  const defaultMessage = isLimitReached
    ? message || `You've reached your ${limitName} limit (${limit}). Upgrade to ${access.requiredTier || 'Pro'}+ to add more.`
    : message || `You're nearing your ${limitName} limit (${currentCount}/${limit}). Consider upgrading.`;

  return (
    <Alert 
      severity={severity}
      sx={{ mb: 2 }}
      action={
        <Button
          size="small"
          onClick={() => openUpgradePrompt(limitName, access.requiredTier!)}
        >
          Upgrade
        </Button>
      }
    >
      {defaultMessage}
    </Alert>
  );
}
