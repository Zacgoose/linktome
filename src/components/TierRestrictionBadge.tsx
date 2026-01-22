/**
 * Tier Restriction Badge Component
 * 
 * Displays warning badges and icons for features that exceed the user's tier limits.
 * Used throughout the admin interface to indicate restricted features.
 */

import React from 'react';
import {
  Chip,
  Tooltip,
  Box,
  Alert,
  AlertTitle,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Lock as LockIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';

interface TierRestrictionBadgeProps {
  type?: 'badge' | 'icon' | 'inline' | 'alert';
  feature: string;
  requiredTier?: string;
  size?: 'small' | 'medium';
  onUpgrade?: () => void;
}

export default function TierRestrictionBadge({
  type = 'badge',
  feature,
  requiredTier = 'Pro',
  size = 'small',
  onUpgrade,
}: TierRestrictionBadgeProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/admin/subscription');
    }
  };

  if (type === 'badge') {
    return (
      <Tooltip title={`${feature} requires ${requiredTier} tier`}>
        <Chip
          icon={<WarningIcon />}
          label="Requires Upgrade"
          color="warning"
          size={size}
          sx={{ cursor: 'pointer' }}
          onClick={handleUpgrade}
        />
      </Tooltip>
    );
  }

  if (type === 'icon') {
    return (
      <Tooltip title={`${feature} requires ${requiredTier} tier`}>
        <WarningIcon
          color="warning"
          fontSize={size}
          sx={{ cursor: 'pointer' }}
          onClick={handleUpgrade}
        />
      </Tooltip>
    );
  }

  if (type === 'inline') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          bgcolor: 'warning.light',
          borderRadius: 1,
          color: 'warning.dark',
        }}
      >
        <WarningIcon fontSize="small" />
        <Box sx={{ flexGrow: 1, fontSize: '0.875rem' }}>
          {feature} requires {requiredTier} tier
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<UpgradeIcon />}
          onClick={handleUpgrade}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Upgrade
        </Button>
      </Box>
    );
  }

  if (type === 'alert') {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <AlertTitle>{feature} Restricted</AlertTitle>
        This feature requires {requiredTier} tier or higher.
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<UpgradeIcon />}
            onClick={handleUpgrade}
          >
            Upgrade to {requiredTier}
          </Button>
        </Box>
      </Alert>
    );
  }

  return null;
}

/**
 * Hook to check if any tier restrictions exist
 */
export function useTierRestrictions(data: {
  pages?: Array<{ exceedsTierLimit?: boolean }>;
  links?: Array<{
    layoutExceedsTier?: boolean;
    animationExceedsTier?: boolean;
    scheduleExceedsTier?: boolean;
    lockExceedsTier?: boolean;
  }>;
  shortLinks?: Array<{ exceedsTierLimit?: boolean }>;
  appearance?: {
    exceedsTierLimit?: boolean;
    videoExceedsTierLimit?: boolean;
  };
}) {
  const restrictedPages = (data.pages || []).filter(p => p.exceedsTierLimit).length;
  
  const restrictedLinks = (data.links || []).filter(
    l => l.layoutExceedsTier || l.animationExceedsTier || 
         l.scheduleExceedsTier || l.lockExceedsTier
  ).length;
  
  const restrictedShortLinks = (data.shortLinks || []).filter(
    sl => sl.exceedsTierLimit
  ).length;
  
  const restrictedAppearance = !!(
    data.appearance?.exceedsTierLimit || 
    data.appearance?.videoExceedsTierLimit
  );

  const totalRestrictions = 
    restrictedPages + 
    restrictedLinks + 
    restrictedShortLinks + 
    (restrictedAppearance ? 1 : 0);

  return {
    hasRestrictions: totalRestrictions > 0,
    totalRestrictions,
    restrictedPages,
    restrictedLinks,
    restrictedShortLinks,
    restrictedAppearance,
  };
}

/**
 * Global upgrade prompt for multiple restrictions
 */
interface GlobalUpgradePromptProps {
  restrictions: ReturnType<typeof useTierRestrictions>;
  onUpgrade?: () => void;
}

export function GlobalUpgradePrompt({ restrictions, onUpgrade }: GlobalUpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/admin/subscription');
    }
  };

  if (!restrictions.hasRestrictions) {
    return null;
  }

  return (
    <Alert severity="warning" sx={{ mb: 3 }}>
      <AlertTitle>Premium Features Detected</AlertTitle>
      <Box component="ul" sx={{ mb: 2, pl: 2 }}>
        {restrictions.restrictedPages > 0 && (
          <li>{restrictions.restrictedPages} page(s) exceed tier limit</li>
        )}
        {restrictions.restrictedAppearance && (
          <li>Custom theme or video background unavailable</li>
        )}
        {restrictions.restrictedLinks > 0 && (
          <li>{restrictions.restrictedLinks} link(s) with premium features</li>
        )}
        {restrictions.restrictedShortLinks > 0 && (
          <li>{restrictions.restrictedShortLinks} short link(s) exceed tier limit</li>
        )}
      </Box>
      <Button
        variant="contained"
        color="warning"
        startIcon={<UpgradeIcon />}
        onClick={handleUpgrade}
      >
        Upgrade to Pro
      </Button>
    </Alert>
  );
}
