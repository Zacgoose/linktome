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
  if (selectedContext !== 'user' && user?.companyMemberships) {
    const company = user.companyMemberships.find((c) => c.companyId === selectedContext);
    if (company) {
      contextRoles = [company.role];
      contextPermissions = company.permissions;
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
