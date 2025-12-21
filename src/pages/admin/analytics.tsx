import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Stack,
} from '@mui/material';
import {
  Visibility as ViewsIcon,
  TouchApp as ClicksIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet } from '@/hooks/useApiQuery';

interface AnalyticsData {
  views: number;
  clicks: number;
  topLinks: Array<{
    title: string;
    url: string;
    clicks: number;
  }>;
}

interface AnalyticsResponse {
  analytics: AnalyticsData;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useApiGet<AnalyticsResponse>({
    url: 'admin/GetAnalytics',
    queryKey: 'admin-analytics',
    retry: 0, // Don't retry if endpoint doesn't exist yet
    onError: () => {
      // Silently fail if analytics endpoint doesn't exist
    },
  });

  const analytics = data?.analytics || {
    views: 0,
    clicks: 0,
    topLinks: [],
  };

  const clickThroughRate = analytics.views > 0 
    ? ((analytics.clicks / analytics.views) * 100) 
    : 0;

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
        <title>Analytics - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Track your profile performance and link engagement
          </Typography>


          {!analytics?.views && !analytics?.clicks && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Analytics will be available once your profile receives visits and clicks
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Total Views Card */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'primary.light',
                        mr: 2,
                      }}
                    >
                      <ViewsIcon sx={{ color: 'primary.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      Profile Views
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700}>
                    {analytics?.views || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Total profile visits
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Total Clicks Card */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'secondary.light',
                        mr: 2,
                      }}
                    >
                      <ClicksIcon sx={{ color: 'secondary.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      Link Clicks
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700}>
                    {analytics?.clicks || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Total link engagements
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Click-Through Rate Card */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        bgcolor: 'success.light',
                        mr: 2,
                      }}
                    >
                      <TrendingIcon sx={{ color: 'success.main' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                      CTR
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700}>
                    {clickThroughRate?.toFixed(1) || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Click-through rate
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Links */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Top Performing Links
                  </Typography>
                  {analytics?.topLinks && analytics.topLinks.length > 0 ? (
                    <Stack spacing={2} mt={2}>
                      {analytics.topLinks.slice(0, 5).map((link, index) => (
                        <Box
                          key={index}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          p={2}
                          sx={{ bgcolor: 'grey.50', borderRadius: 1 }}
                        >
                          <Box display="flex" alignItems="center" gap={2}>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              sx={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                color: 'white',
                              }}
                            >
                              {index + 1}
                            </Typography>
                            <Typography fontWeight={500}>{link.title}</Typography>
                          </Box>
                          <Typography variant="h6" fontWeight={600} color="primary">
                            {link.clicks}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">
                        No link clicks yet
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Recent Activity
                  </Typography>
                  <Box textAlign="center" py={4}>
                    <Typography color="text.secondary">
                      No recent activity
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </AdminLayout>
    </>
  );
}
