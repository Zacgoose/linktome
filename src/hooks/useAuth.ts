import { useEffect, createElement, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { checkRouteAccess } from '../config/routes';

/**
 * User information with roles and permissions
 */
export interface CompanyMembership {
  companyId: string;
  companyName?: string;
  role: string;
  permissions: string[];
}

export interface UserAuth {
  userId: string;
  username: string;
  email: string;
  userRole: string; // global role (e.g. 'user', 'admin')
  roles: string[]; // for backward compatibility, always include userRole as first element
  permissions: string[];
  companyMemberships?: CompanyMembership[];
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

  // If user is missing, cannot proceed
  if (!userStr) return null;

  // If accessToken is missing but refreshToken and user are present, allow partial auth for refresh
  if (!accessToken && refreshToken) {
    try {
      const user = JSON.parse(userStr) as UserAuth;
      return {
        accessToken: '',
        refreshToken,
        expiresAt: undefined,
        user,
      };
    } catch {
      return null;
    }
  }
  // If both accessToken and refreshToken are missing, treat as logged out
  if (!accessToken) return null;

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
function normalizeRoles(roles: string | string[] | unknown, userRole?: string): string[] {
  let arr: string[] = [];
  if (Array.isArray(roles)) {
    arr = roles.map((role) => {
      if (typeof role === 'string' && role.startsWith('"') && role.endsWith('"')) {
        try {
          return JSON.parse(role);
        } catch {
          return role;
        }
      }
      return String(role);
    });
  } else if (typeof roles === 'string') {
    if (roles.startsWith('"') && roles.endsWith('"')) {
      try {
        arr = [String(JSON.parse(roles))];
      } catch {
        arr = [roles];
      }
    } else {
      arr = [roles];
    }
  }
  // Always include userRole as first element if provided and not present
  if (userRole && !arr.includes(userRole)) {
    arr.unshift(userRole);
  }
  return arr;
}

/**
 * Store authentication information in localStorage
 */
export function storeAuth(
  accessToken: string,
  user: UserAuth | Record<string, unknown>,
  refreshToken?: string
): void {
  // Normalize the user object to ensure roles is an array and new fields are present
  const userRole = (user as any).userRole || (user as any).role || (Array.isArray((user as any).roles) ? (user as any).roles[0] : 'user');
  const normalizedUser: UserAuth = {
    userId: String((user as any).userId || (user as any).id || ''),
    username: String((user as any).username || ''),
    email: String((user as any).email || ''),
    userRole: String(userRole),
    roles: normalizeRoles((user as any).roles, userRole),
    permissions: Array.isArray((user as any).permissions)
      ? (user as any).permissions
      : Array.isArray((user as any).permissions)
      ? ((user as any).permissions as string[])
      : [],
    companyMemberships: Array.isArray((user as any).companyMemberships)
      ? (user as any).companyMemberships.map((cm: any) => ({
          companyId: String(cm.companyId),
          companyName: cm.companyName,
          role: cm.role,
          permissions: Array.isArray(cm.permissions) ? cm.permissions : [],
        }))
      : undefined,
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
    if (!auth || !auth.refreshToken || !auth.expiresAt) return;

    // Track last refresh time to prevent immediate re-refresh
    let lastRefreshTime = Date.now();

    // Check if token is expiring soon and refresh once
    const checkAndRefresh = async () => {
      // Re-check auth from storage in case it was updated
      const currentAuth = getStoredAuth();
      if (!currentAuth || !currentAuth.expiresAt || isRefreshingRef.current) return;
      
      const now = Date.now();
      const timeUntilExpiry = currentAuth.expiresAt - now;
      const fiveMinutes = 5 * 60 * 1000;
      const oneMinute = 60 * 1000;
      
      // Debug log to help track refresh behavior
      if (process.env.NODE_ENV === 'development') {
        const minutesLeft = Math.floor(timeUntilExpiry / 60000);
        const expiryDate = new Date(currentAuth.expiresAt);
        console.log(`[Auth] Token expires in ${minutesLeft} minutes at ${expiryDate.toLocaleTimeString()}`);
      }
      
      // Prevent refresh if we just refreshed less than 1 minute ago
      const timeSinceLastRefresh = now - lastRefreshTime;
      if (timeSinceLastRefresh < oneMinute) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Auth] Skipping refresh - last refresh was ${Math.floor(timeSinceLastRefresh / 1000)} seconds ago`);
        }
        return;
      }
      
      // Only refresh if within 5 minutes of expiration AND more than 10 minutes have passed since token issue
      // This prevents immediate refresh of newly issued tokens
      const tokenAge = now - (currentAuth.expiresAt - (15 * 60 * 1000)); // Assuming 15 min token
      const tenMinutes = 10 * 60 * 1000;
      
      if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0 && tokenAge > tenMinutes) {
        console.log('[Auth] Token expiring soon, refreshing...');
        await refreshAccessToken();
        lastRefreshTime = Date.now();
      }
    };

    // Don't check immediately - wait 1 minute before first check
    const interval = setInterval(checkAndRefresh, 60000); // 1 minute

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.expiresAt, auth?.refreshToken]);

  return {
    user: auth?.user || null,
    userRole: auth?.user?.userRole || null,
    companyMemberships: auth?.user?.companyMemberships || [],
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
