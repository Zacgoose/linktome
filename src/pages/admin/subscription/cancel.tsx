import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Dashboard as DashboardIcon,
  CardMembership as SubscriptionIcon,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Payment Cancelled - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Card sx={{ textAlign: 'center' }}>
            <CardContent sx={{ p: 6 }}>
              <CancelIcon 
                sx={{ 
                  fontSize: 80, 
                  color: 'warning.main',
                  mb: 3,
                }} 
              />
              
              <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                Payment Cancelled
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Your payment was cancelled and no charges were made to your account.
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                If you encountered any issues during the payment process or have questions,
                please don't hesitate to contact our support team.
              </Typography>

              <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<SubscriptionIcon />}
                  onClick={() => router.push('/admin/subscription')}
                  size="large"
                >
                  View Plans
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DashboardIcon />}
                  onClick={() => router.push('/admin/dashboard')}
                  size="large"
                >
                  Go to Dashboard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
