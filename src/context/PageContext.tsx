import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { Page } from '@/types/pages';
import { useApiGet } from '@/hooks/useApiQuery';

interface PageContextValue {
  currentPage: Page | null;
  pages: Page[];
  isLoading: boolean;
  setCurrentPage: (page: Page | null) => void;
  refetchPages: () => void;
}

const PageContext = createContext<PageContextValue | undefined>(undefined);

interface PageProviderProps {
  children: ReactNode;
}

export function PageProvider({ children }: PageProviderProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  
  // Only fetch pages on admin routes
  const isAdminRoute = router.pathname.startsWith('/admin');

  // Fetch pages list
  const { data: pagesData, isLoading, refetch } = useApiGet<{ pages: Page[] }>({
    url: 'admin/GetPages',
    queryKey: 'admin-pages-context',
    enabled: isAdminRoute,
  });

  const pages = pagesData?.pages || [];

  // Set initial current page to default page when pages load
  useEffect(() => {
    if (pages.length > 0 && !currentPage) {
      const defaultPage = pages.find(p => p.isDefault) || pages[0];
      setCurrentPage(defaultPage);
    }
  }, [pages, currentPage]);

  // Update current page if it was deleted or modified
  useEffect(() => {
    if (currentPage) {
      if (pages.length === 0) {
        // No pages available, clear current page
        setCurrentPage(null);
      } else {
        const updatedPage = pages.find(p => p.id === currentPage.id);
        if (!updatedPage) {
          // Current page was deleted, switch to default
          const defaultPage = pages.find(p => p.isDefault) || pages[0];
          setCurrentPage(defaultPage);
        } else if (
          updatedPage.name !== currentPage.name ||
          updatedPage.slug !== currentPage.slug ||
          updatedPage.isDefault !== currentPage.isDefault
        ) {
          // Page was updated, refresh it
          setCurrentPage(updatedPage);
        }
      }
    }
  }, [pages, currentPage]);

  const value: PageContextValue = {
    currentPage,
    pages,
    isLoading,
    setCurrentPage,
    refetchPages: refetch,
  };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePageContext(): PageContextValue {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
}
