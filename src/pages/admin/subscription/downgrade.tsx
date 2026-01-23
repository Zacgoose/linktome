/**
 * Subscription Downgrade Preview Page
 * 
 * Shows users what will happen when their subscription ends or is cancelled.
 * Allows them to review and confirm the downgrade, or choose which items to keep.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container,
  Typography,
  Button,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import SubscriptionDowngradePreview from '@/components/SubscriptionDowngradePreview';
import { useSubscriptionDowngrade } from '@/hooks/useSubscriptionDowngrade';
import { useApiGet } from '@/hooks/useApiQuery';
import { UserTier } from '@/types/tiers';

interface SubscriptionInfo {
  currentTier: UserTier;
  effectiveTier: UserTier;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'suspended';
  hasAccess: boolean;
  cancelAt?: string;
  accessUntil?: string;
}

export default function SubscriptionDowngradePage() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch subscription info
  const { data: subscription, isLoading: isLoadingSubscription } = useApiGet<SubscriptionInfo>({
    url: 'admin/GetSubscription',
    queryKey: 'user-subscription',
  });

  // Initialize downgrade assessment
  const {
    assessment,
    isLoadingAssessment,
    isExecuting,
    generateAssessment,
    handleDowngrade,
    hasWarnings,
  } = useSubscriptionDowngrade({
    currentTier: subscription?.currentTier || UserTier.FREE,
    targetTier: UserTier.FREE,
  });

  // Generate assessment when subscription data is loaded
  useEffect(() => {
    if (subscription && !isLoadingSubscription) {
      generateAssessment({
        strategy: 'keep-default',
        dryRun: true,
      });
    }
  }, [subscription, isLoadingSubscription, generateAssessment]);

  const handleConfirmDowngrade = (userSelections: {
    pageIds?: string[];
    linkIds?: string[];
    shortLinkSlugs?: string[];
  }) => {
    handleDowngrade(userSelections);
    setShowSuccess(true);
    
    // Redirect to subscription page after a delay
    setTimeout(() => {
      router.push('/admin/subscription');
    }, 3000);
  };

  const handleCancel = () => {
    router.push('/admin/subscription');
  };

  if (isLoadingSubscription || isLoadingAssessment) {
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

  if (!subscription) {
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

  // If user is already on free tier, redirect
  if (subscription.currentTier === UserTier.FREE && subscription.effectiveTier === UserTier.FREE) {
    router.push('/admin/subscription');
    return null;
  }

  return (
    <>
      <Head>
        <title>Subscription Downgrade Preview - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Button
              startIcon={<BackIcon />}
              onClick={handleCancel}
              sx={{ mb: 2 }}
            >
              Back to Subscription
            </Button>
            <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
              Subscription Downgrade Preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review what will happen when your subscription ends or is cancelled.
            </Typography>
          </Box>

          {/* Success Message */}
          {showSuccess && (
            <Alert severity="success" sx={{ mb: 3 }}>
              <AlertTitle>Downgrade Scheduled</AlertTitle>
              Your account downgrade has been scheduled. Redirecting to subscription page...
            </Alert>
          )}

          {/* Context Alert */}
          {subscription.cancelAt && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Subscription Ending</AlertTitle>
              Your subscription will end on {new Date(subscription.cancelAt).toLocaleDateString()}.
              After this date, your account will be downgraded to the free tier.
            </Alert>
          )}

          {subscription.status === 'expired' && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <AlertTitle>Subscription Expired</AlertTitle>
              Your subscription has expired. Your account will be downgraded to the free tier.
            </Alert>
          )}

          {!subscription.cancelAt && subscription.status === 'active' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Considering Cancellation?</AlertTitle>
              This preview shows what will happen if you cancel your subscription.
              You can manage your subscription from the{' '}
              <a href="/admin/subscription" style={{ color: 'inherit', textDecoration: 'underline' }}>
                subscription page
              </a>.
            </Alert>
          )}

          {/* Downgrade Preview */}
          {assessment ? (
            <SubscriptionDowngradePreview
              assessment={assessment}
              onConfirm={handleConfirmDowngrade}
              onCancel={handleCancel}
              showActions={!showSuccess}
            />
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary">
                  Loading downgrade preview...
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {assessment && hasWarnings && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  What happens to my data?
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Removed items are not deleted permanently.</strong> If you upgrade again in the future,
                      items that were removed will be restored automatically.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Export your data.</strong> Before downgrading, you can export your analytics
                      and other data from the respective pages if you have access to those features.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Grace period.</strong> If you have time remaining in your current billing period,
                      you will continue to have access to premium features until the end of that period.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Loading Overlay */}
          {isExecuting && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <Card>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body1">
                    Processing downgrade...
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Container>
      </AdminLayout>
    </>
  );
}
