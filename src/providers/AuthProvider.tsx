import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { checkRouteAccess } from '@/config/routes';
import { apiPost } from '@/utils/api';
import { CircularProgress, Box } from '@mui/material';

import { UserAuth, CompanyMembership, UserManagement } from '../hooks/useAuth';

interface AuthContextType {
  user: UserAuth | null;
  userRole: string | null;
  companyMemberships: CompanyMembership[];
  userManagements: UserManagement[];
  managedUsers: UserManagement[];
  managers: UserManagement[];
  loading: boolean;
  logout: () => void;
  canAccessRoute: (path: string) => boolean;
  setUser: (user: UserAuth | null) => void;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuth | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to normalize roles and permissions
  function normalizeUser(user: any): UserAuth {
    const userRole = user.userRole || user.role || (Array.isArray(user.roles) ? user.roles[0] : 'user');
    return {
      userId: String(user.userId || user.id || ''),
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
            userId: String(um.userId),
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
      if (loading) setLoading(false);
      return;
    }
    async function fetchAuth() {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (accessToken && userStr) {
        try {
          const user = normalizeUser(JSON.parse(userStr));
          setUser(user);
          setLoading(false);
          return;
        } catch {
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
  }, [router.asPath, loading]);

  const logout = async () => {
    try {
      await apiPost('public/Logout');
    } catch {}
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Add refreshAuth function for token refresh
  const refreshAuth = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;
      const response = await apiPost('public/RefreshToken', { refreshToken });
      if (response && response.accessToken && response.user) {
        const user = normalizeUser(response.user);
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        return true;
      }
      return false;
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return false;
    }
  };

  const canAccessRoute = (path: string) => {
    if (!user) return false;
    const result = checkRouteAccess(path, user.roles, user.permissions);
    return result.allowed;
  };

  // Show spinner only during initial auth check
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <CircularProgress />
      </Box>
    );
  }



  // Derive managedUsers and managers from userManagements
  const userManagements = user?.userManagements || [];
  const managedUsers = userManagements.filter((um) => um.direction === 'manager' && um.state === 'accepted');
  const managers = userManagements.filter((um) => um.direction === 'managed' && um.state === 'accepted');

  return (
    <AuthContext.Provider value={{
      user,
      userRole: user?.userRole || null,
      companyMemberships: user?.companyMemberships || [],
      userManagements,
      managedUsers,
      managers,
      loading,
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
