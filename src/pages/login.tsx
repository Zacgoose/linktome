import React, { useState, useRef } from 'react';
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
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useApiPost } from '@/hooks/useApiQuery';
import { useAuthContext } from '@/providers/AuthProvider';
import type { LoginResponse, TwoFactorVerifyRequest } from '@/types/api';
import TwoFactorAuth from '@/components/TwoFactorAuth';
import TwoFactorSetupPrompt from '@/components/TwoFactorSetupPrompt';
import TwoFactorSetupWizard from '@/components/TwoFactorSetupWizard';

// Use test key in development, real key in production
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthContext();
  const isSignup = router.query.signup === 'true';
  const derivedMode: 'login' | 'signup' = isSignup ? 'signup' : 'login';

  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const turnstileRef = useRef<TurnstileInstance>(null);

  // 2FA state
  const [show2FA, setShow2FA] = useState<boolean>(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp' | 'both'>('email');
  const [twoFactorSessionId, setTwoFactorSessionId] = useState<string>('');
  
  // 2FA setup prompt state
  const [showSetupPrompt, setShowSetupPrompt] = useState<boolean>(false);
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const sessionExpired = router.query.session === 'expired';

  const resetTurnstile = () => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  // 2FA verification mutation
  const verify2FAMutation = useApiPost<LoginResponse>({
    onSuccess: (data: LoginResponse) => {
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // User just completed 2FA verification, so they definitely have 2FA enabled
        // No need to show setup prompt - go straight to dashboard
        router.push('/admin/dashboard');
      }
    },
    onError: (error: string) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  // 2FA resend code mutation
  const resend2FAMutation = useApiPost({
    onSuccess: () => {
      // Success message is handled by the component's cooldown timer
    },
    onError: (error: string) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const loginMutation = useApiPost<LoginResponse>({
    onSuccess: (data: LoginResponse) => {
      // Check if 2FA is required (backend uses requiresTwoFactor)
      const needs2FA = data.requires2FA || data.requiresTwoFactor;
      if (needs2FA && data.sessionId && data.twoFactorMethod) {
        setShow2FA(true);
        setTwoFactorMethod(data.twoFactorMethod);
        setTwoFactorSessionId(data.sessionId);
      } else if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // Check if user should be prompted to setup 2FA
        if (!data.user.twoFactorEnabled) {
          setPendingUser(data.user);
          setShowSetupPrompt(true);
        } else {
          router.push('/admin/dashboard');
        }
      }
    },
    onError: (error: string) => {
      setError(error);
      resetTurnstile(); // Reset on failure so user can retry
      setTimeout(() => setError(''), 5000);
    },
  });

  const signupMutation = useApiPost<LoginResponse>({
    onSuccess: (data: LoginResponse) => {
      // Check if 2FA is required (backend uses requiresTwoFactor)
      const needs2FA = data.requires2FA || data.requiresTwoFactor;
      if (needs2FA && data.sessionId && data.twoFactorMethod) {
        setShow2FA(true);
        setTwoFactorMethod(data.twoFactorMethod);
        setTwoFactorSessionId(data.sessionId);
      } else if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        // Check if user should be prompted to setup 2FA
        if (!data.user.twoFactorEnabled) {
          setPendingUser(data.user);
          setShowSetupPrompt(true);
        } else {
          router.push('/admin/dashboard');
        }
      }
    },
    onError: (error: string) => {
      setError(error);
      resetTurnstile();
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (!turnstileToken) {
      setError('Please complete the security verification');
      return;
    }

    if (derivedMode === 'login') {
      loginMutation.mutate({
        url: 'public/Login',
        data: { email, password, turnstileToken },
      });
    } else {
      signupMutation.mutate({
        url: 'public/Signup',
        data: { email, username, password, turnstileToken },
      });
    }
  };

  const handle2FAVerify = (token: string, type?: 'email' | 'totp' | 'backup') => {
    verify2FAMutation.mutate({
      url: 'public/2fatoken?action=verify',
      data: {
        sessionId: twoFactorSessionId,
        code: token,
        type: type || (twoFactorMethod === 'both' ? 'totp' : twoFactorMethod), // Default to TOTP when both are available (avoid unnecessary emails)
      },
    });
  };

  const handle2FAResend = () => {
    resend2FAMutation.mutate({
      url: 'public/2fatoken?action=resend',
      data: {
        sessionId: twoFactorSessionId,
      },
    });
  };

  const handle2FABack = () => {
    setShow2FA(false);
    setTwoFactorSessionId('');
    setError('');
    resetTurnstile();
  };

  const handleSetup2FA = () => {
    setShowSetupPrompt(false);
    // Show the setup wizard
    setShowSetupWizard(true);
  };

  const handleSkip2FA = () => {
    setShowSetupPrompt(false);
    setPendingUser(null);
    // Continue to dashboard
    router.push('/admin/dashboard');
  };

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
    setPendingUser(null);
    // Continue to dashboard after setup is complete
    router.push('/admin/dashboard');
  };

  const handleSetupCancel = () => {
    setShowSetupWizard(false);
    // Continue to dashboard even if they cancel during setup
    router.push('/admin/dashboard');
  };

  const loading = loginMutation.isPending || signupMutation.isPending || verify2FAMutation.isPending;
  const canSubmit = turnstileToken && !loading && turnstileStatus === 'ready';

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
              {show2FA ? (
                // Show 2FA verification form
                <TwoFactorAuth
                  method={twoFactorMethod === 'both' ? 'totp' : twoFactorMethod}
                  onVerify={handle2FAVerify}
                  onResendEmail={twoFactorMethod === 'email' || twoFactorMethod === 'both' ? handle2FAResend : undefined}
                  loading={verify2FAMutation.isPending}
                  error={error}
                  onBack={handle2FABack}
                />
              ) : (
                // Show login/signup form
                <>
                  <Typography variant="h4" align="center" gutterBottom fontWeight={700}>
                    {derivedMode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </Typography>
                  <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      required
                      margin="normal"
                    />
                    {derivedMode === 'signup' && (
                      <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                        required
                        margin="normal"
                      />
                    )}
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      required
                      margin="normal"
                    />
                    
                    {/* Turnstile Widget */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', minHeight: 65 }}>
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => {
                          setTurnstileToken(token);
                          setTurnstileStatus('ready');
                        }}
                        onError={() => {
                          setTurnstileStatus('error');
                          setError('Security verification failed to load. Please refresh the page.');
                        }}
                        onExpire={() => {
                          setTurnstileToken(null);
                          // Widget auto-refreshes, but we could manually reset if needed
                        }}
                        onLoad={() => {
                          setTurnstileStatus('ready');
                        }}
                        options={{
                          theme: 'light',
                          size: 'normal',
                        }}
                      />
                    </Box>

                    {error && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                      </Alert>
                    )}
                    {!error && sessionExpired && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        Your session has expired. Please log in again.
                      </Alert>
                    )}
                    {turnstileStatus === 'error' && !error && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Security verification unavailable. Please refresh the page.
                      </Alert>
                    )}
                    
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      type="submit"
                      disabled={!canSubmit}
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
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          resetTurnstile(); // Reset when switching modes
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
                  {derivedMode === 'login' && (
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
                </>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
      
      {/* 2FA Setup Prompt */}
      <TwoFactorSetupPrompt
        open={showSetupPrompt}
        onClose={handleSkip2FA}
        onSetup={handleSetup2FA}
        onSkip={handleSkip2FA}
      />
      
      {/* 2FA Setup Wizard */}
      <TwoFactorSetupWizard
        open={showSetupWizard}
        onClose={handleSetupCancel}
        onComplete={handleSetupComplete}
      />
    </>
  );
}