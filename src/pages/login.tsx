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
import { apiPost } from '@/utils/api';

export default function Login() {
  const router = useRouter();
  const isSignup = router.query.signup === 'true';
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(isSignup ? 'signup' : 'login');
  }, [isSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? 'public/Login' : 'public/Signup';
      const data = mode === 'login' 
        ? { email, password }
        : { email, username, password };

      const response = await apiPost(endpoint, data);
      
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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