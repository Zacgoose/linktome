import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack, 
  Grid,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import {
  Link as LinkIcon,
  BarChart as AnalyticsIcon,
  Palette as CustomizeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Devices as DevicesIcon,
} from '@mui/icons-material';

const features = [
  {
    icon: LinkIcon,
    title: 'Unlimited Links',
    description: 'Add as many links as you want. No restrictions, no limits.',
  },
  {
    icon: AnalyticsIcon,
    title: 'Analytics & Insights',
    description: 'Track clicks, views, and engagement with detailed analytics.',
  },
  {
    icon: CustomizeIcon,
    title: 'Full Customization',
    description: 'Customize your page with themes, colors, and button styles.',
  },
  {
    icon: SpeedIcon,
    title: 'Lightning Fast',
    description: 'Optimized for speed. Your page loads instantly.',
  },
  {
    icon: SecurityIcon,
    title: 'Secure & Private',
    description: 'Your data is encrypted and secure. We respect your privacy.',
  },
  {
    icon: DevicesIcon,
    title: 'Mobile Optimized',
    description: 'Looks perfect on all devices - desktop, tablet, and mobile.',
  },
];

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
        <title>LinkToMe - Your Link in Bio Alternative</title>
        <meta name="description" content="Create your personalized link-in-bio page. Share all your important links in one place." />
      </Head>
      
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            top: '-250px',
            right: '-250px',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            bottom: '-150px',
            left: '-150px',
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box>
                <Typography 
                  variant="h1" 
                  color="white" 
                  fontWeight={800} 
                  mb={3}
                  sx={{ 
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    lineHeight: 1.2,
                  }}
                >
                  One Link For Everything
                </Typography>
                <Typography 
                  variant="h5" 
                  color="rgba(255,255,255,0.9)" 
                  mb={5}
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.3rem' } }}
                >
                  Share your content, grow your audience, and track your success - all from one simple link.
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={4}>
                  <Button 
                    variant="contained"
                    size="large"
                    sx={{ 
                      bgcolor: 'white', 
                      color: 'primary.main',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)', transform: 'translateY(-2px)' },
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => router.push('/login?signup=true')}
                  >
                    Get Started Free
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    sx={{ 
                      borderColor: 'white',
                      borderWidth: 2,
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      '&:hover': { 
                        borderColor: 'white', 
                        borderWidth: 2,
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => router.push('/public/demo')}
                  >
                    View Demo
                  </Button>
                </Stack>

                <Typography variant="body2" color="rgba(255,255,255,0.7)">
                  ✓ Free forever  ✓ No credit card required  ✓ Setup in 2 minutes
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  bgcolor: 'white',
                  borderRadius: 4,
                  p: 4,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  transform: { md: 'translateY(0)' },
                }}
              >
                <Box textAlign="center" mb={3}>
                  <Avatar
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      mx: 'auto', 
                      mb: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    <Typography variant="h4" color="white" fontWeight={700}>
                      LT
                    </Typography>
                  </Avatar>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    @yourname
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Content Creator & Influencer
                  </Typography>
                </Box>
                
                <Stack spacing={2}>
                  {['🌐 My Website', '📱 Instagram', '🎥 YouTube', '💼 LinkedIn'].map((link, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'grey.100',
                        textAlign: 'center',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'grey.200',
                          transform: 'scale(1.02)',
                        },
                      }}
                    >
                      {link}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={8}>
            <Typography 
              variant="h2" 
              fontWeight={700} 
              gutterBottom
              sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}
            >
              Everything You Need
            </Typography>
            <Typography variant="h6" color="text.secondary" maxWidth="md" mx="auto">
              Powerful features to help you share your links and grow your online presence
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.3s ease',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                      }}
                    >
                      <feature.icon sx={{ color: 'white', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <Typography 
              variant="h2" 
              fontWeight={700} 
              gutterBottom
              sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}
            >
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" mb={5} sx={{ opacity: 0.9 }}>
              Join thousands of creators sharing their links with LinkToMe
            </Typography>
            <Button
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={() => router.push('/login?signup=true')}
            >
              Create Your Free Page
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, bgcolor: 'grey.900', color: 'white' }}>
        <Container maxWidth="lg">
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            justifyContent="space-between" 
            alignItems="center"
            spacing={2}
          >
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              © 2024 LinkToMe. All rights reserved.
            </Typography>
            <Stack direction="row" spacing={3}>
              <Button 
                sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}
                onClick={() => router.push('/login')}
              >
                Login
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}