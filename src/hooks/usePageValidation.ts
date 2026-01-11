import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { usePageContext } from '@/context/PageContext';

/**
 * Hook to validate that user has at least one page before accessing certain features.
 * Shows a dialog if no pages exist and redirects to the pages page.
 */
export function usePageValidation() {
  const router = useRouter();
  const { pages, isLoading } = usePageContext();
  const [noPagesDialogOpen, setNoPagesDialogOpen] = useState(false);
  const hasShownDialog = useRef(false);

  // Check if user has any pages when component mounts
  useEffect(() => {
    if (!isLoading && pages.length === 0 && !hasShownDialog.current) {
      setNoPagesDialogOpen(true);
      hasShownDialog.current = true;
    }
  }, [pages, isLoading]);

  const handleNoPagesDialogClose = () => {
    setNoPagesDialogOpen(false);
    router.push('/admin/pages');
  };

  const showNoPagesDialog = () => {
    setNoPagesDialogOpen(true);
  };

  const hasPages = pages.length > 0;

  return {
    hasPages,
    noPagesDialogOpen,
    handleNoPagesDialogClose,
    showNoPagesDialog,
  };
}
