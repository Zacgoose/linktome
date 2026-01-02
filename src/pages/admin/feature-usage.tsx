import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Block as BlockIcon,
  TrendingUp as TrendingIcon,
  DeleteOutline as ClearIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';
import TierBadge from '@/components/TierBadge';
import { getFeatureUsageStats, getFeatureUsageLog, clearFeatureUsageLog } from '@/utils/featureGate';
import { getTierLimits, parseTier } from '@/utils/tierValidation';
import { useState, useEffect } from 'react';

export default function FeatureUsagePage() {
  const { user } = useAuthContext();
  const [stats, setStats] = useState(getFeatureUsageStats(user?.UserId));
  const [log, setLog] = useState(getFeatureUsageLog());

  const userTier = parseTier(user?.tier);
  const tierLimits = getTierLimits(userTier);

  const refreshStats = () => {
    setStats(getFeatureUsageStats(user?.UserId));
    setLog(getFeatureUsageLog());
  };

  const handleClearLog = () => {
    if (confirm('Are you sure you want to clear the feature usage log?')) {
      clearFeatureUsageLog();
      refreshStats();
    }
  };

  useEffect(() => {
    refreshStats();
  }, [user?.UserId]);

  return (
    <>
      <Head>
        <title>Feature Usage - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                Feature Usage Tracking
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track your usage of premium features and tier restrictions
              </Typography>
            </Box>
            <Box display="flex" gap={2} alignItems="center">
              <TierBadge tier={user?.tier} size="medium" />
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearLog}
                disabled={log.length === 0}
              >
                Clear Log
              </Button>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              This page tracks your feature usage attempts. When you try to use a premium feature, it will be logged here.
              This helps you understand which features you're using and what might benefit you in a higher tier.
            </Typography>
          </Alert>

          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <TrendingIcon sx={{ color: 'primary.main', fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.totalAttempts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Attempts
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <SuccessIcon sx={{ color: 'success.main', fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.successfulAttempts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Successful Uses
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BlockIcon sx={{ color: 'error.main', fontSize: 40 }} />
                    <Box>
                      <Typography variant="h4" fontWeight={700}>
                        {stats.blockedAttempts}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Blocked Attempts
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Current Tier Limits */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Your Current Tier Limits
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Max Links
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {tierLimits.maxLinks === -1 ? 'Unlimited' : tierLimits.maxLinks}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Max Link Groups
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {tierLimits.maxLinkGroups === -1 ? 'Unlimited' : tierLimits.maxLinkGroups}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Analytics Retention
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {tierLimits.analyticsRetentionDays === -1 ? 'Unlimited' : `${tierLimits.analyticsRetentionDays} days`}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Most Used Features */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Most Used Features
                  </Typography>
                  {stats.mostUsedFeatures.length === 0 ? (
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary">No features used yet</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Feature</TableCell>
                            <TableCell align="right">Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stats.mostUsedFeatures.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.feature}</TableCell>
                              <TableCell align="right">
                                <Chip label={item.count} color="success" size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Blocked Features
                  </Typography>
                  {stats.blockedFeatures.length === 0 ? (
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary">No blocked attempts</Typography>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Feature</TableCell>
                            <TableCell align="right">Count</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {stats.blockedFeatures.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.feature}</TableCell>
                              <TableCell align="right">
                                <Chip label={item.count} color="error" size="small" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Activity Log */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Feature Usage Log
              </Typography>
              {log.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary">No feature usage recorded yet</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Feature</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Tier</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {log.slice().reverse().slice(0, 20).map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{entry.feature}</TableCell>
                          <TableCell>
                            <Chip
                              icon={entry.success ? <SuccessIcon /> : <BlockIcon />}
                              label={entry.success ? 'Success' : 'Blocked'}
                              color={entry.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <TierBadge tier={entry.tier} size="small" showIcon={false} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
