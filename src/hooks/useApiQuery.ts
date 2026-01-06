import { useRbacContext } from '@/context/RbacContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import type { ApiError } from '@/types/api';
import { useToast } from '@/context/ToastContext';

const API_BASE = '/api';

// Configure axios to send cookies with all requests
// Access tokens are now in HTTP-only cookies, not localStorage
axios.defaults.withCredentials = true;

// Helper to extract UserId from user object
// Tokens are now in HTTP-only cookies (security improvement!)
// We use the UserId from the user profile instead
const getUserId = (user: any): string | undefined => {
  return user?.UserId;
};

/**
 * Check if an error is a request cancellation
 */
const isRequestCancelled = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    return axios.isCancel(error) || error.code === 'ERR_CANCELED' || error.message === 'canceled';
  }
  if (error instanceof Error) {
    return error.name === 'CanceledError' || error.message === 'canceled';
  }
  return false;
};

/**
 * Extract error message from standardized API error response
 * Following LinkToMe API Response Format specification
 */
const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Try to extract error message from response body (standardized format)
    const errorData = error.response?.data as ApiError | undefined;
    if (errorData?.error) {
      return errorData.error;
    }
    
    // Fallback to status text or generic message
    return error.response?.statusText || error.message || 'An error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

// Helper to build merged params with context
const buildMergedParams = (
  params: Record<string, any> | undefined,
  selectedContext: string,
  user: any
): Record<string, any> => {
  const mergedParams = params ? { ...params } : {};
  
  // Add UserId to params when context is not 'user' and user has permission
  if (selectedContext !== 'user' && user) {
    if (user.userManagements?.find((um: { UserId: string; state: string }) => um.UserId === selectedContext && um.state === 'accepted')) {
      // Only add to params if not already present
      if (!mergedParams.UserId) {
        mergedParams.UserId = selectedContext;
      }
    }
  }

  return mergedParams;
};

// Helper to make authenticated HTTP requests with retry logic
const makeAuthenticatedRequest = async <TData,>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  authReady: boolean,
  refreshAuth: () => Promise<boolean>,
  options: {
    data?: any;
    params?: Record<string, any>;
    signal?: AbortSignal;
  } = {}
): Promise<TData> => {
  if (!authReady) {
    return new Promise<TData>(() => {});
  }

  const executeRequest = async (): Promise<TData> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    // Tokens are in HTTP-only cookies, browser automatically sends them

    const config: any = {
      headers,
      ...(options.signal && { signal: options.signal }),
      ...(options.params && { params: options.params }),
    };

    const response = await axios[method]<TData>(
      `${API_BASE}/${url}`,
      method === 'get' || method === 'delete' ? config : options.data,
      method === 'get' || method === 'delete' ? undefined : config
    );

    // API now uses HTTP status codes to indicate success/failure
    // Success responses (2xx) contain data directly
    // Error responses (4xx/5xx) contain { error: "message" }
    return response.data;
  };

  try {
    return await executeRequest();
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && authReady) {
      // Special case: if this is a login attempt, show 'Invalid credentials' instead of 'Session expired'
      if (url.toLowerCase().includes('login')) {
        throw new Error('Invalid credentials');
      }
      // Try to refresh the token (cookies will be updated by the backend)
      const refreshed = await refreshAuth();
      if (refreshed) {
        try {
          return await executeRequest();
        } catch (retryErr: any) {
          if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
            const errorMessage = extractErrorMessage(retryErr);
            throw new Error(errorMessage || 'Session expired');
          }
          throw new Error(extractErrorMessage(retryErr));
        }
      } else {
        throw new Error('Session expired');
      }
    }
    // Extract and throw standardized error message
    throw new Error(extractErrorMessage(err));
  }
};

interface ApiGetCallProps {
  url: string;
  queryKey: string;
  params?: Record<string, string | number | boolean>;
  contextId?: string;
  enabled?: boolean;
  retry?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

export function useApiGet<TData = unknown>(props: ApiGetCallProps) {
  const { selectedContext } = useRbacContext();
  const { refreshAuth, user, authReady } = useAuthContext();
  const { showToast } = useToast();
  const {
    url,
    queryKey,
    params,
    enabled = true,
    staleTime = 300000,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    onSuccess,
    onError,
  } = props;

  const shouldEnable = enabled && authReady && user !== null;
  const mergedParams = buildMergedParams(params, selectedContext, user);

  const callingUserId = getUserId(user);
  const queryKeyArr: string[] = [queryKey];
  if (callingUserId) {
    queryKeyArr.push(`UserId:${callingUserId}`);
  }
  if (selectedContext !== 'user' && selectedContext) {
    queryKeyArr.push(`Context:${selectedContext}`);
  }
  
  // Only add params to query key if there are additional params beyond UserId
  // (Context already represents the UserId when using a context)
  const paramsForKey = { ...mergedParams };
  if (selectedContext !== 'user' && paramsForKey.UserId === selectedContext) {
    delete paramsForKey.UserId;
  }
  if (Object.keys(paramsForKey).length > 0) {
    queryKeyArr.push(JSON.stringify(paramsForKey));
  }

  const queryInfo = useQuery<TData, AxiosError>({
    queryKey: queryKeyArr,
    enabled: shouldEnable,
    queryFn: async ({ signal }) => {
      if (!authReady) {
        return new Promise<TData>(() => {});
      }
      try {
        const data = await makeAuthenticatedRequest<TData>(
          'get',
          url,
          authReady,
          refreshAuth,
          { params: mergedParams, signal }
        );
        if (onSuccess) onSuccess(data);
        return data;
      } catch (err: any) {
        // Don't show toast for cancelled requests (user navigation/context switch)
        if (!isRequestCancelled(err)) {
          const errorMessage = extractErrorMessage(err);
          // Auto-toast all errors (Option A)
          showToast(errorMessage, 'error');
          if (onError) {
            onError(errorMessage);
          }
        }
        throw err;
      }
    },
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: false,
  });

  // Handle errors from the query result
  // Note: Cancelled requests are already handled in queryFn, no need to duplicate here

  return queryInfo;
}

interface ApiMutationCallProps<TData = unknown> {
  relatedQueryKeys?: string[];
  params?: Record<string, string | number | boolean>;
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

// Generic mutation hook factory
function createMutationHook(method: 'post' | 'put' | 'delete') {
  return function useApiMutation<TData = unknown, TVariables = Record<string, unknown>>(
    props?: ApiMutationCallProps<TData>
  ) {
    const queryClient = useQueryClient();
    const { selectedContext } = useRbacContext();
    const { refreshAuth, user, authReady } = useAuthContext();
    const { showToast } = useToast();
    const { relatedQueryKeys, params, onSuccess, onError } = props || {};
    const callingUserId = getUserId(user);

    const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
      const arr = [key];
      if (callingUserId) arr.push(`UserId:${callingUserId}`);
      if (selectedContext !== 'user' && selectedContext) arr.push(`Context:${selectedContext}`);
      
      // Only add params to query key if there are additional params beyond UserId
      // (Context already represents the UserId when using a context)
      if (params && Object.keys(params).length > 0) {
        const paramsForKey = { ...params };
        if (selectedContext !== 'user' && paramsForKey.UserId === selectedContext) {
          delete paramsForKey.UserId;
        }
        if (Object.keys(paramsForKey).length > 0) {
          arr.push(JSON.stringify(paramsForKey));
        }
      }
      return arr;
    };

    const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
      mutationFn: async ({ url, data }) => {
        const mergedParams = buildMergedParams(params, selectedContext, user);
        return makeAuthenticatedRequest<TData>(
          method,
          url,
          authReady,
          refreshAuth,
          { data, params: mergedParams }
        );
      },
      onSuccess: (data) => {
        if (relatedQueryKeys) {
          relatedQueryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: buildRelatedQueryKey(key, params) });
          });
        }
        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: (error) => {
        // Don't show toast for cancelled requests (user navigation/context switch)
        if (!isRequestCancelled(error)) {
          const errorMessage = extractErrorMessage(error);
          // Auto-toast all errors (Option A)
          showToast(errorMessage, 'error');
          if (onError) {
            onError(errorMessage);
          }
        }
      },
    });

    return mutation;
  };
}

export const useApiPost = createMutationHook('post');
export const useApiPut = createMutationHook('put');
export const useApiDelete = createMutationHook('delete');