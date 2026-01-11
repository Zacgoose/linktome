import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Warning as WarningIcon, Block as BlockIcon } from '@mui/icons-material';
import axios from 'axios';

export default function ShortLinkRedirect() {
  const router = useRouter();
  const { slug } = router.query;
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

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
        setError({
          title: 'Redirect Failed',
          message: 'Unable to redirect to the target URL. Please try again later.',
        });
        
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const errorData = error.response?.data;

          // Handle specific error cases
          if (status === 404) {
            setError({
              title: 'Link Not Found',
              message: 'This short link does not exist or has been deleted.',
            });
            return;
          }

          if (status === 410) {
            setError({
              title: 'Link Inactive',
              message: 'This short link is no longer active.',
            });
            return;
          }

          if (status === 400) {
            setError({
              title: 'Invalid Link',
              message: 'The short link format is invalid.',
            });
            return;
          }

          // For other errors, show generic error
          setError({
            title: 'Error',
            message: errorData?.error || 'An unexpected error occurred. Please try again later.',
          });
        } else {
          setError({
            title: 'Error',
            message: 'An unexpected error occurred. Please try again later.',
          });
        }
      }
    };

    redirect();
  }, [slug, router]);

  // Show error state
  if (error) {
    return (
      <>
        <Head>
          <title>{error.title} - LinkToMe</title>
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
            <Box sx={{ textAlign: 'center' }}>
              <BlockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight={600}>
                {error.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {error.message}
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/')}
                sx={{ mt: 2 }}
              >
                Go to Home
              </Button>
            </Box>
          </Box>
        </Container>
      </>
    );
  }

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
