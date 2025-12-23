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
} from '@mui/material';
import {
  Link as LinkIcon,
  Palette as PaletteIcon,
  BarChart as AnalyticsIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet } from '@/hooks/useApiQuery';

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

interface DashboardStats {
  totalLinks: number;
  totalPageViews: number;
  totalLinkClicks: number;
}

interface DashboardStatsResponse {
  stats: DashboardStats;
}

export default function Dashboard() {
  const router = useRouter();

  const { data: profileData, isLoading: profileLoading } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  const { data: statsData } = useApiGet<DashboardStatsResponse>({
    url: 'admin/GetDashboardStats',
    queryKey: 'admin-dashboard-stats',
  });

  const profile = profileData;
  const dashboardStats = statsData?.stats || { 
    totalLinks: 0, 
    totalPageViews: 0, 
    totalLinkClicks: 0 
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
          <Typography variant="h4" gutterBottom fontWeight={700} color="text.primary">
            Welcome back, {profile.displayName}!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Manage your LinkToMe profile and track your performance
          </Typography>
          
          {/* Stats Overview */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                      <LinkIcon sx={{ color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {dashboardStats.totalLinks}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Links
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 2 }}>
                      <ViewIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {dashboardStats.totalPageViews}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Profile Views
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2 }}>
                      <AnalyticsIcon sx={{ color: 'success.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {dashboardStats.totalLinkClicks}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Link Clicks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Profile Overview */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Your Profile
                  </Typography>
                  <Box display="flex" alignItems="center" gap={3} mt={2}>
                    <Avatar
                      src={profile.avatar}
                      alt={profile.displayName}
                      sx={{ width: 80, height: 80 }}
                    />
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {profile.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        @{profile.username}
                      </Typography>
                    </Box>
                  </Box>
                  {profile.bio && (
                    <Typography variant="body2" color="text.secondary" mt={2}>
                      {profile.bio}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => router.push('/admin/profile')}
                  >
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Quick Actions */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Quick Actions
                  </Typography>
                  <Stack spacing={2} mt={2}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ViewIcon />}
                      onClick={() => window.open(`/public/${profile.username}`, '_blank', 'noopener,noreferrer')}
                    >
                      View Public Profile
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<LinkIcon />}
                      onClick={() => router.push('/admin/links')}
                    >
                      Manage Links
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PaletteIcon />}
                      onClick={() => router.push('/admin/appearance')}
                    >
                      Customize Appearance
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<AnalyticsIcon />}
                      onClick={() => router.push('/admin/analytics')}
                    >
                      View Analytics
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </AdminLayout>
    </>
  );
}