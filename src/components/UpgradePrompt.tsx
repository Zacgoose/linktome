/**
 * UpgradePrompt component
 * Shows upgrade messaging when users try to access premium features
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Star as StarIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { UserTier, TIER_INFO } from '@/types/tiers';
import { getTierLimits } from '@/utils/tierValidation';

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiredTier: UserTier;
  currentTier: UserTier;
}

export default function UpgradePrompt({
  open,
  onClose,
  feature,
  requiredTier,
  currentTier,
}: UpgradePromptProps) {
  const requiredInfo = TIER_INFO[requiredTier];
  const currentInfo = TIER_INFO[currentTier];
  const requiredLimits = getTierLimits(requiredTier);
  
  // Get key features of the required tier
  const keyFeatures = Object.entries(requiredLimits)
    .filter(([_, value]) => value === true)
    .slice(0, 5)
    .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <StarIcon sx={{ color: requiredInfo.color }} />
          <Typography variant="h6" fontWeight={600}>
            Upgrade to {requiredInfo.displayName}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{feature}</strong> requires a{' '}
            <strong style={{ color: requiredInfo.color }}>
              {requiredInfo.displayName}
            </strong>{' '}
            subscription. You currently have a{' '}
            <strong style={{ color: currentInfo.color }}>
              {currentInfo.displayName}
            </strong>{' '}
            account.
          </Typography>
        </Alert>

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {requiredInfo.displayName} Plan Includes:
        </Typography>
        
        <List dense>
          {keyFeatures.map((feature, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary={feature}
                primaryTypographyProps={{
                  textTransform: 'capitalize',
                }}
              />
            </ListItem>
          ))}
        </List>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {requiredInfo.description}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Maybe Later
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            // In production, redirect to pricing/upgrade page
            alert('Upgrade functionality would redirect to pricing page');
            onClose();
          }}
          sx={{
            bgcolor: requiredInfo.color,
            '&:hover': {
              bgcolor: requiredInfo.color,
              filter: 'brightness(0.9)',
            },
          }}
        >
          Upgrade Now
        </Button>
      </DialogActions>
    </Dialog>
  );
}
