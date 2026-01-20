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
  Upgrade as UpgradeIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
  RadioButtonChecked as RadioCheckedIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
import { UserTier, TIER_CONFIG, TIER_INFO } from '@/types/tiers';
import TierBadge from '@/components/TierBadge';
import type { 
  CreateCheckoutSessionResponse, 
  CreatePortalSessionResponse
} from '@/types/api';

interface SubscriptionInfo {
  currentTier: UserTier;
  effectiveTier: UserTier;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'suspended';
  isTrial: boolean;
  hasAccess: boolean;
  subscriptionStartedAt?: string;
  billingCycle?: 'monthly' | 'annual';
  nextBillingDate?: string;
  amount?: number;
  currency?: string;
  cancelledAt?: string;
  cancelAt?: string;
  accessUntil?: string;
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
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const { data: subscription, isLoading, error: fetchError } = useApiGet<SubscriptionInfo>({
    url: 'admin/GetSubscription',
    queryKey: 'user-subscription',
  });

  const upgradePlan = useApiPost<CreateCheckoutSessionResponse>({
    relatedQueryKeys: ['user-subscription'],
    onSuccess: async (data) => {
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Failed to create checkout session');
        setUpgradeDialogOpen(false);
      }
    },
    onError: (err: any) => {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to create checkout session';
      setError(msg);
      setUpgradeDialogOpen(false);
      setTimeout(() => setError(''), 5000);
    },
  });

  const manageSubscription = useApiPost<CreatePortalSessionResponse>({
    onSuccess: async (data) => {
      // Redirect to Stripe customer portal
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        setError('Failed to open customer portal');
      }
    },
    onError: (err: any) => {
      const msg = typeof err === 'string' ? err : err?.message || 'Failed to open customer portal';
      setError(msg);
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleUpgrade = (tier: UserTier) => {
    setSelectedPlan(tier);
    setSelectedBillingCycle('monthly'); // Reset to monthly as default
    setUpgradeDialogOpen(true);
  };

  const confirmUpgrade = () => {
    if (!selectedPlan) return;

    upgradePlan.mutate({
      url: 'admin/createCheckoutSession',
      data: {
        tier: selectedPlan,
        billingCycle: selectedBillingCycle,
      },
    });
  };

  const handleManageSubscription = () => {
    manageSubscription.mutate({
      url: 'admin/createPortalSession',
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
        name: 'Pages',
        included: true,
        limit: limits.maxPages === -1 ? 'Unlimited' : `Up to ${limits.maxPages}`,
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
  const effectiveTier = subscription.effectiveTier;
  const tierInfo = TIER_INFO[currentTier];
  const effectiveTierInfo = TIER_INFO[effectiveTier];

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
                <TierBadge tier={effectiveTier} size="medium" />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    {tierInfo.displayName} Plan
                  </Typography>
                  {effectiveTier !== currentTier && (
                    <Typography variant="body2" color="text.secondary">
                      Currently using: {effectiveTierInfo.displayName} tier
                    </Typography>
                  )}
                  {!effectiveTier && currentTier && (
                    <Typography variant="body2" color="text.secondary">
                      {tierInfo.description}
                    </Typography>
                  )}
                  {effectiveTier && effectiveTier === currentTier && (
                    <Typography variant="body2" color="text.secondary">
                      {tierInfo.description}
                    </Typography>
                  )}
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
                          : subscription.status === 'trial'
                          ? 'info'
                          : subscription.status === 'cancelled'
                          ? 'warning'
                          : 'error'
                      }
                    />
                    {subscription.isTrial && (
                      <Chip label="TRIAL" color="info" variant="outlined" />
                    )}
                    {subscription.billingCycle && (
                      <Chip
                        label={subscription.billingCycle === 'monthly' ? 'Monthly' : 'Annual'}
                        variant="outlined"
                      />
                    )}
                    {!subscription.hasAccess && (
                      <Chip label="NO ACCESS" color="error" />
                    )}
                  </Box>

                  {subscription.subscriptionStartedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Member since: <strong>{new Date(subscription.subscriptionStartedAt).toLocaleDateString()}</strong>
                    </Typography>
                  )}

                  {subscription.nextBillingDate && subscription.status === 'active' && !subscription.cancelAt && (
                    <Typography variant="body2" color="text.secondary">
                      Next billing date: <strong>{new Date(subscription.nextBillingDate).toLocaleDateString()}</strong>
                      {subscription.amount && subscription.currency && (
                        <> - ${subscription.amount.toFixed(2)} {subscription.currency}</>
                      )}
                    </Typography>
                  )}

                  {subscription.cancelAt && subscription.status === 'active' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Subscription will not renew. Access until <strong>{new Date(subscription.cancelAt).toLocaleDateString()}</strong>
                      {subscription.amount && subscription.currency && (
                        <> (${subscription.amount.toFixed(2)} {subscription.currency})</>
                      )}.
                    </Alert>
                  )}

                  {subscription.cancelledAt && subscription.hasAccess && subscription.accessUntil && (
                    <Alert severity="warning">
                      Subscription cancelled on {new Date(subscription.cancelledAt).toLocaleDateString()}.
                      You can continue using your current plan until {new Date(subscription.accessUntil).toLocaleDateString()}.
                    </Alert>
                  )}
                  
                  {subscription.cancelledAt && !subscription.hasAccess && (
                    <Alert severity="error">
                      Subscription cancelled on {new Date(subscription.cancelledAt).toLocaleDateString()}.
                      {subscription.accessUntil && (
                        <> Access ended on {new Date(subscription.accessUntil).toLocaleDateString()}.</>
                      )}
                    </Alert>
                  )}

                  <Box display="flex" gap={2} flexWrap="wrap">
                    {/* Show Manage Subscription button for any user who has/had a subscription */}
                    {(currentTier !== UserTier.FREE || subscription.subscriptionStartedAt) && (
                      <Button
                        variant="contained"
                        startIcon={<CardIcon />}
                        onClick={handleManageSubscription}
                        disabled={manageSubscription.isPending}
                      >
                        {manageSubscription.isPending ? 'Loading...' : 'Manage Subscription'}
                      </Button>
                    )}
                  </Box>
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
              const isCurrent = tier === effectiveTier;

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

                      {/* Only show upgrade/switch buttons for FREE tier users or if no active subscription */}
                      {!isCurrent && tier !== UserTier.FREE && currentTier === UserTier.FREE && (
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
        </Container>

        {/* Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedPlan && `Upgrade to ${TIER_INFO[selectedPlan].displayName}`}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {`You are about to upgrade your subscription to the ${selectedPlan && TIER_INFO[selectedPlan].displayName} plan.`}
            </Typography>
            {selectedPlan && selectedPlan !== UserTier.FREE && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Select Billing Cycle:
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Card
                    sx={{
                      border: 2,
                      borderColor: selectedBillingCycle === 'monthly' ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedBillingCycle('monthly')}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        {selectedBillingCycle === 'monthly' ? (
                          <RadioCheckedIcon color="primary" />
                        ) : (
                          <RadioUncheckedIcon />
                        )}
                        <Box flexGrow={1}>
                          <Typography variant="body1" fontWeight={600}>
                            Monthly
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Billed monthly
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                          ${TIER_INFO[selectedPlan].pricing.monthly.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card
                    sx={{
                      border: 2,
                      borderColor: selectedBillingCycle === 'annual' ? 'primary.main' : 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedBillingCycle('annual')}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        {selectedBillingCycle === 'annual' ? (
                          <RadioCheckedIcon color="primary" />
                        ) : (
                          <RadioUncheckedIcon />
                        )}
                        <Box flexGrow={1}>
                          <Typography variant="body1" fontWeight={600}>
                            Annual
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Billed yearly - Save 17%
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                          ${TIER_INFO[selectedPlan].pricing.annual.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Stack>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmUpgrade}
              disabled={upgradePlan.isPending}
            >
              {upgradePlan.isPending ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </DialogActions>
        </Dialog>
      </AdminLayout>
    </>
  );
}
