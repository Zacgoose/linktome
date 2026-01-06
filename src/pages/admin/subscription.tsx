import { useState } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  Stack,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  Diamond as DiamondIcon,
  Business as BusinessIcon,
  CardMembership as CardIcon,
  Cancel as CancelIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
import { UserTier, TIER_CONFIG, TIER_INFO } from '@/types/tiers';
import TierBadge from '@/components/TierBadge';

interface SubscriptionInfo {
  currentTier: UserTier;
  status: 'active' | 'cancelled' | 'expired';
  subscriptionStartedAt?: string;
  billingCycle?: 'monthly' | 'annual';
  nextBillingDate?: string;
  amount?: number;
  currency?: string;
  cancelledAt?: string;
}

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

export default function SubscriptionPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<UserTier | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const { data: subscription, isLoading, error: fetchError, refetch } = useApiGet<SubscriptionInfo>({
    url: 'admin/GetSubscription',
    queryKey: 'user-subscription',
  });

  const upgradePlan = useApiPost({
    onSuccess: (data) => {
      // The API returns a note about payment processing not being implemented
      setSuccess(data?.message || 'Subscription upgrade requested. Payment processing is not yet implemented. Please contact support.');
      setUpgradeDialogOpen(false);
      refetch();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to upgrade subscription');
      setTimeout(() => setError(''), 5000);
    },
  });

  const cancelSubscription = useApiPost({
    onSuccess: (data) => {
      // The API returns a note about payment processing not being implemented
      setSuccess(data?.message || 'Subscription cancellation requested. Payment processing is not yet implemented. Please contact support.');
      setCancelDialogOpen(false);
      refetch();
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to cancel subscription');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleUpgrade = (tier: UserTier) => {
    setSelectedPlan(tier);
    setUpgradeDialogOpen(true);
  };

  const confirmUpgrade = () => {
    if (!selectedPlan) return;

    upgradePlan.mutate({
      url: 'admin/UpgradeSubscription',
      data: {
        tier: selectedPlan,
      },
    });
  };

  const handleCancelSubscription = () => {
    cancelSubscription.mutate({
      url: 'admin/CancelSubscription',
      data: {},
    });
  };

  const getPlanFeatures = (tier: UserTier): PlanFeature[] => {
    const limits = TIER_CONFIG[tier];
    return [
      {
        name: 'Links',
        included: true,
        limit: limits.maxLinks === -1 ? 'Unlimited' : `Up to ${limits.maxLinks}`,
      },
      {
        name: 'Link Groups',
        included: true,
        limit: limits.maxLinkGroups === -1 ? 'Unlimited' : `Up to ${limits.maxLinkGroups}`,
      },
      {
        name: 'Custom Themes',
        included: limits.customThemes,
      },
      {
        name: 'Premium Fonts',
        included: limits.premiumFonts,
      },
      {
        name: 'Custom Logos',
        included: limits.customLogos,
      },
      {
        name: 'Video Backgrounds',
        included: limits.videoBackgrounds,
      },
      {
        name: 'Link Animations',
        included: limits.linkAnimations,
      },
      {
        name: 'Link Scheduling',
        included: limits.linkScheduling,
      },
      {
        name: 'Advanced Analytics',
        included: limits.advancedAnalytics,
      },
      {
        name: 'Analytics Export',
        included: limits.analyticsExport,
      },
      {
        name: 'API Access',
        included: limits.apiAccess,
      },
      {
        name: 'Custom Domain',
        included: limits.customDomain,
      },
      {
        name: 'Remove Footer',
        included: limits.removeFooter,
      },
      {
        name: 'Priority Support',
        included: limits.prioritySupport,
      },
      {
        name: 'White Label',
        included: limits.whiteLabel,
      },
    ];
  };

  const getTierIcon = (tier: UserTier) => {
    switch (tier) {
      case UserTier.PRO:
        return <StarIcon />;
      case UserTier.PREMIUM:
        return <DiamondIcon />;
      case UserTier.ENTERPRISE:
        return <BusinessIcon />;
      default:
        return <CardIcon />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </Container>
      </AdminLayout>
    );
  }

  if (fetchError || !subscription) {
    return (
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">
            Failed to load subscription information. Please try again later.
          </Alert>
        </Container>
      </AdminLayout>
    );
  }

  const currentTier = subscription.currentTier;
  const tierInfo = TIER_INFO[currentTier];

  return (
    <>
      <Head>
        <title>Subscription Management - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
            Subscription Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            Manage your subscription plan and billing information
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

          {/* Current Subscription Card */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Current Subscription
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <TierBadge tier={currentTier} size="large" />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {tierInfo.displayName} Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tierInfo.description}
                  </Typography>
                </Box>
              </Box>

              {subscription.status && (
                <Stack spacing={2}>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Chip
                      label={subscription.status.toUpperCase()}
                      color={
                        subscription.status === 'active'
                          ? 'success'
                          : subscription.status === 'cancelled'
                          ? 'warning'
                          : 'error'
                      }
                    />
                    {subscription.billingCycle && (
                      <Chip
                        label={subscription.billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                        variant="outlined"
                      />
                    )}
                  </Box>

                  {subscription.subscriptionStartedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Member since: <strong>{new Date(subscription.subscriptionStartedAt).toLocaleDateString()}</strong>
                    </Typography>
                  )}

                  {subscription.nextBillingDate && subscription.status === 'active' && (
                    <Typography variant="body2" color="text.secondary">
                      Next billing date: <strong>{new Date(subscription.nextBillingDate).toLocaleDateString()}</strong>
                      {subscription.amount && subscription.currency && (
                        <> - ${subscription.amount.toFixed(2)} {subscription.currency}</>
                      )}
                    </Typography>
                  )}

                  {subscription.cancelledAt && (
                    <Alert severity="warning">
                      Subscription cancelled on {new Date(subscription.cancelledAt).toLocaleDateString()}.
                      {subscription.nextBillingDate && (
                        <> You can continue using your current plan until {new Date(subscription.nextBillingDate).toLocaleDateString()}.</>
                      )}
                    </Alert>
                  )}

                  {currentTier !== UserTier.FREE && subscription.status === 'active' && !subscription.cancelledAt && (
                    <Box>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        Cancel Subscription
                      </Button>
                    </Box>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <Typography variant="h5" fontWeight={600} gutterBottom color="text.primary" sx={{ mb: 3 }}>
            Available Plans
          </Typography>

          <Grid container spacing={3}>
            {[UserTier.FREE, UserTier.PRO, UserTier.PREMIUM, UserTier.ENTERPRISE].map((tier) => {
              const info = TIER_INFO[tier];
              const features = getPlanFeatures(tier);
              const pricing = info.pricing;
              const isCurrent = tier === currentTier;

              return (
                <Grid item xs={12} md={6} lg={3} key={tier}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: isCurrent ? 2 : 1,
                      borderColor: isCurrent ? 'primary.main' : 'divider',
                      position: 'relative',
                    }}
                  >
                    {isCurrent && (
                      <Chip
                        label="Current Plan"
                        color="primary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                        }}
                      />
                    )}
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        {getTierIcon(tier)}
                        <Typography variant="h6" fontWeight={600}>
                          {info.displayName}
                        </Typography>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {info.description}
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" fontWeight={700}>
                          ${pricing.monthly.toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          per month
                        </Typography>
                        {tier !== UserTier.FREE && (
                          <Typography variant="caption" color="text.secondary">
                            ${pricing.annual.toFixed(2)}/year
                          </Typography>
                        )}
                      </Box>

                      <Divider sx={{ mb: 2 }} />

                      <List dense>
                        {features.slice(0, 6).map((feature, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              {feature.included ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CloseIcon color="disabled" fontSize="small" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={feature.name}
                              secondary={feature.limit}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {!isCurrent && tier !== UserTier.FREE && (
                        <Button
                          variant={tier > currentTier ? 'contained' : 'outlined'}
                          fullWidth
                          startIcon={<UpgradeIcon />}
                          onClick={() => handleUpgrade(tier)}
                          sx={{ mt: 2 }}
                        >
                          {tier > currentTier ? 'Upgrade' : 'Switch Plan'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Feature Comparison */}
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom color="text.primary" sx={{ mb: 3 }}>
              Feature Comparison
            </Typography>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Compare all features across different plans to find the best fit for your needs.
                </Typography>
                <Button variant="outlined" sx={{ mt: 2 }}>
                  View Full Comparison
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Container>

        {/* Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedPlan && `Upgrade to ${TIER_INFO[selectedPlan].displayName}`}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              You are about to upgrade your subscription to the{' '}
              {selectedPlan && TIER_INFO[selectedPlan].displayName} plan.
            </Typography>
            {selectedPlan && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Billing Options:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Monthly: ${TIER_INFO[selectedPlan].pricing.monthly.toFixed(2)}/month
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Annual: ${TIER_INFO[selectedPlan].pricing.annual.toFixed(2)}/year (17% savings)
                </Typography>
              </Box>
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>
              Payment processing is not yet implemented. This will submit your upgrade request, but you will need to contact support to complete the payment.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmUpgrade}
              disabled={upgradePlan.isPending}
            >
              {upgradePlan.isPending ? 'Processing...' : 'Request Upgrade'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Subscription Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Are you sure you want to cancel your subscription?
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Payment processing is not yet implemented. This will submit your cancellation request, but you may need to contact support to confirm the cancellation.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Normally, your subscription would remain active until the end of the current billing period, after which your account would be downgraded to the Free plan.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>Keep Subscription</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCancelSubscription}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? 'Processing...' : 'Request Cancellation'}
            </Button>
          </DialogActions>
        </Dialog>
      </AdminLayout>
    </>
  );
}
