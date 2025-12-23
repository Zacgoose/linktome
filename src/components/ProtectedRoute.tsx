import { useRouter } from 'next/router';
import { useEffect, ReactNode } from 'react';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
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
  const { user, loading } = useAuth();
  const { contextRoles, contextPermissions } = useRbacContext();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [loading, user, router]);

  // Show fallback while checking authentication
  if (loading) {
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

  // Not authenticated
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
            You don't have the required role to access this page.
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
            You don't have the required permissions to access this page.
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
