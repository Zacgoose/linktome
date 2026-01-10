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
  Stack,
  Paper,
  Chip,
} from '@mui/material';
import {
  Link as LinkIcon,
  Palette as PaletteIcon,
  BarChart as AnalyticsIcon,
  Visibility as ViewIcon,
  Pages as PagesIcon,
  TrendingUp as TrendingUpIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet } from '@/hooks/useApiQuery';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { usePageContext } from '@/context/PageContext';
import TierBadge from '@/components/TierBadge';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

interface DashboardStats {
  totalLinks: number;
}

interface DashboardStatsResponse {
  stats: DashboardStats;
}

export default function Dashboard() {
  const router = useRouter();
  const { userTier } = useFeatureGate();
  const { pages } = usePageContext();

  const { data: profileData, isLoading: profileLoading } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  // Dashboard stats show aggregated data across all pages
  const { data: statsData } = useApiGet<DashboardStatsResponse>({
    url: 'admin/GetDashboardStats',
    queryKey: 'admin-dashboard-stats',
  });

  const profile = profileData;
  const dashboardStats = statsData?.stats || { 
    totalLinks: 0,
  };

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
                  <TierBadge tier={userTier} size="large" />
                  {pages && pages.length > 0 && (
                    <Chip 
                      icon={<PagesIcon />}
                      label={`${pages.length} ${pages.length === 1 ? 'Page' : 'Pages'}`}
                      sx={{ 
                        bgcolor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {/* Stats Card */}
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  height: '100%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                  color: 'white'
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <LinkIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                  <Typography variant="h2" fontWeight={700} gutterBottom>
                    {dashboardStats.totalLinks}
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Active Links
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ 
                      mt: 3,
                      borderColor: 'white', 
                      color: 'white',
                      '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                    }}
                    startIcon={<LinkIcon />}
                    onClick={() => router.push('/admin/links')}
                  >
                    Manage Links
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
                    Quick Actions
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 3,
                          border: '2px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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
                          Create and customize multiple link pages
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 3,
                          border: '2px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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
                          Customize themes, colors, and styling
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 3,
                          border: '2px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
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
                          Track views, clicks, and performance
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper
                        elevation={0}
                        sx={{ 
                          p: 3,
                          border: '2px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: 'info.main',
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => router.push('/admin/profile')}
                      >
                        <Avatar
                          src={profile.avatar}
                          sx={{ width: 36, height: 36, mb: 1 }}
                        />
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          Edit Profile
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Update bio, avatar, and settings
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </AdminLayout>
    </>
  );
}