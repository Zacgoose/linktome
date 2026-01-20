import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Dashboard as DashboardIcon,
  CardMembership as SubscriptionIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const { refreshAuth } = useAuthContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Refresh auth to get updated subscription info
    const refreshData = async () => {
      try {
        await refreshAuth();
      } catch (error) {
        console.error('Failed to refresh auth:', error);
      } finally {
        setLoading(false);
      }
    };

    if (router.isReady) {
      refreshData();
    }
  }, [router.isReady, refreshAuth]);

  return (
    <>
      <Head>
        <title>Subscription Successful - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : (
            <Card sx={{ textAlign: 'center' }}>
              <CardContent sx={{ p: 6 }}>
                <CheckCircleIcon 
                  sx={{ 
                    fontSize: 80, 
                    color: 'success.main',
                    mb: 3,
                  }} 
                />
                
                <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                  Payment Successful!
                </Typography>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Thank you for subscribing to LinkToMe. Your payment has been processed successfully,
                  and your account has been upgraded.
                </Typography>

                {session_id && (
                  <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
                    <Typography variant="body2">
                      <strong>Session ID:</strong> {session_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Please save this for your records. You can find your invoice in your subscription management page.
                    </Typography>
                  </Alert>
                )}

                <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    startIcon={<DashboardIcon />}
                    onClick={() => router.push('/admin/dashboard')}
                    size="large"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SubscriptionIcon />}
                    onClick={() => router.push('/admin/subscription')}
                    size="large"
                  >
                    View Subscription
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Container>
      </AdminLayout>
    </>
  );
}
