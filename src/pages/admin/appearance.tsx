import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';
import { useRequireAuth } from '@/hooks/useAuth';

const themes = [
  { value: 'light', label: 'Light', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { value: 'dark', label: 'Dark', gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
];

const buttonStyles = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'pill', label: 'Pill' },
];

const fonts = [
  { value: 'default', label: 'Default (Inter)', fontFamily: 'Inter, sans-serif' },
  { value: 'serif', label: 'Serif', fontFamily: 'Georgia, serif' },
  { value: 'mono', label: 'Monospace', fontFamily: 'monospace' },
];

interface AppearanceData {
  theme: 'light' | 'dark';
  buttonStyle: 'rounded' | 'square' | 'pill';
  fontFamily: 'default' | 'serif' | 'mono';
}

export default function AppearancePage() {
  const router = useRouter();
  useRequireAuth();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useApiGet<AppearanceData>({
    url: 'admin/GetAppearance',
    queryKey: 'admin-appearance',
    retry: 0, // Don't retry if endpoint doesn't exist yet
    onError: () => {
      // Silently use defaults if endpoint doesn't exist
    },
  });

  const [formData, setFormData] = useState({
    theme: (data?.theme || 'light') as 'light' | 'dark',
    buttonStyle: (data?.buttonStyle || 'rounded') as 'rounded' | 'square' | 'pill',
    fontFamily: (data?.fontFamily || 'default') as 'default' | 'serif' | 'mono',
  });

  // Only update form when data initially loads
  const dataLoadedRef = useRef(false);
  
  useEffect(() => {
    if (data && !dataLoadedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        theme: data.theme || 'light',
        buttonStyle: data.buttonStyle || 'rounded',
        fontFamily: data.fontFamily || 'default',
      });
      dataLoadedRef.current = true;
    }
  }, [data]);

  const updateAppearance = useApiPut({
    relatedQueryKeys: ['admin-appearance'],
    onSuccess: () => {
      setSuccess('Appearance updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError((err.response?.data as { error?: string })?.error || 'Failed to update appearance');
      setTimeout(() => setError(''), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    updateAppearance.mutate({
      url: 'admin/UpdateAppearance',
      data: formData,
    });
  };

  if (isLoading) {
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
        <title>Appearance - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Appearance
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Customize how your profile looks to visitors
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
                <Stack spacing={4}>
                  {/* Theme Selection */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Color Theme
                    </FormLabel>
                    <Grid container spacing={2}>
                      {themes.map((t) => (
                        <Grid item xs={6} key={t.value}>
                          <Paper
                            onClick={() => setFormData({ ...formData, theme: t.value as 'light' | 'dark' })}
                            sx={{
                              p: 3,
                              cursor: 'pointer',
                              border: 2,
                              borderColor: formData.theme === t.value ? 'primary.main' : 'transparent',
                              '&:hover': { borderColor: 'primary.light' },
                            }}
                          >
                            <Box
                              sx={{
                                height: 100,
                                borderRadius: 1,
                                background: t.gradient,
                                mb: 2,
                              }}
                            />
                            <Typography align="center" fontWeight={600}>
                              {t.label}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </FormControl>

                  {/* Button Style */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Button Style
                    </FormLabel>
                    <RadioGroup
                      value={formData.buttonStyle}
                      onChange={(e) => setFormData({ ...formData, buttonStyle: e.target.value as 'rounded' | 'square' | 'pill' })}
                    >
                      <Stack spacing={1}>
                        {buttonStyles.map((style) => (
                          <Paper key={style.value} sx={{ p: 2 }}>
                            <Box display="flex" alignItems="center">
                              <Radio value={style.value} />
                              <Typography flex={1}>{style.label}</Typography>
                              <Button
                                variant="contained"
                                size="small"
                                sx={{
                                  borderRadius:
                                    style.value === 'square'
                                      ? 0
                                      : style.value === 'pill'
                                      ? 25
                                      : 1,
                                }}
                              >
                                Example
                              </Button>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  {/* Font Family */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Font Style
                    </FormLabel>
                    <RadioGroup
                      value={formData.fontFamily}
                      onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value as 'default' | 'serif' | 'mono' })}
                    >
                      <Stack spacing={1}>
                        {fonts.map((font) => (
                          <Paper key={font.value} sx={{ p: 2 }}>
                            <Box display="flex" alignItems="center">
                              <Radio value={font.value} />
                              <Typography flex={1} sx={{ fontFamily: font.fontFamily }}>
                                {font.label}
                              </Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Stack>
                    </RadioGroup>
                  </FormControl>

                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      type="submit"
                      disabled={updateAppearance.isPending}
                    >
                      {updateAppearance.isPending ? 'Saving...' : 'Save Changes'}
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
