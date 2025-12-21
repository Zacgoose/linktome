import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, Typography, Button, Stack } from '@mui/material';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>LinkToMe - Your Link in Bio</title>
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography variant="h1" color="white" fontWeight={700} mb={2}>
              LinkToMe
            </Typography>
            <Typography variant="h5" color="rgba(255,255,255,0.8)" mb={6}>
              One link to rule them all
            </Typography>
            
            <Stack direction="row" spacing={2} justifyContent="center" mb={6}>
              <Button 
                variant="outlined" 
                size="large"
                sx={{ 
                  borderColor: 'white', 
                  color: 'white',
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
                onClick={() => router.push('/login')}
              >
                Login
              </Button>
              <Button 
                variant="contained"
                size="large"
                sx={{ 
                  bgcolor: 'white', 
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                }}
                onClick={() => router.push('/login?signup=true')}
              >
                Sign Up Free
              </Button>
            </Stack>

            <Box mt={4}>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" mb={1}>
                Try it out:
              </Typography>
              <Button
                variant="text"
                sx={{ color: 'white' }}
                onClick={() => router.push('/public/demo')}
              >
                View Demo Profile
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}