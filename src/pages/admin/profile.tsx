import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  const profile = data;

  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    avatar: profile?.avatar || '',
  });

  // Only update form when profile initially loads
  const profileLoadedRef = useRef(false);
  
  useEffect(() => {
    if (profile && !profileLoadedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        avatar: profile.avatar || '',
      });
      profileLoadedRef.current = true;
    }
  }, [profile]);

  const updateProfile = useApiPut({
    relatedQueryKeys: ['admin-profile'],
    onSuccess: () => {
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updateProfile.mutate({
      url: 'admin/UpdateProfile',
      data: formData,
    });
  };

  if (isLoading || !profile) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Profile Settings - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
            Profile Settings
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

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <Box textAlign="center">
                    <Avatar
                      src={formData.avatar}
                      alt={formData.displayName}
                      sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      @{profile.username}
                    </Typography>
                  </Box>

                  <TextField
                    fullWidth
                    label="Display Name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    required
                    helperText="This is how your name will appear on your profile"
                  />

                  <TextField
                    fullWidth
                    label="Bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    multiline
                    rows={4}
                    helperText="Tell visitors about yourself"
                  />

                  <TextField
                    fullWidth
                    label="Avatar URL"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    helperText="Direct link to your profile picture"
                    placeholder="https://example.com/avatar.jpg"
                  />

                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      type="submit"
                      disabled={updateProfile.isPending}
                    >
                      {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => router.push('/admin/dashboard')}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
