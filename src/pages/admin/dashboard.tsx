import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Avatar,
  CircularProgress,
  Grid
} from '@mui/material';
import AdminLayout from '@/layouts/AdminLayout';
import { apiGet } from '@/utils/api';

interface UserProfile {
  userId: string;
  username: string;
  email: string;
  displayName: string;
  bio: string;
  avatar: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const data = await apiGet('admin/GetProfile');
        setProfile(data);
      } catch (err) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (!profile) return null;

  return (
    <>
      <Head>
        <title>Dashboard - LinkToMe</title>
      </Head>
      
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Welcome back, {profile.displayName}!
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Your Profile
                  </Typography>
                  <Box display="flex" alignItems="center" gap={3} mt={2}>
                    <Avatar
                      src={profile.avatar}
                      alt={profile.displayName}
                      sx={{ width: 80, height: 80 }}
                    />
                    <Box>
                      <Typography variant="body2">
                        <strong>Username:</strong> @{profile.username}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Email:</strong> {profile.email}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Display Name:</strong> {profile.displayName}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Quick Actions
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => router.push(`/public/${profile.username}`)}
                  >
                    View Public Profile
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </AdminLayout>
    </>
  );
}