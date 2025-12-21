import { useEffect, createElement } from 'react';
import { useRouter } from 'next/router';

/**
 * Hook to enforce authentication on a page
 * Redirects to /login if no access token is found
 */
export function useRequireAuth() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const isAuthenticated = () => {
    return typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  };

  return { isAuthenticated: isAuthenticated() };
}

/**
 * Higher-order component to wrap pages that require authentication
 */
export function withAuth<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { isAuthenticated } = useRequireAuth();

    if (!isAuthenticated) {
      return null; // Or a loading spinner
    }

    return createElement(WrappedComponent, props);
  };

  return AuthenticatedComponent;
}
