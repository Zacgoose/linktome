import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { checkRouteAccess, findRouteConfig } from '@/config/routes';
import { apiGet, apiPost } from '@/utils/api';
import { CircularProgress, Box } from '@mui/material';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  canAccessRoute: (path: string) => boolean;
  setUser: (user: User | null) => void;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Helper to normalize roles and permissions
  function normalizeUser(user: any) {
    let roles = user.roles;
    if (typeof roles === 'string') {
      try {
        roles = JSON.parse(roles);
      } catch {
        roles = [roles];
      }
    }
    if (!Array.isArray(roles)) roles = [roles];

    let permissions = user.permissions;
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = [permissions];
      }
    }
    if (!Array.isArray(permissions)) permissions = [permissions];

    return { ...user, roles, permissions };
  }

  useEffect(() => {
    async function fetchAuth() {
      // Try localStorage first
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
  }, []);




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



  return (
    <AuthContext.Provider value={{ user, loading, logout, canAccessRoute, setUser, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
