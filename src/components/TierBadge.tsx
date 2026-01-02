/**
 * TierBadge component
 * Displays a user's subscription tier with styling
 */

import { Chip, Tooltip } from '@mui/material';
import { UserTier, TIER_INFO } from '@/types/tiers';
import { parseTier } from '@/utils/tierValidation';

interface TierBadgeProps {
  tier?: UserTier | string | null;
  size?: 'small' | 'medium';
  showIcon?: boolean;
  variant?: 'filled' | 'outlined';
}

export default function TierBadge({ 
  tier, 
  size = 'small', 
  showIcon = true,
  variant = 'filled' 
}: TierBadgeProps) {
  const userTier = parseTier(tier);
  const info = TIER_INFO[userTier];
  
  return (
    <Tooltip title={info.description} arrow>
      <Chip
        label={showIcon ? `${info.icon} ${info.displayName}` : info.displayName}
        size={size}
        variant={variant}
        sx={{
          bgcolor: variant === 'filled' ? info.color : 'transparent',
          color: variant === 'filled' ? 'white' : info.color,
          borderColor: info.color,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}
      />
    </Tooltip>
  );
}
