import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, Typography, CircularProgress, Alert } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import axios from 'axios';

export default function ShortLinkRedirect() {
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (!slug || typeof slug !== 'string') {
      return;
    }

    const redirect = async () => {
      try {
        // Make the redirect request
        const response = await axios.get(`/api/public/l?slug=${slug}`, {
          maxRedirects: 0,
          validateStatus: (status) => status === 301 || status === 302 || status < 500,
        });

        // If we get a redirect response with redirectTo
        if (response.data?.redirectTo) {
          window.location.href = response.data.redirectTo;
          return;
        }

        // If we get a 301/302, follow the Location header
        if (response.status === 301 || response.status === 302) {
          const location = response.headers.location;
          if (location) {
            window.location.href = location;
            return;
          }
        }

        // If no redirect happened, show error
        console.error('No redirect URL found');
        
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;

          // Handle specific error cases
          if (status === 404) {
            router.push('/404');
            return;
          }

          if (status === 410) {
            // Link is inactive
            return;
          }

          if (status === 400) {
            // Invalid slug format
            return;
          }

          // For other errors, log and stay on error page
          console.error('Redirect error:', errorData?.error || 'Unknown error');
        }
      }
    };

    redirect();
  }, [slug, router]);

  // Show loading state while redirecting
  if (!slug) {
    return (
      <>
        <Head>
          <title>Invalid Link - LinkToMe</title>
        </Head>
        <Container maxWidth="sm">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Alert severity="error" icon={<WarningIcon />}>
              <Typography variant="h6" gutterBottom>
                Invalid Link
              </Typography>
              <Typography variant="body2">
                This short link is not valid. Please check the URL and try again.
              </Typography>
            </Alert>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Redirecting... - LinkToMe</title>
      </Head>
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            Redirecting...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we redirect you
          </Typography>
        </Box>
      </Container>
    </>
  );
}
