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
<<<<<<< Updated upstream
  
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
=======

    // Remove mode state, use derivedMode everywhere
  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Show session expired message if redirected
  const sessionExpired = router.query.session === 'expired';
  console.log('[LoginPage] render sessionExpired:', sessionExpired, 'router.query.session:', router.query.session);

  // Remove setMode from useEffect to avoid cascading renders
  // Instead, derive mode directly from router.query.signup
  const derivedMode: 'login' | 'signup' = isSignup ? 'signup' : 'login';

  const loginMutation = useApiPost<LoginResponse>({
    onSuccess: (data: LoginResponse) => {
      if (data.accessToken && data.user) {
        // Normalize user
        const roles: string[] = Array.isArray(data.user.roles)
          ? data.user.roles
          : typeof data.user.roles === 'string'
            ? (() => { try { return JSON.parse(data.user.roles); } catch { return [data.user.roles]; } })()
            : [data.user.roles];
        const permissions: string[] = Array.isArray(data.user.permissions)
          ? data.user.permissions
          : typeof data.user.permissions === 'string'
            ? (() => { try { return JSON.parse(data.user.permissions); } catch { return [data.user.permissions]; } })()
            : [data.user.permissions];
        // Use only userId for id
        const user = {
          ...data.user,
          id: data.user.userId,
          roles,
          permissions
        };
        storeAuth(data.accessToken, user, data.refreshToken);
        setUser(user);
        router.push('/admin/dashboard');
      }
    },
    onError: (error: string) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const signupMutation = useApiPost<SignupResponse>({
    onSuccess: (data: SignupResponse) => {
      if (data.accessToken && data.user) {
        const roles: string[] = Array.isArray(data.user.roles)
          ? data.user.roles
          : typeof data.user.roles === 'string'
            ? (() => { try { return JSON.parse(data.user.roles); } catch { return [data.user.roles]; } })()
            : [data.user.roles];
        const permissions: string[] = Array.isArray(data.user.permissions)
          ? data.user.permissions
          : typeof data.user.permissions === 'string'
            ? (() => { try { return JSON.parse(data.user.permissions); } catch { return [data.user.permissions]; } })()
            : [data.user.permissions];
        const user = {
          ...data.user,
          id: data.user.userId,
          roles,
          permissions
        };
        storeAuth(data.accessToken, user, data.refreshToken);
        setUser(user);
        router.push('/admin/dashboard');
      } else {
        setError('');
        setPassword('');
        alert(`Account created successfully! Welcome, ${data.user.username}. Please log in.`);
      }
    },
    onError: (error: string) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
>>>>>>> Stashed changes
    e.preventDefault();
    setError('');
    setLoading(true);

<<<<<<< Updated upstream
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
=======
      if (derivedMode === 'login') {
      loginMutation.mutate({
        url: 'public/Login',
        data: { email, password },
      });
    } else {
      signupMutation.mutate({
        url: 'public/Signup',
        data: { email, username, password },
      });
>>>>>>> Stashed changes
    }
  };

  return (
    <>
      <Head>
          <title>{derivedMode === 'login' ? 'Login' : 'Sign Up'} - LinkToMe</title>
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
                  {derivedMode === 'login' ? 'Welcome Back' : 'Create Account'}
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
<<<<<<< Updated upstream
                
                {mode === 'signup' && (
=======
                {derivedMode === 'signup' && (
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                
=======
                {!error && sessionExpired && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Your session has expired. Please log in again.
                  </Alert>
                )}
>>>>>>> Stashed changes
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  type="submit"
                  disabled={loading}
                  sx={{ mt: 3 }}
                >
                    {loading ? 'Please wait...' : derivedMode === 'login' ? 'Login' : 'Sign Up'}
                </Button>
              </Box>
              
              <Box textAlign="center" mt={3}>
                <Typography variant="body2" color="text.secondary">
                    {derivedMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <MuiLink
                    component="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault();
                        router.replace({
                          pathname: router.pathname,
                          query: {
                            ...router.query,
                            signup: derivedMode === 'login' ? 'true' : undefined
                          }
                        });
                    }}
                  >
                      {derivedMode === 'login' ? 'Sign Up' : 'Login'}
                  </MuiLink>
                </Typography>
              </Box>
<<<<<<< Updated upstream

              {mode === 'login' && (
=======
              {derivedMode === 'login' && (
>>>>>>> Stashed changes
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