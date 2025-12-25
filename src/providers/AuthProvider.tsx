
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { checkRouteAccess } from '@/config/routes';
import { apiPost } from '@/utils/api';

interface AuthContextType {
  user: UserAuth | null;
  userRole: string | null;
  companyMemberships: CompanyMembership[];
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
}

export interface CompanyMembership {
  companyId: string;
  companyName?: string;
  role: string;
  permissions: string[];
}

export interface UserManagement {
  UserId: string;
  role: string;
  state: string;
  direction: 'manager' | 'managed';
  permissions: string[];
  created?: string;
  updated?: string;
}

export interface UserAuth {
  UserId: string;
  username: string;
  email: string;
  userRole: string;
  roles: string[];
  permissions: string[];
  companyMemberships?: CompanyMembership[];
  userManagements?: UserManagement[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuth | null>(null);
  // Ref to preserve last valid user during refresh
  const lastValidUser = useRef<UserAuth | null>(null);
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
      companyMemberships: Array.isArray(user.companyMemberships)
        ? user.companyMemberships.map((cm: any) => ({
            companyId: String(cm.companyId),
            companyName: cm.companyName,
            role: cm.role,
            permissions: Array.isArray(cm.permissions) ? cm.permissions : [],
          }))
        : [],
      userManagements: Array.isArray(user.userManagements)
        ? user.userManagements.map((um: any) => ({
            UserId: String(um.UserId),
            role: um.role,
            state: um.state,
            direction: um.direction,
            permissions: Array.isArray(um.permissions) ? um.permissions : [],
            created: um.created,
            updated: um.updated,
          }))
        : [],
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
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (accessToken && userStr) {
        try {
          const user = normalizeUser(JSON.parse(userStr));
          setUser(user);
          setLoading(false);
          return;
        } catch (e) {
          // If parsing fails, clear invalid data and set user to null
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
          setLoading(false);
          return;
        }
      }
      // If no token in localStorage, don't try to fetch from API
      // The user is not authenticated, let the pages handle the redirect
      setUser(null);
      setLoading(false);
    }
    fetchAuth();
  }, [router.asPath, loading, refreshing]);

  const logout = async () => {
    try {
      await apiPost('public/Logout');
    } catch {}
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  // Add refreshAuth function for token refresh
  // Prevent concurrent refreshAuth calls
  let refreshPromise: Promise<boolean> | null = null;
  const refreshAuth = async () => {
    if (refreshPromise) {
      return refreshPromise;
    }
    setRefreshing(true);
    // Preserve last valid user before refresh
    lastValidUser.current = user;
    refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          setRefreshing(false);
          refreshPromise = null;
          return false;
        }
        const response = await apiPost('public/RefreshToken', { refreshToken });
        if (response && response.accessToken && response.user) {
          const newUser = normalizeUser(response.user);
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(newUser));
          setUser(newUser);
          lastValidUser.current = newUser;
          setRefreshing(false);
          refreshPromise = null;
          return true;
        }
        setRefreshing(false);
        refreshPromise = null;
        return false;
      } catch (e) {
        setUser(null);
        lastValidUser.current = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setRefreshing(false);
        refreshPromise = null;
        return false;
      }
    })();
    return refreshPromise;
  };

  const canAccessRoute = (path: string) => {
    if (!user) return false;
    const result = checkRouteAccess(path, user.roles, user.permissions);
    return result.allowed;
  };

  // Use last valid user during refresh
  const effectiveUser = refreshing ? lastValidUser.current : user;

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
      companyMemberships: effectiveUser?.companyMemberships || [],
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
