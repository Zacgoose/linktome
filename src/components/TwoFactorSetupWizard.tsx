import { useState, useEffect } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  TextField,
  Paper,
  CircularProgress,
  Chip,
  Grid,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Email as EmailIcon,
  PhoneIphone as PhoneIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useApiPost } from '@/hooks/useApiQuery';

interface TwoFactorSetupData {
  totp?: {
    secret: string;
    qrCodeUri: string;
    backupCodes: string[];
    issuer: string;
    accountName: string;
  };
  email?: {
    ready: boolean;
    accountEmail: string;
  };
}

interface TwoFactorSetupResponse {
  message: string;
  type: string;
  data: TwoFactorSetupData;
}

interface TwoFactorEnableResponse {
  message: string;
  type: string;
  emailEnabled: boolean;
  totpEnabled: boolean;
}



export interface TwoFactorSetupWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  method?: 'email' | 'totp';
}

export default function TwoFactorSetupWizard({
  open,
  onClose,
  onComplete,
  method,
}: TwoFactorSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [setupMethod, setSetupMethod] = useState<'email' | 'totp' | null>(method ?? null);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Setup mutation
  const setupMutation = useApiPost<TwoFactorSetupResponse>({
    onSuccess: (data) => {
      setSetupData(data.data);
      setActiveStep(1); // Move to setup step
      setError('');
    },
    onError: (error: string) => {
      setError(error || 'Failed to initialize 2FA setup');
    },
  });

  // Enable mutation
  const enableMutation = useApiPost<TwoFactorEnableResponse>({
    onSuccess: (data) => {
      setError('');
      if (setupMethod === 'totp') {
        setActiveStep(3); // Move to backup codes step
      } else {
        // Email only - complete immediately
        onComplete();
      }
    },
    onError: (error: string) => {
      setError(error || 'Invalid verification code. Please try again.');
    },
  });

  const handleMethodSelect = (selectedMethod: 'email' | 'totp') => {
    setSetupMethod(selectedMethod);
    setError('');
    setupMutation.mutate({
      url: 'admin/2fatokensetup?action=setup',
      data: { type: selectedMethod },
    });
  };

  const handleVerify = () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    enableMutation.mutate({
      url: 'admin/2fatokensetup?action=enable',
      data: {
        type: setupMethod,
        token: verificationCode,
      },
    });
  };

  const handleCopySecret = () => {
    if (setupData?.totp?.secret) {
      navigator.clipboard.writeText(setupData.totp.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    if (setupData?.totp?.backupCodes) {
      navigator.clipboard.writeText(setupData.totp.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleCancel = () => {
    // Reset state
    setActiveStep(0);
    setSetupMethod(null);
    setSetupData(null);
    setVerificationCode('');
    setError('');
    onClose();
  };


  // If method is provided, trigger setup when dialog opens or method changes
  useEffect(() => {
    if (open && method) {
      setSetupMethod(method);
      setSetupData(null);
      setVerificationCode('');
      setError('');
      setupMutation.mutate({
        url: 'admin/2fatokensetup?action=setup',
        data: { type: method },
      });
    }
    if (!open) {
      setActiveStep(0);
      setSetupMethod(method ?? null);
      setSetupData(null);
      setVerificationCode('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, method]);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // If method is provided, show loading spinner while setup is pending
        if (method) {
          if (setupMutation.isPending || !setupData) {
            return (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
              </Box>
            );
          }
          // Otherwise, show next step (should not happen)
          return null;
        }
        // Choose Method (legacy: no method prop)
        return (
          <Stack spacing={3}>
            <Typography variant="body1" color="text.secondary">
              Choose your preferred two-factor authentication method:
            </Typography>
            <Stack spacing={2}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '2px solid',
                  borderColor: setupMethod === 'totp' ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => !setupMutation.isPending && handleMethodSelect('totp')}
              >
                <Box display="flex" alignItems="start" gap={2}>
                  <PhoneIcon color="primary" sx={{ fontSize: 32, mt: 0.5 }} />
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" fontWeight={600}>
                        Authenticator App
                      </Typography>
                      <Chip label="Recommended" size="small" color="primary" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Use Google Authenticator, Authy, 1Password, or similar apps for time-based codes
                    </Typography>
                  </Box>
                </Box>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '2px solid',
                  borderColor: setupMethod === 'email' ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                  },
                }}
                onClick={() => !setupMutation.isPending && handleMethodSelect('email')}
              >
                <Box display="flex" alignItems="start" gap={2}>
                  <EmailIcon color="action" sx={{ fontSize: 32, mt: 0.5 }} />
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={600}>
                      Email Verification
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Receive a 6-digit code via email each time you login
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Stack>
            {setupMutation.isPending && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={32} />
              </Box>
            )}
          </Stack>
        );

      case 1:
        // Setup - Show QR Code or Email Confirmation
        if (setupMethod === 'totp' && setupData?.totp) {
          return (
            <Stack spacing={3}>
              <Alert severity="info">
                Scan the QR code below with your authenticator app, or manually enter the secret key.
              </Alert>

              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Paper
                  elevation={3}
                  sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                  }}
                >
                  <Box
                    component="img"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      setupData.totp.qrCodeUri
                    )}`}
                    alt="2FA QR Code"
                    sx={{ display: 'block', width: 200, height: 200 }}
                  />
                </Paper>

                <Box textAlign="center" width="100%">
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Manual Entry Key:
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: 'grey.100',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2" fontFamily="monospace">
                      {setupData.totp.secret}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={copiedSecret ? <CheckIcon /> : <CopyIcon />}
                      onClick={handleCopySecret}
                      color={copiedSecret ? 'success' : 'primary'}
                    >
                      {copiedSecret ? 'Copied!' : 'Copy'}
                    </Button>
                  </Paper>
                </Box>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => setActiveStep(2)}
              >
                I&apos;ve Scanned the Code
              </Button>
            </Stack>
          );
        }
        // Handle email 2FA setup confirmation
        if (setupMethod === 'email' && setupData?.email) {
          return (
            <Stack spacing={3}>
              <Alert severity="info">
                <Typography variant="body2">
                  A verification code will be sent to your email address:
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                  {setupData.email.accountEmail}
                </Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Enter the 6-digit code you receive below to complete setup.
                </Typography>
              </Alert>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => setActiveStep(2)}
              >
                I&apos;ve Received the Code
              </Button>
            </Stack>
          );
        }
        return null;

      case 2:
        // Verify
        return (
          <Stack spacing={3}>
            <Alert severity="info">
              Enter the 6-digit code from your authenticator app to verify it&apos;s working correctly.
            </Alert>

            <TextField
              fullWidth
              label="Verification Code"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError('');
              }}
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' },
              }}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && verificationCode.length === 6) {
                  handleVerify();
                }
              }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleVerify}
              disabled={verificationCode.length !== 6 || enableMutation.isPending}
              startIcon={enableMutation.isPending && <CircularProgress size={20} />}
            >
              {enableMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
            </Button>
          </Stack>
        );

      case 3:
        // Backup Codes
        if (setupData?.totp?.backupCodes) {
          return (
            <Stack spacing={3}>
              <Alert severity="warning">
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Save these backup codes!
                </Typography>
                <Typography variant="body2">
                  Each code can only be used once. Store them securely in case you lose access to your authenticator app.
                </Typography>
              </Alert>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={1}>
                  {setupData.totp.backupCodes.map((code, index) => (
                    <Grid item xs={6} key={index}>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{
                          p: 1,
                          bgcolor: 'white',
                          borderRadius: 1,
                          textAlign: 'center',
                        }}
                      >
                        {code}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>

              <Button
                variant="outlined"
                fullWidth
                startIcon={copiedCodes ? <CheckIcon /> : <CopyIcon />}
                onClick={handleCopyBackupCodes}
                color={copiedCodes ? 'success' : 'primary'}
              >
                {copiedCodes ? 'Copied to Clipboard!' : 'Copy All Backup Codes'}
              </Button>

              <Alert severity="success">
                <Typography variant="body2" fontWeight={600}>
                  Two-factor authentication is now enabled!
                </Typography>
              </Alert>

              <Button variant="contained" fullWidth size="large" onClick={handleComplete}>
                Complete Setup
              </Button>
            </Stack>
          );
        }
        return null;

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
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
            Setup Two-Factor Authentication
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {activeStep > 0 && (
            <Stepper activeStep={activeStep - 1}>
              <Step>
                <StepLabel>Setup</StepLabel>
              </Step>
              <Step>
                <StepLabel>Verify</StepLabel>
              </Step>
              <Step>
                <StepLabel>Backup Codes</StepLabel>
              </Step>
            </Stepper>
          )}

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {renderStepContent()}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
