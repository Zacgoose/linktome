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
} from '@mui/material';
import { useApiGet } from '@/hooks/useApiQuery';
import axios from 'axios';

interface Link {
  title: string;
  url: string;
  id?: string;
  order?: number;
  active?: boolean;
  icon?: string;
}

interface PublicProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
  links: Link[];
  appearance?: {
    theme: string;
    buttonStyle: string;
    fontFamily: string;
    layoutStyle: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      buttonBackground: string;
      buttonText: string;
    };
    customGradient?: {
      start: string;
      end: string;
    };
  };
}

// Helper function to get background gradient
const getBackgroundGradient = (appearance?: PublicProfile['appearance']) => {
  if (!appearance) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  
  const { theme, customGradient } = appearance;
  
  if (theme === 'custom' && customGradient) {
    return `linear-gradient(135deg, ${customGradient.start} 0%, ${customGradient.end} 100%)`;
  }
  
  const themeGradients: Record<string, string> = {
    light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    dark: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    sunset: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
    ocean: 'linear-gradient(135deg, #48c6ef 0%, #6f86d6 100%)',
    forest: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  };
  
  return themeGradients[theme] || themeGradients.light;
};

// Helper function to get font family
const getFontFamily = (fontFamily?: string) => {
  const fontFamilies: Record<string, string> = {
    default: 'Inter, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Courier New, monospace',
    poppins: 'Poppins, sans-serif',
    roboto: 'Roboto, sans-serif',
  };
  
  return fontFamilies[fontFamily || 'default'] || fontFamilies.default;
};

// Helper function to get button border radius
const getButtonBorderRadius = (buttonStyle?: string) => {
  const borderRadii: Record<string, string> = {
    rounded: '8px',
    square: '0px',
    pill: '50px',
  };
  
  return borderRadii[buttonStyle || 'rounded'] || borderRadii.rounded;
};


export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;

  const { data: profile, isLoading, error } = useApiGet<PublicProfile>({
    url: 'public/GetUserProfile',
    queryKey: `public-profile-${username}`,
    params: { username: username as string },
    enabled: !!username,
  });

  const handleLinkClick = async (linkId: string | undefined, url: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Track the click only if linkId is available
    if (linkId) {
      try {
        await axios.post('/api/public/TrackLinkClick', {
          linkId,
          username: username as string,
        });
      } catch (error) {
        // Log error but don't block navigation
        console.error('Failed to track link click:', error);
      }
    }
    
    // Navigate to the URL
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Filter to show only active links
  const activeLinks = profile?.links?.filter(link => link.active !== false) || [];

  // Don't render anything until router is ready and data is loaded or errored
  // This prevents any flash of loading states or intermediate UI
  if (!router.isReady || isLoading || !username) {
    return null;
  }

  // Show "not found" only after data fetch is complete and no profile exists
  if (!profile) {
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
                The profile you are looking for does not exist.
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
        <meta name="theme-color" content="#667eea" />
        {/* Prevent background flash by setting background before React hydrates */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #__next {
              background: ${getBackgroundGradient(profile.appearance)} !important;
              background-attachment: fixed !important;
              margin: 0;
              min-height: 100vh;
            }
            /* Override globals.css and prevent any background flashing */
            :root {
              --background: transparent !important;
              --foreground: #ffffff !important;
            }
          `
        }} />
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: getBackgroundGradient(profile.appearance),
          py: 4,
          fontFamily: getFontFamily(profile.appearance?.fontFamily),
        }}
      >
        <Container maxWidth="sm">
          {profile.appearance?.layoutStyle === 'card' ? (
            <Card elevation={4}>
              <CardContent sx={{ p: 5, textAlign: 'center' }}>
                <Avatar
                  src={profile.avatar}
                  alt={profile.displayName}
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mx: 'auto', 
                    mb: 3,
                    border: 4,
                    borderColor: profile.appearance?.colors?.primary || 'primary.main'
                  }}
                />
                
                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: 'text.primary' }}>
                  {profile.displayName}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }} gutterBottom>
                  @{profile.username}
                </Typography>
                
                {profile.bio && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2, mb: 4 }}>
                    {profile.bio}
                  </Typography>
                )}
                
                <Stack spacing={2}>
                  {activeLinks.map((link, index) => (
                    <Button
                      key={link.id || index}
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={(e) => handleLinkClick(link.id, link.url, e)}
                      startIcon={
                        link.icon ? (
                          <Avatar 
                            src={link.icon} 
                            sx={{ width: 24, height: 24 }}
                            variant="rounded"
                          />
                        ) : undefined
                      }
                      sx={{
                        borderRadius: getButtonBorderRadius(profile.appearance?.buttonStyle),
                        bgcolor: profile.appearance?.colors?.buttonBackground || '#667eea',
                        color: profile.appearance?.colors?.buttonText || '#ffffff',
                        '&:hover': {
                          bgcolor: profile.appearance?.colors?.buttonBackground || '#667eea',
                          opacity: 0.9,
                        },
                      }}
                    >
                      {link.title}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                src={profile.avatar}
                alt={profile.displayName}
                sx={{ 
                  width: 120, 
                  height: 120, 
                  mx: 'auto', 
                  mb: 3,
                  border: 4,
                  borderColor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
              
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#ffffff' }}>
                {profile.displayName}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }} gutterBottom>
                @{profile.username}
              </Typography>
              
              {profile.bio && (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 2, mb: 4, maxWidth: '90%', mx: 'auto' }}>
                  {profile.bio}
                </Typography>
              )}
              
              <Stack spacing={2}>
                {activeLinks.map((link, index) => (
                  <Button
                    key={link.id || index}
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={(e) => handleLinkClick(link.id, link.url, e)}
                    startIcon={
                      link.icon ? (
                        <Avatar 
                          src={link.icon} 
                          sx={{ width: 24, height: 24 }}
                          variant="rounded"
                        />
                      ) : undefined
                    }
                    sx={{
                      borderRadius: getButtonBorderRadius(profile.appearance?.buttonStyle),
                      bgcolor: profile.appearance?.colors?.buttonBackground || '#ffffff',
                      color: profile.appearance?.colors?.buttonText || '#667eea',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      '&:hover': {
                        bgcolor: profile.appearance?.colors?.buttonBackground || '#ffffff',
                        opacity: 0.9,
                        boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                      },
                    }}
                  >
                    {link.title}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
}