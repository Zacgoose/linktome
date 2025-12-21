import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Avatar, 
  Typography, 
  Button,
  Stack,
  CircularProgress 
} from '@mui/material';
import { useApiGet } from '@/hooks/useApiQuery';

interface Link {
  title: string;
  url: string;
}

interface ProfileResponse {
  profile: {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    links: Link[];
  };
}

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  
  const [error, setError] = useState('');

  const { data, isLoading } = useApiGet<ProfileResponse>({
    url: 'public/GetUserProfile',
    queryKey: `public-profile-${username}`,
    params: { username: username as string },
    enabled: !!username,
    retry: 0, // Don't retry for public profiles
    onError: (error) => {
      setError(error);
    },
  });

  const profile = data?.profile;

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Profile Not Found
              </Typography>
              <Typography color="text.secondary" paragraph>
                {error}
              </Typography>
              <Button variant="contained" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>{profile.displayName} - LinkToMe</title>
        <meta name="description" content={profile.bio} />
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Card elevation={4}>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Avatar
                src={profile.avatarUrl}
                alt={profile.displayName}
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mx: 'auto', 
                  mb: 3,
                  border: 4,
                  borderColor: 'primary.main'
                }}
              />
              
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {profile.displayName}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                @{profile.username}
              </Typography>
              
              {profile.bio && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
                  {profile.bio}
                </Typography>
              )}
              
              <Stack spacing={2}>
                {profile.links && profile.links.map((link, index) => (
                  <Button
                    key={index}
                    variant="contained"
                    size="large"
                    fullWidth
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.title}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}