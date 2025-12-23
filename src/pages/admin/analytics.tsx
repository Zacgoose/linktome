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

interface LinkClick {
  id: string;
  linkId: string;
  linkTitle: string;
  timestamp: string;
  userAgent?: string;
  referrer?: string;
}

interface LinkClickCount {
  linkId: string;
  title: string;
  url: string;
  clicks: number;
}

interface ClicksByDay {
  date: string;
  clicks: number;
}

interface AnalyticsData {
  totalPageViews: number;
  clicks: number;
  topLinks: Array<{
    title: string;
    url: string;
    clicks: number;
  }>;
  recentLinkClicks?: LinkClick[];
  linkClicksByLink?: LinkClickCount[];
  clicksByDay?: ClicksByDay[];
}

interface AnalyticsResponse {
  summary: AnalyticsData;
}

export default function AnalyticsPage() {

  const { data, isLoading } = useApiGet<AnalyticsResponse>({
    url: 'admin/GetAnalytics',
    queryKey: 'admin-analytics',
  });

  const analytics: AnalyticsData | undefined = data?.summary;
  let clickThroughRateDisplay = '0.0';
  if (analytics && analytics.totalPageViews > 0) {
    const ctr = (analytics.clicks / analytics.totalPageViews) * 100;
    clickThroughRateDisplay = isFinite(ctr) ? ctr.toFixed(1) : '0.0';
  }

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


          {!analytics?.totalPageViews && !analytics?.clicks && (
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
                    {analytics?.totalPageViews || 0}
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
                    {clickThroughRateDisplay}%
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
                  {analytics?.linkClicksByLink && analytics.linkClicksByLink.length > 0 ? (
                    <Stack spacing={2} mt={2}>
                      {analytics.linkClicksByLink.slice(0, 5).map((link, index) => (
                        <Box
                          key={link.linkId}
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

            {/* Recent Link Clicks */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Recent Link Clicks
                  </Typography>
                  {analytics?.recentLinkClicks && analytics.recentLinkClicks.length > 0 ? (
                    <Stack spacing={2} mt={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                      {analytics.recentLinkClicks.slice(0, 10).map((click) => (
                        <Box
                          key={click.id}
                          p={2}
                          sx={{ bgcolor: 'grey.50', borderRadius: 1 }}
                        >
                          <Typography fontWeight={600} gutterBottom>
                            {click.linkTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(click.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">
                        No recent clicks
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Clicks by Day Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Clicks Over Time (Last 30 Days)
                  </Typography>
                  {analytics?.clicksByDay && analytics.clicksByDay.length > 0 ? (
                    <Box sx={{ mt: 3 }}>
                      <Stack spacing={1}>
                        {analytics.clicksByDay.map((day) => (
                          <Box
                            key={day.date}
                            display="flex"
                            alignItems="center"
                            gap={2}
                          >
                            <Typography
                              variant="body2"
                              sx={{ minWidth: 100, color: 'text.secondary' }}
                            >
                              {new Date(day.date).toLocaleDateString()}
                            </Typography>
                            <Box
                              sx={{
                                flex: 1,
                                height: 24,
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  bgcolor: 'primary.main',
                                  width: `${Math.min((day.clicks / Math.max(...analytics.clicksByDay!.map(d => d.clicks))) * 100, 100)}%`,
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ minWidth: 40, textAlign: 'right' }}
                            >
                              {day.clicks}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <Typography color="text.secondary">
                        No click data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </AdminLayout>
    </>
  );
}
