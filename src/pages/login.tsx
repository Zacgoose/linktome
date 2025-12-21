import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography,
  Alert,
  Link as MuiLink
} from '@mui/material';
import { useApiPost } from '@/hooks/useApiQuery';
import { storeAuth, type UserAuth } from '@/hooks/useAuth';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: UserAuth;
}

interface SignupResponse {
  accessToken?: string;
  refreshToken?: string;
  user: UserAuth;
}

export default function Login() {
  const router = useRouter();
  const isSignup = router.query.signup === 'true';
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(isSignup ? 'signup' : 'login');
  }, [isSignup]);

  const loginMutation = useApiPost<LoginResponse>({
    onSuccess: (data) => {
      if (data.accessToken && data.user) {
        // Use centralized auth storage
        storeAuth(data.accessToken, data.user, data.refreshToken);
        router.push('/admin/dashboard');
      }
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const signupMutation = useApiPost<SignupResponse>({
    onSuccess: (data) => {
      if (data.accessToken && data.user) {
        // If tokens are returned on signup, store and redirect
        storeAuth(data.accessToken, data.user, data.refreshToken);
        router.push('/admin/dashboard');
      } else {
        // Otherwise, switch to login mode
        setMode('login');
        setError('');
        setPassword('');
        alert(`Account created successfully! Welcome, ${data.user.username}. Please log in.`);
      }
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      loginMutation.mutate({
        url: 'public/Login',
        data: { email, password },
      });
    } else {
      signupMutation.mutate({
        url: 'public/Signup',
        data: { email, username, password },
      });
    }
  };

  const loading = loginMutation.isPending || signupMutation.isPending;

  return (
    <>
      <Head>
        <title>{mode === 'login' ? 'Login' : 'Sign Up'} - LinkToMe</title>
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Card elevation={4}>
            <CardContent sx={{ p: 5 }}>
              <Typography variant="h4" align="center" gutterBottom fontWeight={700}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </Typography>
              
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  margin="normal"
                />
                
                {mode === 'signup' && (
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    margin="normal"
                  />
                )}
                
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  margin="normal"
                />
                
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{ mt: 3 }}
                >
                  {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
                </Button>
              </Box>
              
              <Box textAlign="center" mt={3}>
                <Typography variant="body2" color="text.secondary">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <MuiLink
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode(mode === 'login' ? 'signup' : 'login');
                    }}
                  >
                    {mode === 'login' ? 'Sign Up' : 'Login'}
                  </MuiLink>
                </Typography>
              </Box>

              {mode === 'login' && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="caption" display="block">
                    <strong>Demo credentials:</strong>
                  </Typography>
                  <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                    Email: demo@example.com{'\n'}
                    Password: password123
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}