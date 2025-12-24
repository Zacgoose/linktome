
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthContext } from '@/providers/AuthProvider';

export type RbacContextType = {
  selectedContext: string; // 'user' or companyId
  setSelectedContext: (context: string) => void;
  contextRoles: string[];
  contextPermissions: string[];
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedContext', selectedContext);
    }
  }, [selectedContext]);


  let contextRoles: string[] = user?.roles || [];
  let contextPermissions: string[] = user?.permissions || [];

  // Company context
  if (selectedContext !== 'user' && user?.companyMemberships) {
    const company = user.companyMemberships.find((c) => c.companyId === selectedContext);
    if (company) {
      contextRoles = [company.role];
      contextPermissions = company.permissions;
    }
  }

  // User-to-user management context
  if (
    selectedContext !== 'user' &&
    (!user?.companyMemberships || !user.companyMemberships.some((c) => c.companyId === selectedContext)) &&
    user?.userManagements && Array.isArray(user.userManagements)
  ) {
    const managed = user.userManagements.find((um) => um.UserId === selectedContext && um.state === 'accepted');
    if (managed) {
      contextRoles = [managed.role];
      // Use permissions from the userManagements entry (from JWT)
      contextPermissions = Array.isArray(managed.permissions) ? managed.permissions : [];
    }
  }

  return (
    <RbacContext.Provider value={{ selectedContext, setSelectedContext, contextRoles, contextPermissions }}>
      {children}
    </RbacContext.Provider>
  );
};

export function useRbacContext() {
  const ctx = useContext(RbacContext);
  if (!ctx) throw new Error('useRbacContext must be used within RbacProvider');
  return ctx;
}
