import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Email as EmailIcon,
  PhoneIphone as PhoneIcon,
} from '@mui/icons-material';

interface TwoFactorSetupPromptProps {
  open: boolean;
  onClose: () => void;
  onSetup: () => void;
  onSkip: () => void;
}

export default function TwoFactorSetupPrompt({
  open,
  onClose,
  onSetup,
  onSkip,
}: TwoFactorSetupPromptProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1.5}>
          <SecurityIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={600}>
            Secure Your Account
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Protect your account with Two-Factor Authentication (2FA). Add an extra layer of security to prevent unauthorized access.
          </Typography>

          <Alert severity="info" sx={{ borderRadius: 1.5 }}>
            <Typography variant="body2" fontWeight={500}>
              Why enable 2FA?
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              Even if someone gets your password, they won&apos;t be able to access your account without your second factor.
            </Typography>
          </Alert>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Available Methods:
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <Box display="flex" alignItems="start" gap={1.5}>
                <EmailIcon color="action" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Email Verification
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive a 6-digit code via email
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="start" gap={1.5}>
                <PhoneIcon color="action" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Authenticator App (Recommended)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use Google Authenticator, Authy, or similar apps
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onSkip} color="inherit">
          Skip for Now
        </Button>
        <Button 
          onClick={onSetup} 
          variant="contained" 
          size="large"
          startIcon={<SecurityIcon />}
        >
          Setup 2FA
        </Button>
      </DialogActions>
    </Dialog>
  );
}
