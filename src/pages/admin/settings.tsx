import { useState } from 'react';
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
  Divider,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
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

interface UserSettings {
  email: string;
  phoneNumber?: string;
  twoFactorEnabled?: boolean;
  twoFactorEmailEnabled?: boolean;
  twoFactorTotpEnabled?: boolean;
}

export default function SettingsPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  const [reset2FADialogOpen, setReset2FADialogOpen] = useState(false);
  const [setup2FADialogOpen, setSetup2FADialogOpen] = useState(false);

  const { data: settings, isLoading, refetch } = useApiGet<UserSettings>({
    url: 'admin/GetSettings',
    queryKey: 'user-settings',
  });

  const updatePassword = useApiPut({
    onSuccess: () => {
      setSuccess('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to update password');
      setTimeout(() => setError(''), 5000);
    },
  });

  const updateEmail = useApiPut({
    onSuccess: () => {
      setSuccess('Email updated successfully. Please check your new email for verification.');
      setEmailData({ newEmail: '', password: '' });
      setChangeEmailDialogOpen(false);
      refetch();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to update email');
      setTimeout(() => setError(''), 5000);
    },
  });

  const updatePhone = useApiPut({
    onSuccess: () => {
      setSuccess('Phone number updated successfully');
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to update phone number');
      setTimeout(() => setError(''), 5000);
    },
  });

  const reset2FA = useApiPost({
    onSuccess: () => {
      setSuccess('2FA has been reset successfully');
      setReset2FADialogOpen(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to reset 2FA');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      setTimeout(() => setError(''), 5000);
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
    setError('');
    setSuccess('');

    if (!emailData.newEmail || !emailData.password) {
      setError('Please fill in all fields');
      setTimeout(() => setError(''), 5000);
      return;
    }

    updateEmail.mutate({
      url: 'admin/UpdateEmail',
      data: emailData,
    });
  };

  const handlePhoneUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updatePhone.mutate({
      url: 'admin/UpdatePhone',
      data: { phoneNumber },
    });
  };

  const handleReset2FA = () => {
    reset2FA.mutate({
      url: 'admin/Reset2FA',
      data: {},
    });
  };

  const handle2FASetupComplete = () => {
    setSetup2FADialogOpen(false);
    setSuccess('2FA has been configured successfully');
    refetch();
    setTimeout(() => setSuccess(''), 3000);
  };

  if (isLoading || !settings) {
    return (
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography>Loading...</Typography>
        </Container>
      </AdminLayout>
    );
  }

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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

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
                Current Email: <strong>{settings.email}</strong>
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

          {/* 2FA Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <SecurityIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Two-Factor Authentication
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Add an extra layer of security to your account
              </Typography>
              <Stack spacing={2} mt={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">
                    Status:{' '}
                    {settings.twoFactorEnabled ? (
                      <Chip label="Enabled" color="success" size="small" />
                    ) : (
                      <Chip label="Disabled" color="default" size="small" />
                    )}
                  </Typography>
                </Box>
                {settings.twoFactorEnabled && (
                  <Box display="flex" gap={2} flexWrap="wrap">
                    {settings.twoFactorEmailEnabled && (
                      <Chip label="Email 2FA" color="primary" size="small" />
                    )}
                    {settings.twoFactorTotpEnabled && (
                      <Chip label="Authenticator App" color="primary" size="small" />
                    )}
                  </Box>
                )}
                <Box display="flex" gap={2}>
                  {!settings.twoFactorEnabled && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setSetup2FADialogOpen(true)}
                    >
                      Enable 2FA
                    </Button>
                  )}
                  {settings.twoFactorEnabled && (
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<DeleteIcon />}
                      onClick={() => setReset2FADialogOpen(true)}
                    >
                      Reset 2FA
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
                    value={phoneNumber || settings.phoneNumber || ''}
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

        {/* Reset 2FA Dialog */}
        <Dialog open={reset2FADialogOpen} onClose={() => setReset2FADialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reset Two-Factor Authentication</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will disable all two-factor authentication methods on your account.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              You will need to set up 2FA again if you want to re-enable it. Are you sure you want to continue?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReset2FADialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleReset2FA}
              disabled={reset2FA.isPending}
            >
              {reset2FA.isPending ? 'Resetting...' : 'Reset 2FA'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 2FA Setup Wizard */}
        {setup2FADialogOpen && (
          <TwoFactorSetupWizard
            open={setup2FADialogOpen}
            onClose={() => setSetup2FADialogOpen(false)}
            onComplete={handle2FASetupComplete}
          />
        )}
      </AdminLayout>
    </>
  );
}
