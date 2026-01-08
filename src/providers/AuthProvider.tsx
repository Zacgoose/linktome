
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { checkRouteAccess } from '@/config/routes';
import { apiPost } from '@/utils/api';
import type { UserAuth, UserManagement, LoginResponse } from '@/types/api';
import type { QueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: UserAuth | null;
  userRole: string | null;
  userManagements: UserManagement[];
  managedUsers: UserManagement[];
  managers: UserManagement[];
  loading: boolean;
  refreshing: boolean;
  authReady: boolean;
  logout: () => void;
  canAccessRoute: (path: string) => boolean;
  setUser: (user: UserAuth | null) => void;
  refreshAuth: () => Promise<boolean>;
  twoFactorEmailEnabled: boolean;
  twoFactorTotpEnabled: boolean;
  twoFactorEnabled: boolean;
}

// Re-export types for backward compatibility
export type { UserAuth, UserManagement };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode; queryClient: QueryClient }> = ({ children, queryClient }) => {
  const [user, setUser] = useState<UserAuth | null>(null);
  // State to preserve last valid user during refresh (for display continuity)
  const [lastValidUser, setLastValidUser] = useState<UserAuth | null>(null);
  // Ref to prevent concurrent refresh calls
  const refreshPromise = useRef<Promise<boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const authReady = !loading && !refreshing;
  const router = useRouter();

  // Helper to normalize roles and permissions
  function normalizeUser(user: any): UserAuth {
    const userRole = user.userRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'user');
    return {
      UserId: String(user.UserId || user.id || ''),
      username: String(user.username || ''),
      email: String(user.email || ''),
      userRole: String(userRole),
      roles: Array.isArray(user.roles) ? user.roles : [userRole],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      userManagements: Array.isArray(user.userManagements)
        ? user.userManagements.map((um: any) => ({
            UserId: String(um.UserId),
            DisplayName: String(um.DisplayName),
            Email: String(um.Email),
            role: um.role,
            state: um.state,
            direction: um.direction,
            permissions: Array.isArray(um.permissions) ? um.permissions : [],
            tier: um.tier, // Include tier from managed user
            created: um.created,
            updated: um.updated,
          }))
        : [],
      tier: user.tier, // Include tier from backend
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorEmailEnabled: Boolean(user.twoFactorEmailEnabled),
      twoFactorTotpEnabled: Boolean(user.twoFactorTotpEnabled),
    };
  }

  useEffect(() => {
    // Use router.asPath for robust login route detection
    const loginRegex = /^\/login\/?(\?.*)?$/;
    const isLoginRoute = loginRegex.test(router.asPath);
    if (isLoginRoute) {
      if (loading) {
        // Defer setLoading to avoid React warning about setState in effect
        Promise.resolve().then(() => setLoading(false));
      }
      return;
    }
    async function fetchAuth() {
      if (refreshing) {
        console.debug('[AuthProvider] fetchAuth: skipping because refreshing is true');
        setLoading(false);
        return;
      }
      // Check if user data exists in localStorage (non-sensitive UI state)
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (userStr) {
        try {
          const user = normalizeUser(JSON.parse(userStr));
          setUser(user);
          setLoading(false);
          return;
        } catch {
          // If parsing fails, clear invalid data
          localStorage.removeItem('user');
          setUser(null);
          setLoading(false);
          return;
        }
      }
      // If no user data, the user is not authenticated
      // Tokens are in HTTP-only cookies managed by the browser
      setUser(null);
      setLoading(false);
    }
    fetchAuth();
  }, [router.asPath, loading, refreshing]);

  const logout = async () => {
    // Cancel all ongoing queries to prevent redundant API calls
    queryClient.cancelQueries();
    
    // Clear the query cache to prevent any refetch attempts
    queryClient.clear();
    
    try {
      // Backend will clear the HTTP-only cookies
      await apiPost('public/Logout');
    } catch {}
    setUser(null);
    // Only clear user profile, tokens are in HTTP-only cookies
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Add refreshAuth function for token refresh
  // Prevent concurrent refreshAuth calls
  const refreshAuth = async () => {
    if (refreshPromise.current) {
      return refreshPromise.current;
    }
    setRefreshing(true);
    // Preserve last valid user before refresh
    setLastValidUser(user);
    refreshPromise.current = (async () => {
      try {
        // Refresh token is in HTTP-only cookie, backend will read it
        // No need to send it in the request body
        const response = await apiPost('public/RefreshToken', {}) as LoginResponse;
        if (response && response.user) {
          const newUser = normalizeUser(response.user);
          // Backend sets new cookies with refreshed tokens
          // We only store non-sensitive user profile for UI
          localStorage.setItem('user', JSON.stringify(newUser));
          setUser(newUser);
          setLastValidUser(newUser);
          setRefreshing(false);
          refreshPromise.current = null;
          return true;
        }
        setRefreshing(false);
        refreshPromise.current = null;
        return false;
      } catch {
        setUser(null);
        setLastValidUser(null);
        // Clear user profile, backend will clear cookies
        localStorage.removeItem('user');
        setRefreshing(false);
        refreshPromise.current = null;
        return false;
      }
    })();
    return refreshPromise.current;
  };

  const canAccessRoute = (path: string) => {
    if (!user) return false;
    const result = checkRouteAccess(path, user.roles, user.permissions);
    return result.allowed;
  };

  // Use last valid user during refresh
  const effectiveUser = refreshing ? lastValidUser : user;

  // Show spinner only during initial auth check
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Derive managedUsers and managers from userManagements
  const userManagements = effectiveUser?.userManagements || [];
  const managedUsers = userManagements.filter((um) => um.direction === 'manager' && um.state === 'accepted');
  const managers = userManagements.filter((um) => um.direction === 'managed' && um.state === 'accepted');

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      userRole: effectiveUser?.userRole || null,
      userManagements,
      managedUsers,
      managers,
      loading,
      refreshing,
      authReady,
      logout,
      canAccessRoute,
      setUser,
      refreshAuth,
      twoFactorEmailEnabled: effectiveUser?.twoFactorEmailEnabled || false,
      twoFactorTotpEnabled: effectiveUser?.twoFactorTotpEnabled || false,
      twoFactorEnabled: effectiveUser?.twoFactorEnabled || false,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
