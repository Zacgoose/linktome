/**
 * TierProtectedButton component
 * Button that validates tier before onClick action
 * Shows upgrade prompt if user doesn't have required tier
 */

import { ReactNode } from 'react';
import { Button, ButtonProps, Tooltip } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { TierLimits } from '@/types/tiers';

interface TierProtectedButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The feature key to check access for */
  featureKey: keyof TierLimits;
  /** Display name of the feature for upgrade messaging */
  featureName: string;
  /** Action to perform when button is clicked and user has access */
  onClick: () => void;
  /** Button content */
  children: ReactNode;
  /** Show lock icon on button (default: true if no access) */
  showLockIcon?: boolean;
}

export default function TierProtectedButton({
  featureKey,
  featureName,
  onClick,
  children,
  showLockIcon,
  disabled,
  ...buttonProps
}: TierProtectedButtonProps) {
  const { canAccess, openUpgradePrompt } = useFeatureGate();
  const access = canAccess(featureKey);

  const handleClick = () => {
    if (!access.allowed && access.requiredTier) {
      openUpgradePrompt(featureName, access.requiredTier);
    } else {
      onClick();
    }
  };

  const shouldShowLock = showLockIcon !== undefined ? showLockIcon : !access.allowed;
  const tooltipTitle = !access.allowed 
    ? `Requires ${access.requiredTier || 'Pro'}+ plan` 
    : '';

  return (
    <Tooltip title={tooltipTitle} arrow>
      <span>
        <Button
          {...buttonProps}
          onClick={handleClick}
          disabled={disabled}
          startIcon={shouldShowLock ? <LockIcon fontSize="small" /> : buttonProps.startIcon}
        >
          {children}
        </Button>
      </span>
    </Tooltip>
  );
}
