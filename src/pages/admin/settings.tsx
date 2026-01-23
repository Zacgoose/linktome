import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Password as PasswordIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut, useApiPost } from '@/hooks/useApiQuery';
import TwoFactorSetupWizard from '@/components/TwoFactorSetupWizard';
import { useAuthContext } from '@/providers/AuthProvider';
import { useToast } from '@/context/ToastContext';

interface UserProfile {
  UserId: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  phoneNumber?: string;
}

// Password validation helper
const validatePassword = (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): { valid: boolean; error?: string } => {
  if (newPassword !== confirmPassword) {
    return { valid: false, error: 'New passwords do not match' };
  }

  if (newPassword.length < 8) {
    return { valid: false, error: 'New password must be at least 8 characters long' };
  }

  return { valid: true };
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false);
  const [resetTotpDialogOpen, setResetTotpDialogOpen] = useState(false);
  const [resetEmailDialogOpen, setResetEmailDialogOpen] = useState(false);
  const [setupTotpDialogOpen, setSetupTotpDialogOpen] = useState(false);
  const [setupEmailDialogOpen, setSetupEmailDialogOpen] = useState(false);

  // Track if phone number has been initialized
  const phoneInitialized = useRef(false);

  // Get 2FA status from auth context
  const { user, refreshAuth } = useAuthContext();

  // Use the existing GetProfile endpoint
  const { data: profile, isLoading, refetch } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  // Initialize phone number from profile when data loads (only once)
  useEffect(() => {
    if (profile?.phoneNumber && !phoneInitialized.current) {
      setPhoneNumber(profile.phoneNumber);
      phoneInitialized.current = true;
    }
  }, [profile]);

  const updatePassword = useApiPut({
    onSuccess: () => {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  const updateEmail = useApiPut({
    onSuccess: async () => {
      setEmailData({ newEmail: '', password: '' });
      setChangeEmailDialogOpen(false);
      await refreshAuth();
      refetch();
    },
  });

  const updatePhone = useApiPut({
    onSuccess: () => {
      refetch();
    },
  });

  const resetTotp = useApiPost({
    onSuccess: async () => {
      setResetTotpDialogOpen(false);
      await refreshAuth();
      refetch();
    },
  });

  const resetEmail = useApiPost({
    onSuccess: async () => {
      setResetEmailDialogOpen(false);
      await refreshAuth();
      refetch();
    },
  });

  const handleDisableTotp = () => {
    resetTotp.mutate({
      url: 'admin/2fatokensetup?action=disable',
      data: { type: 'totp' },
    });
  };

  const handleDisableEmail = () => {
    resetEmail.mutate({
      url: 'admin/2fatokensetup?action=disable',
      data: { type: 'email' },
    });
  };

  const handleTotpSetupComplete = async () => {
    setSetupTotpDialogOpen(false);
    await refreshAuth();
    refetch();
  };

  const handleEmailSetupComplete = async () => {
    setSetupEmailDialogOpen(false);
    await refreshAuth();
    refetch();
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePassword(
      passwordData.currentPassword,
      passwordData.newPassword,
      passwordData.confirmPassword
    );

    if (!validation.valid) {
      return;
    }

    updatePassword.mutate({
      url: 'admin/UpdatePassword',
      data: {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      },
    });
  };

  const handleEmailChange = () => {

    if (!emailData.newEmail || !emailData.password) {
      return;
    }

    updateEmail.mutate({
      url: 'admin/UpdateEmail',
      data: emailData,
    });
  };

  const handlePhoneUpdate = (e: React.FormEvent) => {
    e.preventDefault();

    updatePhone.mutate({
      url: 'admin/UpdatePhone',
      data: { phoneNumber },
    });
  };

  if (isLoading || !profile) {
    return (
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>Loading...</Typography>
        </Container>
      </AdminLayout>
    );
  }

  // Get 2FA status from user context (available after login)
  const twoFactorEmailEnabled = user?.twoFactorEmailEnabled || false;
  const twoFactorTotpEnabled = user?.twoFactorTotpEnabled || false;

  return (
    <>
      <Head>
        <title>Account Settings - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
            Account Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Manage your security and account preferences
          </Typography>

          {/* Password Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <PasswordIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Change Password
                </Typography>
              </Box>
              <Box component="form" onSubmit={handlePasswordChange}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    type={showCurrentPassword ? 'text' : 'password'}
                    label="Current Password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            edge="end"
                          >
                            {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    type={showNewPassword ? 'text' : 'password'}
                    label="New Password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    required
                    helperText="Must be at least 8 characters long"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    fullWidth
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    type="submit"
                    disabled={updatePassword.isPending}
                  >
                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <EmailIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Email Address
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Email: <strong>{profile.email}</strong>
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => setChangeEmailDialogOpen(true)}
              >
                Change Email
              </Button>
            </CardContent>
          </Card>

          {/* 2FA Section - Multi-method */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <SecurityIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Two-Factor Authentication
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add an extra layer of security to your account. You can enable one or both methods below.
              </Typography>
              <Stack spacing={3} mt={2}>
                {/* TOTP 2FA */}
                <Box display="flex" alignItems="center" gap={2}>
                  <PhoneIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight={600}>Authenticator App</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use Google Authenticator, Authy, 1Password, or similar apps for time-based codes.
                    </Typography>
                  </Box>
                  {twoFactorTotpEnabled ? (
                    <>
                      <Chip label="Enabled" color="success" size="small" sx={{ mr: 1 }} />
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => setResetTotpDialogOpen(true)}
                        disabled={resetTotp.isPending}
                      >
                        Disable
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setSetupTotpDialogOpen(true)}
                    >
                      Enable
                    </Button>
                  )}
                </Box>
                {/* Email 2FA */}
                <Box display="flex" alignItems="center" gap={2}>
                  <EmailIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight={600}>Email Verification</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive a 6-digit code via email each time you login.
                    </Typography>
                  </Box>
                  {twoFactorEmailEnabled ? (
                    <>
                      <Chip label="Enabled" color="success" size="small" sx={{ mr: 1 }} />
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => setResetEmailDialogOpen(true)}
                        disabled={resetEmail.isPending}
                      >
                        Disable
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => setSetupEmailDialogOpen(true)}
                    >
                      Enable
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Phone Number Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <PhoneIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Mobile Number
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add a mobile number to your account (optional)
              </Typography>
              <Box component="form" onSubmit={handlePhoneUpdate} sx={{ mt: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    helperText="International format recommended"
                  />
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    type="submit"
                    disabled={updatePhone.isPending}
                  >
                    {updatePhone.isPending ? 'Updating...' : 'Update Phone Number'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Container>

        {/* Change Email Dialog */}
        <Dialog open={changeEmailDialogOpen} onClose={() => setChangeEmailDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Email Address</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Enter your new email address and current password to confirm the change.
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                type="email"
                label="New Email Address"
                value={emailData.newEmail}
                onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                required
              />
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={emailData.password}
                onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                required
                helperText="Enter your password to confirm this change"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangeEmailDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleEmailChange}
              disabled={updateEmail.isPending}
            >
              {updateEmail.isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disable TOTP Dialog */}
        <Dialog open={resetTotpDialogOpen} onClose={() => setResetTotpDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Disable Authenticator App 2FA</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will disable Authenticator App (TOTP) 2FA for your account.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to continue?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetTotpDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleDisableTotp}
              disabled={resetTotp.isPending}
            >
              {resetTotp.isPending ? 'Disabling...' : 'Disable'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Disable Email 2FA Dialog */}
        <Dialog open={resetEmailDialogOpen} onClose={() => setResetEmailDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Disable Email 2FA</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will disable Email 2FA for your account.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Are you sure you want to continue?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetEmailDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleDisableEmail}
              disabled={resetEmail.isPending}
            >
              {resetEmail.isPending ? 'Disabling...' : 'Disable'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* TOTP 2FA Setup Wizard */}
        {setupTotpDialogOpen && (
          <TwoFactorSetupWizard
            open={setupTotpDialogOpen}
            onClose={() => setSetupTotpDialogOpen(false)}
            onComplete={handleTotpSetupComplete}
            method="totp"
          />
        )}

        {/* Email 2FA Setup Wizard */}
        {setupEmailDialogOpen && (
          <TwoFactorSetupWizard
            open={setupEmailDialogOpen}
            onClose={() => setSetupEmailDialogOpen(false)}
            onComplete={handleEmailSetupComplete}
            method="email"
          />
        )}
      </AdminLayout>
    </>
  );
}
