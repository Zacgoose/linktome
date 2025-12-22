import { useEffect, createElement, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { checkRouteAccess } from '../config/routes';

/**
 * User information with roles and permissions
 */
export interface UserAuth {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  companyId?: string;
}

/**
 * Token information stored in localStorage
 */
interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  user: UserAuth;
}

/**
 * Parse JWT token to extract user information
 * Note: This is for reading claims only, not for validation
 */
function parseJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get stored token information from localStorage
 */
function getStoredAuth(): TokenInfo | null {
  if (typeof window === 'undefined') return null;

  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const userStr = localStorage.getItem('user');

  if (!accessToken || !userStr) return null;

  try {
    const user = JSON.parse(userStr) as UserAuth;
    const jwt = parseJWT(accessToken);
    const expiresAt = jwt?.exp ? (jwt.exp as number) * 1000 : undefined;

    return {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      user,
    };
  } catch {
    return null;
  }
}

/**
 * Normalize roles - handle both string and array formats, and unwrap JSON-encoded strings
 */
function normalizeRoles(roles: string | string[] | unknown): string[] {
  // If roles is already an array
  if (Array.isArray(roles)) {
    return roles.map((role) => {
      // If the role is a JSON-encoded string like "\"user\"", parse it
      if (typeof role === 'string' && role.startsWith('"') && role.endsWith('"')) {
        try {
          return JSON.parse(role);
        } catch {
          return role;
        }
      }
      return String(role);
    });
  }
  
  // If roles is a string (could be JSON-encoded)
  if (typeof roles === 'string') {
    // Try to parse if it looks like JSON
    if (roles.startsWith('"') && roles.endsWith('"')) {
      try {
        const parsed = JSON.parse(roles);
        return [String(parsed)];
      } catch {
        return [roles];
      }
    }
    // If it's a regular string, wrap in array
    return [roles];
  }
  
  // Fallback: return empty array
  return [];
}

/**
 * Store authentication information in localStorage
 */
export function storeAuth(
  accessToken: string,
  user: UserAuth | Record<string, unknown>,
  refreshToken?: string
): void {
  // Normalize the user object to ensure roles is an array
  const normalizedUser: UserAuth = {
    userId: String((user as UserAuth).userId || (user as Record<string, unknown>).userId || ''),
    username: String((user as UserAuth).username || (user as Record<string, unknown>).username || ''),
    email: String((user as UserAuth).email || (user as Record<string, unknown>).email || ''),
    roles: normalizeRoles((user as UserAuth).roles || (user as Record<string, unknown>).roles),
    permissions: Array.isArray((user as UserAuth).permissions) 
      ? (user as UserAuth).permissions 
      : Array.isArray((user as Record<string, unknown>).permissions)
      ? ((user as Record<string, unknown>).permissions as string[])
      : [],
    companyId: (user as UserAuth).companyId || (user as Record<string, unknown>).companyId as string | undefined,
  };
  
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('user', JSON.stringify(normalizedUser));
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
}

/**
 * Clear authentication information from localStorage
 */
export function clearAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
function isTokenExpiringSoon(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return expiresAt - now < fiveMinutes;
}

/**
 * Enhanced authentication hook with RBAC support
 */
export function useAuth() {
  const router = useRouter();
  const [auth, setAuth] = useState<TokenInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const isRefreshingRef = useRef(false);

  // Load auth from localStorage on mount
  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    setLoading(false);
  }, []);

  /**
   * Refresh the access token using the refresh token
   */
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const storedAuth = getStoredAuth();
    if (!storedAuth?.refreshToken || isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      // Call refresh token endpoint
      const response = await fetch('/api/public/RefreshToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedAuth.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken || storedAuth.refreshToken;

        // Update stored tokens
        localStorage.setItem('accessToken', newAccessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Update state
        const updatedAuth = getStoredAuth();
        setAuth(updatedAuth);
        return true;
      }

      // Refresh failed - clear auth and redirect to login
      clearAuth();
      setAuth(null);
      router.push('/login');
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuth();
      setAuth(null);
      router.push('/login');
      return false;
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [router]);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback((): boolean => {
    return !!auth?.accessToken;
  }, [auth]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      return auth?.user.roles.includes(role) || false;
    },
    [auth]
  );

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      return auth?.user.permissions.includes(permission) || false;
    },
    [auth]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      return roles.some((role) => auth?.user.roles.includes(role)) || false;
    },
    [auth]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      return permissions.every((perm) => auth?.user.permissions.includes(perm)) || false;
    },
    [auth]
  );

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = useCallback(
    (path: string): boolean => {
      if (!auth) return false;
      const result = checkRouteAccess(path, auth.user.roles, auth.user.permissions);
      return result.allowed;
    },
    [auth]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    // Optionally call logout endpoint to invalidate refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch('/api/public/Logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore errors during logout
      }
    }

    clearAuth();
    setAuth(null);
    router.push('/login');
  }, [router]);

  // Auto-refresh token if expiring soon
  useEffect(() => {
    if (!auth || !auth.refreshToken) return;

    // Check if token is expiring soon and refresh once
    const checkAndRefresh = async () => {
      // Re-check auth from storage in case it was updated
      const currentAuth = getStoredAuth();
      if (!currentAuth || isRefreshingRef.current) return;
      
      if (isTokenExpiringSoon(currentAuth.expiresAt)) {
        await refreshAccessToken();
      }
    };

    // Check every minute if token needs refresh
    const interval = setInterval(checkAndRefresh, 60000); // 1 minute

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.expiresAt, auth?.refreshToken]);

  return {
    user: auth?.user || null,
    loading,
    isAuthenticated: isAuthenticated(),
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    canAccessRoute,
    logout,
    refreshAccessToken,
  };
}

/**
 * Hook to enforce authentication and route-level permissions
 * Redirects to /login if not authenticated or lacks permissions
 */
export function useRequireAuth(requiredPath?: string) {
  const router = useRouter();
  const auth = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const path = requiredPath || router.pathname;

    if (!token) {
      router.push('/login');
      return;
    }

    // Check route access
    if (auth.user) {
      const access = checkRouteAccess(path, auth.user.roles, auth.user.permissions);
      if (!access.allowed) {
        // User doesn't have access - redirect to dashboard or show error
        console.error(`Access denied to ${path}: ${access.reason}`);
        router.push('/admin/dashboard');
      }
    }

    setIsChecking(false);
  }, [router, auth.user, requiredPath]);

  return { isAuthenticated: auth.isAuthenticated, isChecking, user: auth.user, hasRole: auth.hasRole, hasPermission: auth.hasPermission, hasAnyRole: auth.hasAnyRole, hasAllPermissions: auth.hasAllPermissions, canAccessRoute: auth.canAccessRoute, logout: auth.logout, refreshAccessToken: auth.refreshAccessToken };
}

/**
 * Higher-order component to wrap pages that require authentication
 */
export function withAuth<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { isAuthenticated, isChecking } = useRequireAuth();

    if (isChecking || !isAuthenticated) {
      return null; // Or a loading spinner
    }

    return createElement(WrappedComponent, props);
  };

  return AuthenticatedComponent;
}
