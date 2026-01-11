
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Warning as WarningIcon, Block as BlockIcon } from '@mui/icons-material';
import { useApiGet } from '@/hooks/useApiQuery';

// Type for the API response
interface ShortLinkRedirectResponse {
  redirectTo?: string;
}

export default function ShortLinkRedirect() {
  const router = useRouter();
  const { slug } = router.query;
  // Error state for UI
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Use the API hook for public endpoint
  const { data, isLoading, error: apiError } = useApiGet<ShortLinkRedirectResponse>({
    url: `public/l`,
    queryKey: 'short-link-redirect',
    params: slug && typeof slug === 'string' ? { slug } : undefined,
    enabled: !!slug && typeof slug === 'string',
    publicEndpoint: true,
    onError: (msg) => {
      if (apiError?.response?.status === 404) {
        setError({ title: 'Link Not Found', message: 'This short link does not exist or has been deleted.' });
      } else if (apiError?.response?.status === 410) {
        setError({ title: 'Link Inactive', message: 'This short link is no longer active.' });
      } else if (apiError?.response?.status === 400) {
        setError({ title: 'Invalid Link', message: 'The short link format is invalid.' });
      } else {
        setError({ title: 'Error', message: msg || 'An unexpected error occurred. Please try again later.' });
      }
    },
  });

  useEffect(() => {
    if (data && data.redirectTo) {
      window.location.href = data.redirectTo;
    }
  }, [data]);

  // Show error state
  if (error) {
    return (
      <>
        <Head>
          <title>{error.title} - LinkToMe</title>
        </Head>
        <Container maxWidth="sm">
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.primary' }}>
            <Box sx={{ textAlign: 'center' }}>
              <BlockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight={600}>{error.title}</Typography>
              <Typography variant="body1" color="text.secondary" paragraph>{error.message}</Typography>
              <Button variant="contained" onClick={() => router.push('/')} sx={{ mt: 2 }}>Go to Home</Button>
            </Box>
          </Box>
        </Container>
      </>
    );
  }

  // Show loading state while redirecting
  if (!slug || isLoading) {
    return (
      <>
        <Head>
          <title>Redirecting... - LinkToMe</title>
        </Head>
        <Container maxWidth="sm">
          <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'text.primary' }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>Redirecting...</Typography>
            <Typography variant="body2" color="text.secondary">Please wait while we redirect you</Typography>
          </Box>
        </Container>
      </>
    );
  }

  // If slug is invalid (not present or not a string)
  if (!slug || typeof slug !== 'string') {
    return (
      <>
        <Head>
          <title>Invalid Link - LinkToMe</title>
        </Head>
        <Container maxWidth="sm">
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.primary' }}>
            <Alert severity="error" icon={<WarningIcon />}>
              <Typography variant="h6" gutterBottom>Invalid Link</Typography>
              <Typography variant="body2">This short link is not valid. Please check the URL and try again.</Typography>
            </Alert>
          </Box>
        </Container>
      </>
    );
  }

  // Fallback UI (should not be reached)
  return null;
}
