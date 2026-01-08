import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link as MuiLink,
  Stack,
} from '@mui/material';
import { Email as EmailIcon, Security as SecurityIcon, VpnKey as KeyIcon } from '@mui/icons-material';

interface TwoFactorAuthProps {
  method: 'email' | 'totp';
  onVerify: (token: string, method?: 'email' | 'totp' | 'backup') => void;
  onResendEmail?: () => void;
  loading?: boolean;
  error?: string;
  onBack?: () => void;
}

export default function TwoFactorAuth({
  method,
  onVerify,
  onResendEmail,
  loading = false,
  error = '',
  onBack,
}: TwoFactorAuthProps) {
  const [token, setToken] = useState<string>('');
  const [showBackupInput, setShowBackupInput] = useState<boolean>(false);
  const [backupCode, setBackupCode] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, []);

  const handleTokenChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(0, 1);
    
    const newToken = token.split('');
    newToken[index] = digit;
    const updatedToken = newToken.join('').slice(0, 6);
    setToken(updatedToken);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && !token[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && token.length === 6) {
      handleSubmit(e as any);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setToken(pastedData);
    
    // Focus the last filled input or the first empty one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length === 6 && !loading) {
      onVerify(token, method);
    }
  };

  const handleBackupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (backupCode.length >= 6 && !loading) {
      onVerify(backupCode, 'backup');
    }
  };

  const handleResend = () => {
    if (onResendEmail && resendCooldown === 0) {
      onResendEmail();
      setResendCooldown(60);
      cooldownInterval.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownInterval.current) {
              clearInterval(cooldownInterval.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const canSubmit = token.length === 6 && !loading;
  const canSubmitBackup = backupCode.length >= 6 && !loading;

  return (
    <Box>
      {!showBackupInput ? (
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {method === 'email' ? (
              <EmailIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            ) : (
              <SecurityIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            )}
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Two-Factor Authentication
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {method === 'email'
                ? 'Enter the 6-digit code sent to your email'
                : 'Enter the 6-digit code from your authenticator app'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 3 }}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TextField
                key={index}
                inputRef={(el) => (inputRefs.current[index] = el)}
                value={token[index] || ''}
                onChange={(e) => handleTokenChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                inputProps={{
                  maxLength: 1,
                  style: {
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    padding: '12px 0',
                  },
                }}
                sx={{
                  width: 56,
                  '& input': {
                    textAlign: 'center',
                  },
                }}
                variant="outlined"
                disabled={loading}
              />
            ))}
          </Stack>

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={!canSubmit}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify'}
          </Button>

          {method === 'email' && onResendEmail && (
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Didn&apos;t receive the code?{' '}
                {resendCooldown > 0 ? (
                  <Typography component="span" variant="body2" color="text.disabled">
                    Resend in {resendCooldown}s
                  </Typography>
                ) : (
                  <MuiLink
                    component="button"
                    variant="body2"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.preventDefault();
                      handleResend();
                    }}
                    disabled={loading}
                  >
                    Resend Code
                  </MuiLink>
                )}
              </Typography>
            </Box>
          )}

          {/* Backup code option - only show for TOTP */}
          {method === 'totp' && (
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Lost access to your authenticator?{' '}
                <MuiLink
                  component="button"
                  variant="body2"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    setShowBackupInput(true);
                  }}
                  disabled={loading}
                >
                  Use backup code
                </MuiLink>
              </Typography>
            </Box>
          )}

          {onBack && (
            <Box textAlign="center">
              <MuiLink
                component="button"
                variant="body2"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  onBack();
                }}
                disabled={loading}
              >
                Back to login
              </MuiLink>
            </Box>
          )}
        </Box>
      ) : (
        <Box component="form" onSubmit={handleBackupSubmit}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <KeyIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Use Backup Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter one of your backup recovery codes
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Each backup code can only be used once. After using a code, you&apos;ll have one less backup code available.
            </Typography>
          </Alert>

          <TextField
            fullWidth
            label="Backup Code"
            placeholder="XXXXXXXX"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            inputProps={{
              style: {
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                fontFamily: 'monospace',
              },
            }}
            sx={{ mb: 3 }}
            autoFocus
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && canSubmitBackup) {
                handleBackupSubmit(e as any);
              }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            type="submit"
            disabled={!canSubmitBackup}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Backup Code'}
          </Button>

          <Box textAlign="center" sx={{ mb: 2 }}>
            <MuiLink
              component="button"
              variant="body2"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                setShowBackupInput(false);
                setBackupCode('');
              }}
              disabled={loading}
            >
              Back to authenticator code
            </MuiLink>
          </Box>

          {onBack && (
            <Box textAlign="center">
              <MuiLink
                component="button"
                variant="body2"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  onBack();
                }}
                disabled={loading}
              >
                Back to login
              </MuiLink>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
