
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';
import { UserTier } from '@/types/tiers';

export type RbacContextType = {
  selectedContext: string; // 'user' or UserId for managed users
  setSelectedContext: (context: string) => void;
  contextRoles: string[];
  contextPermissions: string[];
  contextTier?: UserTier; // Context-specific user tier
};

const RbacContext = createContext<RbacContextType | undefined>(undefined);

export const RbacProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [selectedContext, setSelectedContext] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedContext') || 'user';
    }
    return 'user';
  });

  // Persist selectedContext to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedContext', selectedContext);
    }
  }, [selectedContext]);

  // Reset selectedContext to 'user' when user changes (e.g., after login/logout)
  useEffect(() => {
    setSelectedContext('user');
  }, [user]);


  let contextRoles: string[] = user?.roles || [];
  let contextPermissions: string[] = user?.permissions || [];
  let contextTier: UserTier | undefined = user?.tier;

  // User-to-user management context
  if (
    selectedContext !== 'user' &&
    user?.userManagements && Array.isArray(user.userManagements)
  ) {
    const managed = user.userManagements.find((um) => um.UserId === selectedContext && um.state === 'accepted');
    if (managed) {
      contextRoles = [managed.role];
      // Use permissions from the userManagements entry (from JWT)
      contextPermissions = Array.isArray(managed.permissions) ? managed.permissions : [];
      // Use tier from the managed user
      contextTier = managed.tier;
    }
  }

  // Sub-account context (agency admin users)
  if (
    selectedContext !== 'user' &&
    user?.subAccounts && Array.isArray(user.subAccounts)
  ) {
    const subAccount = user.subAccounts.find((sa) => sa.userId === selectedContext && sa.status === 'active');
    if (subAccount) {
      contextRoles = [subAccount.role || 'sub_account_user'];
      // Use permissions from the subAccounts entry (from JWT)
      contextPermissions = Array.isArray(subAccount.permissions) ? subAccount.permissions : [];
      // Sub-accounts inherit parent's tier
      contextTier = user.tier;
    }
  }

  return (
    <RbacContext.Provider value={{ selectedContext, setSelectedContext, contextRoles, contextPermissions, contextTier }}>
      {children}
    </RbacContext.Provider>
  );
};

export function useRbacContext() {
  const ctx = useContext(RbacContext);
  if (!ctx) throw new Error('useRbacContext must be used within RbacProvider');
  return ctx;
}
