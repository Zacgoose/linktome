/**
 * TierProtectedSection component
 * Wraps content that requires a specific tier level
 * Shows upgrade prompt if user doesn't have required tier
 */

import { ReactNode } from 'react';
import { Box, Alert, Button, Stack, Typography } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { TierLimits } from '@/types/tiers';

interface TierProtectedSectionProps {
  /** The feature key to check access for */
  featureKey: keyof TierLimits;
  /** Display name of the feature for upgrade messaging */
  featureName: string;
  /** Content to show when user has access */
  children: ReactNode;
  /** Optional custom upgrade message */
  upgradeMessage?: string;
  /** Optional list of benefits to show in upgrade prompt */
  benefits?: string[];
  /** Whether to show a compact upgrade prompt (default: false) */
  compact?: boolean;
  /** Optional fallback content when access denied */
  fallback?: ReactNode;
}

export default function TierProtectedSection({
  featureKey,
  featureName,
  children,
  upgradeMessage,
  benefits,
  compact = false,
  fallback,
}: TierProtectedSectionProps) {
  const { canAccess, openUpgradePrompt } = useFeatureGate();
  const access = canAccess(featureKey);

  if (access.allowed) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt
  const defaultMessage = upgradeMessage || `Upgrade to ${access.requiredTier || 'Pro'}+ to unlock ${featureName}`;
  const defaultBenefits = benefits || [
    `${featureName} feature`,
    'Extended analytics',
    'Priority support',
  ];

  if (compact) {
    return (
      <Alert 
        severity="info" 
        sx={{ mb: 2 }}
        action={
          <Button
            size="small"
            onClick={() => openUpgradePrompt(featureName, access.requiredTier!)}
          >
            Upgrade
          </Button>
        }
      >
        {defaultMessage}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        textAlign: 'center',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <LockIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {featureName}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {defaultMessage}
      </Typography>
      {defaultBenefits.length > 0 && (
        <Stack spacing={1} sx={{ mb: 3, textAlign: 'left', maxWidth: 300, mx: 'auto' }}>
          {defaultBenefits.map((benefit, idx) => (
            <Typography key={idx} variant="body2" color="text.secondary">
              • {benefit}
            </Typography>
          ))}
        </Stack>
      )}
      <Button
        variant="contained"
        onClick={() => openUpgradePrompt(featureName, access.requiredTier!)}
      >
        Upgrade to {access.requiredTier || 'Pro'}
      </Button>
    </Box>
  );
}
