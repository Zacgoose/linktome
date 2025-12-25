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
  TextField,
  Avatar,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, Visibility as PreviewIcon } from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';

const themes = [
  { value: 'light', label: 'Light', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { value: 'dark', label: 'Dark', gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)' },
  { value: 'sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)' },
  { value: 'ocean', label: 'Ocean', gradient: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)' },
  { value: 'forest', label: 'Forest', gradient: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)' },
  { value: 'custom', label: 'Custom', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
];

const buttonStyles = [
  { value: 'rounded', label: 'Rounded', borderRadius: '8px' },
  { value: 'square', label: 'Square', borderRadius: '0px' },
  { value: 'pill', label: 'Pill', borderRadius: '50px' },
];

const fonts = [
  { value: 'default', label: 'Default (Inter)', fontFamily: 'Inter, sans-serif' },
  { value: 'serif', label: 'Serif', fontFamily: 'Georgia, serif' },
  { value: 'mono', label: 'Monospace', fontFamily: 'Courier New, monospace' },
  { value: 'poppins', label: 'Poppins', fontFamily: 'Poppins, sans-serif' },
  { value: 'roboto', label: 'Roboto', fontFamily: 'Roboto, sans-serif' },
];

const layoutStyles = [
  { value: 'centered', label: 'Centered' },
  { value: 'card', label: 'Card Layout' },
];

interface AppearanceData {
  theme: string;
  buttonStyle: string;
  fontFamily: string;
  layoutStyle: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    buttonBackground: string;
    buttonText: string;
  };
  customGradient?: {
    start: string;
    end: string;
  };
}

interface AppearanceResponse {
  appearance: AppearanceData;
}

// Helper function to get background gradient for preview
const getPreviewBackgroundGradient = (theme: string, customGradient: { start: string; end: string }) => {
  if (theme === 'custom') {
    return `linear-gradient(135deg, ${customGradient.start} 0%, ${customGradient.end} 100%)`;
  }
  
  const themeGradients: Record<string, string> = {
    light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    dark: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    sunset: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    ocean: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
    forest: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  };
  
  return themeGradients[theme] || themeGradients.light;
};

// Helper function to get font family for preview
const getPreviewFontFamily = (fontFamily: string) => {
  const fontFamilies: Record<string, string> = {
    default: 'Inter, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Courier New, monospace',
    poppins: 'Poppins, sans-serif',
    roboto: 'Roboto, sans-serif',
  };
  
  return fontFamilies[fontFamily] || fontFamilies.default;
};

export default function AppearancePage() {
  const router = useRouter();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useApiGet<AppearanceResponse>({
    url: 'admin/GetAppearance',
    queryKey: 'admin-appearance',
  });

  const appearance = data?.appearance;

  const [formData, setFormData] = useState({
    theme: (appearance?.theme || 'light') as string,
    buttonStyle: (appearance?.buttonStyle || 'rounded') as string,
    fontFamily: (appearance?.fontFamily || 'default') as string,
    layoutStyle: (appearance?.layoutStyle || 'centered') as string,
    colors: {
      primary: appearance?.colors?.primary || '#667eea',
      secondary: appearance?.colors?.secondary || '#764ba2',
      background: appearance?.colors?.background || '#ffffff',
      buttonBackground: appearance?.colors?.buttonBackground || '#667eea',
      buttonText: appearance?.colors?.buttonText || '#ffffff',
    },
    customGradient: {
      start: appearance?.customGradient?.start || '#667eea',
      end: appearance?.customGradient?.end || '#764ba2',
    },
  });

  // Only update form when data initially loads
  const dataLoadedRef = useRef(false);
  
  useEffect(() => {
    if (appearance && !dataLoadedRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        theme: (appearance.theme || 'light') as string,
        buttonStyle: (appearance.buttonStyle || 'rounded') as string,
        fontFamily: (appearance.fontFamily || 'default') as string,
        layoutStyle: (appearance.layoutStyle || 'centered') as string,
        colors: {
          primary: appearance.colors?.primary || '#667eea',
          secondary: appearance.colors?.secondary || '#764ba2',
          background: appearance.colors?.background || '#ffffff',
          buttonBackground: appearance.colors?.buttonBackground || '#667eea',
          buttonText: appearance.colors?.buttonText || '#ffffff',
        },
        customGradient: {
          start: appearance.customGradient?.start || '#667eea',
          end: appearance.customGradient?.end || '#764ba2',
        },
      });
      dataLoadedRef.current = true;
    }
  }, [appearance]);

  const updateAppearance = useApiPut({
    relatedQueryKeys: ['admin-appearance'],
    onSuccess: () => {
      setSuccess('Appearance updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error);
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
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
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

          {/* Live Preview */}
          <Card sx={{ mt: 3, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" alignItems="center" gap={1} mb={3}>
                <PreviewIcon />
                <Typography variant="h6" fontWeight={600}>
                  Live Preview
                </Typography>
              </Box>
              
              <Box
                sx={{
                  minHeight: 400,
                  borderRadius: 2,
                  background: getPreviewBackgroundGradient(formData.theme, formData.customGradient),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  fontFamily: getPreviewFontFamily(formData.fontFamily),
                }}
              >
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                  {formData.layoutStyle === 'card' ? (
                    <Card elevation={4}>
                      <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Avatar
                          sx={{ 
                            width: 100, 
                            height: 100, 
                            mx: 'auto', 
                            mb: 2,
                            bgcolor: 'grey.300',
                          }}
                        >
                          <Typography variant="h4" color="text.secondary">U</Typography>
                        </Avatar>
                        
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                          Your Name
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          @username
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                          Your bio will appear here
                        </Typography>
                        
                        <Stack spacing={2}>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{
                              borderRadius: buttonStyles.find(s => s.value === formData.buttonStyle)?.borderRadius || '8px',
                              bgcolor: formData.colors.buttonBackground,
                              color: formData.colors.buttonText,
                              '&:hover': {
                                bgcolor: formData.colors.buttonBackground,
                                opacity: 0.9,
                              },
                            }}
                          >
                            Sample Link 1
                          </Button>
                          <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={{
                              borderRadius: buttonStyles.find(s => s.value === formData.buttonStyle)?.borderRadius || '8px',
                              bgcolor: formData.colors.buttonBackground,
                              color: formData.colors.buttonText,
                              '&:hover': {
                                bgcolor: formData.colors.buttonBackground,
                                opacity: 0.9,
                              },
                            }}
                          >
                            Sample Link 2
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : (
                    <Box sx={{ textAlign: 'center' }}>
                      <Avatar
                        sx={{ 
                          width: 100, 
                          height: 100, 
                          mx: 'auto', 
                          mb: 2,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          border: 3,
                          borderColor: '#ffffff',
                        }}
                      >
                        <Typography variant="h4" color="text.secondary">U</Typography>
                      </Avatar>
                      
                      <Typography variant="h5" fontWeight={700} gutterBottom sx={{ color: '#ffffff' }}>
                        Your Name
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }} gutterBottom>
                        @username
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1, mb: 3 }}>
                        Your bio will appear here
                      </Typography>
                      
                      <Stack spacing={2}>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          sx={{
                            borderRadius: buttonStyles.find(s => s.value === formData.buttonStyle)?.borderRadius || '8px',
                            bgcolor: formData.colors.buttonBackground,
                            color: formData.colors.buttonText,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            '&:hover': {
                              bgcolor: formData.colors.buttonBackground,
                              opacity: 0.9,
                            },
                          }}
                        >
                          Sample Link 1
                        </Button>
                        <Button
                          variant="contained"
                          size="large"
                          fullWidth
                          sx={{
                            borderRadius: buttonStyles.find(s => s.value === formData.buttonStyle)?.borderRadius || '8px',
                            bgcolor: formData.colors.buttonBackground,
                            color: formData.colors.buttonText,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            '&:hover': {
                              bgcolor: formData.colors.buttonBackground,
                              opacity: 0.9,
                            },
                          }}
                        >
                          Sample Link 2
                        </Button>
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 4 }} />

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={4}>
                  {/* Theme Selection */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Background Theme
                    </FormLabel>
                    <Grid container spacing={2}>
                      {themes.map((t) => (
                        <Grid item xs={6} md={4} key={t.value}>
                          <Paper
                            onClick={() => setFormData({ ...formData, theme: t.value })}
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: 2,
                              borderColor: formData.theme === t.value ? 'primary.main' : 'transparent',
                              '&:hover': { borderColor: 'primary.light' },
                            }}
                          >
                            <Box
                              sx={{
                                height: 80,
                                borderRadius: 1,
                                background: t.gradient,
                                mb: 1,
                              }}
                            />
                            <Typography align="center" fontWeight={600} variant="body2">
                              {t.label}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </FormControl>

                  {/* Custom Colors - Only show if theme is custom */}
                  {formData.theme === 'custom' && (
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                        Custom Background Gradient
                      </FormLabel>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              Start Color
                            </Typography>
                            <TextField
                              type="color"
                              fullWidth
                              value={formData.customGradient.start}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  customGradient: { ...formData.customGradient, start: e.target.value },
                                })
                              }
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              End Color
                            </Typography>
                            <TextField
                              type="color"
                              fullWidth
                              value={formData.customGradient.end}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  customGradient: { ...formData.customGradient, end: e.target.value },
                                })
                              }
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box
                            sx={{
                              height: 100,
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${formData.customGradient.start} 0%, ${formData.customGradient.end} 100%)`,
                            }}
                          />
                        </Grid>
                      </Grid>
                    </FormControl>
                  )}

                  {/* Button Colors */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Button Colors
                    </FormLabel>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Button Background
                          </Typography>
                          <TextField
                            type="color"
                            fullWidth
                            value={formData.colors.buttonBackground}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                colors: { ...formData.colors, buttonBackground: e.target.value },
                              })
                            }
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            Button Text
                          </Typography>
                          <TextField
                            type="color"
                            fullWidth
                            value={formData.colors.buttonText}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                colors: { ...formData.colors, buttonText: e.target.value },
                              })
                            }
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </FormControl>

                  {/* Button Style */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Button Style
                    </FormLabel>
                    <RadioGroup
                      value={formData.buttonStyle}
                      onChange={(e) => setFormData({ ...formData, buttonStyle: e.target.value })}
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
                                  borderRadius: style.borderRadius,
                                  bgcolor: formData.colors.buttonBackground,
                                  color: formData.colors.buttonText,
                                  '&:hover': {
                                    bgcolor: formData.colors.buttonBackground,
                                    opacity: 0.9,
                                  },
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
                      onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
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

                  {/* Layout Style */}
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                      Layout Style
                    </FormLabel>
                    <RadioGroup
                      value={formData.layoutStyle}
                      onChange={(e) => setFormData({ ...formData, layoutStyle: e.target.value })}
                    >
                      <Stack spacing={1}>
                        {layoutStyles.map((layout) => (
                          <Paper key={layout.value} sx={{ p: 2 }}>
                            <Box display="flex" alignItems="center">
                              <Radio value={layout.value} />
                              <Typography flex={1}>{layout.label}</Typography>
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
