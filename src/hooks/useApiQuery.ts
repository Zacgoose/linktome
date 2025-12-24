import { useRbacContext } from '@/context/RbacContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

const API_BASE = '/api';

// Helper to check if access token is missing or expired, and refresh if possible
const ensureValidAccessToken = async () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  let isTokenValid = false;
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payload.exp ? payload.exp * 1000 : 0;
      isTokenValid = exp > Date.now() + 5000; // 5s leeway
    } catch {}
  }
  if (!isTokenValid && refreshToken) {
    // Try to refresh the access token
    try {
      const response = await fetch('/api/public/RefreshToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
    } catch {}
  }
};

// Helper to extract userId from JWT access token
const getUserIdFromToken = (): string | undefined => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return undefined;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub;
  } catch {
    return undefined;
  }
};

const buildHeaders = async () => {
  await ensureValidAccessToken();
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Track if we're already redirecting to prevent multiple simultaneous redirects
// This flag is per-page-load and will be reset when the page redirects
let isRedirecting = false;

// Helper to handle API errors and redirects
const handleApiError = (error: AxiosError) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Only redirect once per page load, even if multiple API calls fail simultaneously
    if (!isRedirecting && typeof window !== 'undefined') {
      isRedirecting = true;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      
      const currentPath = window.location.pathname + window.location.search;
      const loginRegex = /^\/login(\?.*)?$/;
      const isLoginPage = loginRegex.test(currentPath);

      if (!isLoginPage) {
        // Use window.location.href which will cause a full page redirect
        // and reset the isRedirecting flag on the next page load
        window.location.href = '/login?session=expired';
      }
      // If already on /login, do nothing (preserve error message)
    }
  }
};

// Centralized retry logic
const createRetryFn = (maxRetries: number) => {
  return (failureCount: number, error: Error) => {
    const HTTP_STATUS_TO_NOT_RETRY = [401, 403, 404, 500];
    
    if (failureCount >= maxRetries) {
      return false;
    }
    
    if (axios.isAxiosError(error) && HTTP_STATUS_TO_NOT_RETRY.includes(error.response?.status ?? 0)) {
      handleApiError(error);
      return false;
    }
    
    return true;
  };
};

interface ApiGetCallProps {
  url: string;
  queryKey: string;
  params?: Record<string, string | number | boolean>;
  contextId?: string; // companyId or 'user'
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
  const {
    url,
    queryKey,
    params,
    enabled = true,
    retry = 3,
    staleTime = 300000,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    onSuccess,
    onError,
  } = props;


  // Detect context type using the user object
  const { user } = useAuthContext();
  let contextKey: Record<string, string> | undefined = undefined;
  if (selectedContext !== 'user' && user) {
    // Check if selectedContext matches a companyMembership
    const company = user.companyMemberships?.find((c: { companyId: string }) => c.companyId === selectedContext);
    if (company) {
      contextKey = { companyId: selectedContext };
    } else if (user.userManagements?.find((um: { userId: string; state: string }) => um.userId === selectedContext && um.state === 'accepted')) {
      contextKey = { userId: selectedContext };
    }
  }

  // Merge params with contextKey if not already present
  const mergedParams = params ? { ...params } : {};
  if (contextKey) {
    if (contextKey.companyId && !mergedParams.companyId) {
      mergedParams.companyId = contextKey.companyId;
    }
    if (contextKey.userId && !mergedParams.userId) {
      mergedParams.userId = contextKey.userId;
    }
  }

  // Always include the calling user (userId from JWT) in the query key, in addition to context
  const callingUserId = getUserIdFromToken();
  const queryKeyArr: string[] = [queryKey];
  if (callingUserId) {
    queryKeyArr.push(`userId:${callingUserId}`);
  }
  if (contextKey) {
    queryKeyArr.push(JSON.stringify(contextKey));
  }
  if (Object.keys(mergedParams).length > 0) {
    queryKeyArr.push(JSON.stringify(mergedParams));
  }

  const queryInfo = useQuery<TData, AxiosError>({
    queryKey: queryKeyArr,
    enabled,
    queryFn: async ({ signal }) => {
      const headers = await buildHeaders();
      const response = await axios.get<TData | { error: string }>(`${API_BASE}/${url}`, {
        signal,
        params: mergedParams,
        headers,
      });
      const data = response.data;
      if (typeof data === 'object' && data !== null && 'error' in data) {
        if (onError) onError(data.error);
        throw new Error(data.error);
      }
      if (onSuccess) onSuccess(data);
      return data as TData;
    },
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: createRetryFn(retry),
  });

  if (queryInfo.error) {
    handleApiError(queryInfo.error);
    if (onError && axios.isAxiosError(queryInfo.error)) {
      const errorMessage =
        (queryInfo.error.response?.data as { error?: string })?.error ||
        queryInfo.error.message ||
        'An error occurred';
      onError(errorMessage);
    }
  }

  return queryInfo;
}

interface ApiMutationCallProps<TData = unknown> {
  relatedQueryKeys?: string[];
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

export function useApiPost<TData = unknown, TVariables = Record<string, unknown>>(
  props?: ApiMutationCallProps<TData>
) {
  const queryClient = useQueryClient();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  // Helper to build query key for invalidation, matching useApiGet
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`userId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };

  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const headers = await buildHeaders();
      const response = await axios.post<TData | { error: string }>(`${API_BASE}/${url}`, data, {
        headers,
      });
      const responseData = response.data;
      if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
        throw new Error(responseData.error);
      }
      return responseData as TData;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: buildRelatedQueryKey(key, (props as any)?.params) });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        handleApiError(error);
      }
      if (onError) {
        const errorMessage = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string })?.error || error.message
          : error.message;
        onError(errorMessage);
      }
    },
  });

  return mutation;
}

export function useApiPut<TData = unknown, TVariables = Record<string, unknown>>(
  props?: ApiMutationCallProps<TData>
) {
  const queryClient = useQueryClient();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  // Helper to build query key for invalidation, matching useApiGet
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`userId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };

  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const headers = await buildHeaders();
      const response = await axios.put<TData | { error: string }>(`${API_BASE}/${url}`, data, {
        headers,
      });
      const responseData = response.data;
      if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
        throw new Error(responseData.error);
      }
      return responseData as TData;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: buildRelatedQueryKey(key, (props as any)?.params) });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        handleApiError(error);
      }
      if (onError) {
        const errorMessage = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string })?.error || error.message
          : error.message;
        onError(errorMessage);
      }
    },
  });

  return mutation;
}

export function useApiDelete<TData = unknown>(
  props?: ApiMutationCallProps<TData>
) {
  const queryClient = useQueryClient();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  // Helper to build query key for invalidation, matching useApiGet
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`userId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };

  const mutation = useMutation<TData, Error, { url: string }>({
    mutationFn: async ({ url }) => {
      const headers = await buildHeaders();
      const response = await axios.delete<TData | { error: string }>(`${API_BASE}/${url}`, {
        headers,
      });
      const responseData = response.data;
      if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
        throw new Error(responseData.error);
      }
      return responseData as TData;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: buildRelatedQueryKey(key, (props as any)?.params) });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error)) {
        handleApiError(error);
      }
      if (onError) {
        const errorMessage = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string })?.error || error.message
          : error.message;
        onError(errorMessage);
      }
    },
  });

  return mutation;
}
