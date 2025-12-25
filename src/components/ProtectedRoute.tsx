import { useRouter } from 'next/router';
import { useEffect, ReactNode } from 'react';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useAuthContext } from '@/providers/AuthProvider';
import { useRbacContext } from '@/context/RbacContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallback?: ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Wraps content that requires authentication and/or specific permissions.
 * Automatically redirects to login if not authenticated.
 * Shows access denied if user lacks required permissions.
 * 
 * @param children - Content to render if user has access
 * @param requiredRoles - Array of roles, user must have at least one
 * @param requiredPermissions - Array of permissions, user must have all
 * @param fallback - Custom component to show while checking auth (defaults to spinner)
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, authReady, refreshing } = useAuthContext();
  const { contextRoles, contextPermissions } = useRbacContext();

  useEffect(() => {
    // Debug log for ProtectedRoute effect
    // eslint-disable-next-line no-console
    console.debug('[ProtectedRoute] useEffect', { authReady, user, refreshing, asPath: router.asPath });
    // Wait for AuthProvider to finish before redirecting
    if (authReady && !refreshing && !user) {
      // Only redirect if not already on login
      if (!/^\/login(\/?|\?.*)?$/.test(router.asPath)) {
        router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      }
    }
  }, [authReady, refreshing, user, router]);

  // Always wait for AuthProvider to finish before making any auth decisions
  // Debug log for every render
  // eslint-disable-next-line no-console
  console.debug('[ProtectedRoute] render', { authReady, user, refreshing });

  if (!authReady || refreshing) {
    return fallback || (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated (only after authReady is true)
  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Check role requirements (context-aware)
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.some((role) => contextRoles.includes(role))) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            gap: 2,
            p: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            You don&apos;t have the required role to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required: {requiredRoles.join(' or ')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/admin/dashboard')}
            sx={{ mt: 2 }}
          >
            Go to Dashboard
          </Button>
        </Box>
      );
    }
  }

  // Check permission requirements (context-aware)
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!requiredPermissions.every((perm) => contextPermissions.includes(perm))) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            gap: 2,
            p: 3,
          }}
        >
          <Typography variant="h4" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            You don&apos;t have the required permissions to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required: {requiredPermissions.join(', ')}
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push('/admin/dashboard')}
            sx={{ mt: 2 }}
          >
            Go to Dashboard
          </Button>
        </Box>
      );
    }
  }

  // User has access, render children
  return <>{children}</>;
}
