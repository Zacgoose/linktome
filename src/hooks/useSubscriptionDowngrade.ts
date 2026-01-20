/**
 * Hook for subscription downgrade functionality
 * 
 * Provides methods to preview and execute subscription downgrades
 */

import { useState, useCallback } from 'react';
import { useApiPost, useApiGet } from './useApiQuery';
import { UserTier } from '@/types/tiers';
import {
  SubscriptionDowngradeAssessment,
  DowngradeOptions,
  DowngradePreviewResponse,
  ExecuteDowngradeRequest,
  ExecuteDowngradeResponse,
} from '@/types/subscriptionDowngrade';
import { assessDowngradeImpact } from '@/utils/subscriptionDowngradeHandler';

interface UseSubscriptionDowngradeProps {
  currentTier: UserTier;
  targetTier?: UserTier;
}

export function useSubscriptionDowngrade({ currentTier, targetTier }: UseSubscriptionDowngradeProps) {
  const [assessment, setAssessment] = useState<SubscriptionDowngradeAssessment | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);

  // Fetch user data for downgrade assessment
  const { data: pages } = useApiGet({
    url: 'admin/GetPages',
    queryKey: 'user-pages',
  });

  const { data: links } = useApiGet({
    url: 'admin/GetLinks',
    queryKey: 'user-links',
  });

  const { data: appearance } = useApiGet({
    url: 'admin/GetAppearance',
    queryKey: 'user-appearance',
  });

  const { data: shortLinks } = useApiGet({
    url: 'admin/GetShortLinks',
    queryKey: 'user-shortlinks',
  });

  const { data: subAccounts } = useApiGet({
    url: 'admin/GetSubAccounts',
    queryKey: 'user-subaccounts',
  });

  const { data: apiKeys } = useApiGet({
    url: 'admin/GetApiKeys',
    queryKey: 'user-apikeys',
  });

  /**
   * Generate a local assessment of downgrade impact
   * This runs on the client side for immediate feedback
   */
  const generateAssessment = useCallback(
    (options: DowngradeOptions = {}): SubscriptionDowngradeAssessment | null => {
      if (!targetTier) return null;

      setIsLoadingAssessment(true);

      try {
        const userData = {
          pages: pages?.pages || [],
          links: links?.links || [],
          groups: links?.groups || [],
          appearance: appearance || undefined,
          shortLinks: shortLinks?.shortLinks || [],
          subAccounts: subAccounts?.subAccounts || [],
          apiKeys: apiKeys?.keys || [],
        };

        const result = assessDowngradeImpact(currentTier, targetTier, userData, options);
        setAssessment(result);
        return result;
      } catch (error) {
        console.error('Error generating downgrade assessment:', error);
        return null;
      } finally {
        setIsLoadingAssessment(false);
      }
    },
    [currentTier, targetTier, pages, links, appearance, shortLinks, subAccounts, apiKeys]
  );

  /**
   * Request a downgrade preview from the backend
   * This should be used when you need server-side validation
   */
  const previewDowngrade = useApiPost<DowngradePreviewResponse>({
    relatedQueryKeys: [],
    onSuccess: (data) => {
      setAssessment(data.assessment);
    },
    onError: (error) => {
      console.error('Failed to preview downgrade:', error);
    },
  });

  /**
   * Execute the downgrade with user confirmation
   */
  const executeDowngrade = useApiPost<ExecuteDowngradeResponse>({
    relatedQueryKeys: [
      'user-subscription',
      'user-pages',
      'user-links',
      'user-appearance',
      'user-shortlinks',
      'user-subaccounts',
      'user-apikeys',
    ],
    onSuccess: (data) => {
      console.log('Downgrade executed successfully:', data.message);
    },
    onError: (error) => {
      console.error('Failed to execute downgrade:', error);
    },
  });

  /**
   * Handle downgrade with user selections
   */
  const handleDowngrade = useCallback(
    (userSelections: {
      pageIds?: string[];
      linkIds?: string[];
      shortLinkSlugs?: string[];
    }) => {
      if (!targetTier) return;

      const request: ExecuteDowngradeRequest = {
        userId: '', // Will be set by backend from auth context
        targetTier,
        options: {
          strategy: 'user-choice',
          userSelections,
          notifyUser: true,
        },
        userConfirmed: true,
      };

      executeDowngrade.mutate({
        url: 'admin/executeDowngrade',
        data: request,
      });
    },
    [targetTier, executeDowngrade]
  );

  return {
    // State
    assessment,
    isLoadingAssessment,
    isExecuting: executeDowngrade.isPending,
    
    // Methods
    generateAssessment,
    previewDowngrade: (options?: DowngradeOptions) => {
      if (!targetTier) return;
      previewDowngrade.mutate({
        url: 'admin/previewDowngrade',
        data: {
          userId: '', // Will be set by backend
          targetTier,
          options,
        },
      });
    },
    handleDowngrade,
    
    // Computed
    requiresUserAction: assessment?.requiresUserAction || false,
    hasWarnings: (assessment?.warnings.length || 0) > 0,
  };
}
