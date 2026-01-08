/**
 * PremiumFeatureWrapper component
 * Wraps form sections that contain premium features
 * Shows an info alert when user doesn't have access
 */

import { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { TierLimits } from '@/types/tiers';

interface PremiumFeatureWrapperProps {
  featureKey: keyof TierLimits;
  featureName: string;
  description?: string;
  children: ReactNode;
  showAlert?: boolean;
}

/**
 * Wraps premium feature sections with optional alert
 * Children are always rendered to allow selection, validation happens on save
 */
export default function PremiumFeatureWrapper({
  featureKey,
  featureName,
  description,
  children,
  showAlert = true,
}: PremiumFeatureWrapperProps) {
  const { canAccess } = useFeatureGate();
  const access = canAccess(featureKey);

  return (
    <Box>
      {showAlert && !access.allowed && (
        <Alert severity="info" icon={<LockOutlinedIcon />} sx={{ mb: 2 }}>
          {featureName} {description ? `(${description}) ` : ''}is a premium feature. You can 
          select it, but you&apos;ll need to upgrade to save.
        </Alert>
      )}
      {children}
    </Box>
  );
}
