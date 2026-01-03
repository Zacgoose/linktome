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
  Button,
} from '@mui/material';
import {
  Visibility as ViewsIcon,
  TouchApp as ClicksIcon,
  TrendingUp as TrendingIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet } from '@/hooks/useApiQuery';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import UpgradePrompt from '@/components/UpgradePrompt';

interface ClicksByDay {
  date: string;
  count: number;
}

interface ViewsByDay {
  date: string;
  count: number;
}

interface RecentPageView {
  ipAddress: string;
  userAgent: string;
  referrer: string;
  timestamp: string;
}

interface RecentLinkClick {
  linkTitle: string;
  userAgent: string;
  timestamp: string;
  linkUrl: string;
  referrer: string;
  ipAddress: string;
  linkId: string;
}

interface LinkClicksByLink {
  linkId: string;
  clickCount: number;
  linkTitle: string;
  linkUrl: string;
}

interface AnalyticsSummary {
  totalLinkClicks: number;
  uniqueVisitors: number;
  totalPageViews: number;
}

interface AnalyticsData {
  clicksByDay: ClicksByDay[];
  recentPageViews: RecentPageView[];
  linkClicksByLink: LinkClicksByLink[];
  summary: AnalyticsSummary;
  viewsByDay: ViewsByDay[];
  recentLinkClicks: RecentLinkClick[];
}

// The API response is now the AnalyticsData object directly, not wrapped in a summary property
type AnalyticsResponse = AnalyticsData;

export default function AnalyticsPage() {
  const { canAccess, showUpgrade, upgradeInfo, closeUpgradePrompt, openUpgradePrompt, userTier } = useFeatureGate();

  const { data: analytics, isLoading } = useApiGet<AnalyticsResponse>({
    url: 'admin/GetAnalytics',
    queryKey: 'admin-analytics',
  });

  const analyticsExportCheck = canAccess('analyticsExport');
  const advancedAnalyticsCheck = canAccess('advancedAnalytics');

  // Function to export analytics data
  const handleExportAnalytics = () => {
    if (!analyticsExportCheck.allowed) {
      openUpgradePrompt('Analytics Export', analyticsExportCheck.requiredTier);
      return;
    }

    if (!analytics) return;

    // Convert analytics data to CSV
    const csvData = [
      // Summary data
      ['Summary'],
      ['Total Page Views', analytics.summary.totalPageViews],
      ['Total Link Clicks', analytics.summary.totalLinkClicks],
      ['Unique Visitors', analytics.summary.uniqueVisitors],
      [''],
      // Views by day
      ['Views by Day'],
      ['Date', 'Views'],
      ...analytics.viewsByDay.map(v => [v.date, v.count]),
      [''],
      // Clicks by day
      ['Clicks by Day'],
      ['Date', 'Clicks'],
      ...analytics.clicksByDay.map(c => [c.date, c.count]),
      [''],
      // Link performance
      ['Link Performance'],
      ['Link Title', 'Link URL', 'Click Count'],
      ...analytics.linkClicksByLink.map(l => [l.linkTitle, l.linkUrl, l.clickCount]),
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linktome-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate click-through rate using summary fields
  let clickThroughRateDisplay = '0.0';
  if (analytics && analytics.summary.totalPageViews > 0) {
    const ctr = (analytics.summary.totalLinkClicks / analytics.summary.totalPageViews) * 100;
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track your profile performance and link engagement
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportAnalytics}
              disabled={!analytics || isLoading}
            >
              Export Data
            </Button>
          </Box>


          {!analytics?.summary.totalPageViews && !analytics?.summary.totalLinkClicks && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Analytics will be available once your profile receives visits and clicks
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Total Views Card */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2} gap={2}>
                    <ViewsIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      Profile Views
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700}>
                    {analytics?.summary.totalPageViews || 0}
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
                  <Box display="flex" alignItems="center" mb={2} gap={2}>
                      <ClicksIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" fontWeight={600}>
                      Link Clicks
                    </Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700}>
                    {analytics?.summary.totalLinkClicks || 0}
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
                  <Box display="flex" alignItems="center" mb={2} gap={2}>
                      <TrendingIcon sx={{ color: 'success.main' }} />
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

            {/* Advanced Analytics Section - Pro+ Only */}
            {advancedAnalyticsCheck.allowed ? (
              <>
                {/* Top Links */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ bgcolor: (theme) => theme.palette.background.paper }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
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
                              sx={{ bgcolor: (theme) => theme.palette.background.default, borderRadius: 1 }}
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
                                <Typography fontWeight={500} color="text.primary">{link.linkTitle + " (" + link.linkUrl + ")"}</Typography>
                              </Box>
                              <Typography variant="h6" fontWeight={600} color="primary">
                                {link.clickCount}
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
                  <Card sx={{ bgcolor: (theme) => theme.palette.background.paper }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary">
                        Recent Link Clicks
                      </Typography>
                      {analytics?.recentLinkClicks && analytics.recentLinkClicks.length > 0 ? (
                        <Stack spacing={2} mt={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                          {analytics.recentLinkClicks.slice(0, 10).map((click) => (
                            <Box
                              key={click.linkId + click.timestamp}
                              p={2}
                              sx={{ bgcolor: (theme) => theme.palette.background.default, borderRadius: 1 }}
                            >
                              <Typography fontWeight={600} gutterBottom color="text.primary">
                                {click.linkTitle + " (" + click.linkUrl + ")"}
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
                            {(() => {
                              const maxClicks = Math.max(...analytics.clicksByDay!.map(d => d.count));
                              return analytics.clicksByDay.map((day) => {
                                const widthPercent = maxClicks > 0 
                                  ? Math.min((day.count / maxClicks) * 100, 100)
                                  : 0;
                                return (
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
                                          width: `${widthPercent}%`,
                                          transition: 'width 0.3s ease',
                                        }}
                                      />
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      sx={{ minWidth: 40, textAlign: 'right' }}
                                    >
                                      {day.count}
                                    </Typography>
                                  </Box>
                                );
                              });
                            })()}
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
              </>
            ) : (
              // Free tier - Show upgrade prompt for advanced analytics
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Upgrade to Pro to unlock advanced analytics including:
                    </Alert>
                    <Stack spacing={1} sx={{ pl: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        • Top performing links analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Recent link clicks tracking
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Clicks over time visualization
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Extended analytics retention (90 days vs 30 days)
                      </Typography>
                    </Stack>
                    <Button
                      variant="contained"
                      sx={{ mt: 3 }}
                      onClick={() => openUpgradePrompt('Advanced Analytics', advancedAnalyticsCheck.requiredTier)}
                    >
                      Upgrade to Pro
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          {/* Upgrade Prompt */}
          {showUpgrade && upgradeInfo && (
            <UpgradePrompt
              open={showUpgrade}
              onClose={closeUpgradePrompt}
              feature={upgradeInfo.feature}
              requiredTier={upgradeInfo.requiredTier!}
              currentTier={upgradeInfo.currentTier}
            />
          )}
        </Container>
      </AdminLayout>
    </>
  );
}
