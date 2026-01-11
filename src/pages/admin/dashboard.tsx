import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Avatar,
  CircularProgress,
  Grid,
  Paper,
} from '@mui/material';
import {
  Link as LinkIcon,
  Palette as PaletteIcon,
  Pages as PagesIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as ContentCopyIcon,
  CallToAction as ShortLinksIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet } from '@/hooks/useApiQuery';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import TierBadge from '@/components/TierBadge';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { userTier } = useFeatureGate();

  const { data: profileData, isLoading: profileLoading } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  const profile = profileData;

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/public/${profile?.username}`;
    navigator.clipboard.writeText(url);
  };

  if (profileLoading || !profile) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - LinkToMe</title>
      </Head>
      
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Hero Section */}
          <Paper 
            elevation={0}
            sx={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              borderRadius: 3,
              p: 4,
              mb: 4,
              color: 'white'
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Avatar
                    src={profile.avatar}
                    alt={profile.displayName}
                    sx={{ width: 80, height: 80, border: '4px solid rgba(255,255,255,0.3)' }}
                  />
                  <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      Welcome back, {profile.displayName}!
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      @{profile.username}
                    </Typography>
                  </Box>
                </Box>
                {profile.bio && (
                  <Typography variant="body1" sx={{ opacity: 0.9, mt: 2 }}>
                    {profile.bio}
                  </Typography>
                )}
                <Box display="flex" gap={2} mt={3} flexWrap="wrap">
                  <Button
                    variant="contained"
                    sx={{ 
                      bgcolor: 'white', 
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                    startIcon={<ViewIcon />}
                    onClick={() => window.open(`/public/${profile.username}`, '_blank', 'noopener,noreferrer')}
                  >
                    View Public Profile
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{ 
                      borderColor: 'white', 
                      color: 'white',
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                    startIcon={<ContentCopyIcon />}
                    onClick={copyProfileUrl}
                  >
                    Copy Profile URL
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
                  <TierBadge tier={userTier} size="medium" />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Quick Actions */}
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 3,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': {
                            borderColor: 'primary.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => router.push('/admin/links')}
                  >
                    <LinkIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Manage Links
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add and organize your links
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 3,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => router.push('/admin/pages')}
                  >
                    <PagesIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Manage Pages
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create multiple link pages
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 3,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': {
                        borderColor: 'secondary.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => router.push('/admin/appearance')}
                  >
                    <PaletteIcon sx={{ fontSize: 36, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Appearance
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customize themes & colors
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 3,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': {
                        borderColor: 'success.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => router.push('/admin/analytics')}
                  >
                    <TrendingUpIcon sx={{ fontSize: 36, color: 'success.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track views & clicks
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 3,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': {
                        borderColor: 'info.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => router.push('/admin/shortlinks')}
                  >
                    <ShortLinksIcon sx={{ fontSize: 36, color: 'info.main', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Short Links
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create URL shortcuts
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}