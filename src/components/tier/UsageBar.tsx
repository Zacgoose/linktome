/**
 * UsageBar component
 * Displays usage progress bar with current/total values
 * Extracted from apiauth.tsx for reuse
 */

import { Box, Typography, LinearProgress } from '@mui/material';

interface UsageBarProps {
  /** Current usage count */
  used: number;
  /** Maximum allowed count */
  total: number;
  /** Label to display */
  label: string;
  /** Show as unlimited if total is -1 (default: true) */
  showUnlimited?: boolean;
}

export default function UsageBar({ 
  used, 
  total, 
  label,
  showUnlimited = true,
}: UsageBarProps) {
  const isUnlimited = total === -1;
  const percentage = !isUnlimited && total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isHigh = percentage > 80;
  const isMedium = percentage > 50;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {used.toLocaleString()} / {isUnlimited && showUnlimited ? 'Unlimited' : total.toLocaleString()}
        </Typography>
      </Box>
      {!isUnlimited && (
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={isHigh ? 'error' : isMedium ? 'warning' : 'primary'}
          sx={{ height: 8, borderRadius: 1 }}
        />
      )}
    </Box>
  );
}
