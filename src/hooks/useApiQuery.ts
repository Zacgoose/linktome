import { useRbacContext } from '@/context/RbacContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

const API_BASE = '/api';

// Configure axios to send cookies with all requests
// Access tokens are now in HTTP-only cookies, not localStorage
axios.defaults.withCredentials = true;

// Helper to extract UserId from JWT access token stored in HTTP-only cookie
// Note: We cannot access the token directly anymore (security improvement!)
// The backend must include UserId in the user profile response
const getUserIdFromToken = (): string | undefined => {
  // Tokens are now in HTTP-only cookies and cannot be accessed by JavaScript
  // This is a security improvement! We'll rely on the user object from the API instead
  return undefined;
};

// Helper to build merged params with context
const buildMergedParams = (
  params: Record<string, any> | undefined,
  selectedContext: string,
  user: any
): Record<string, any> => {
  let contextKey: Record<string, string> | undefined = undefined;
  if (selectedContext !== 'user' && user) {
    if (user.userManagements?.find((um: { UserId: string; state: string }) => um.UserId === selectedContext && um.state === 'accepted')) {
      contextKey = { UserId: selectedContext };
    }
  }

  const mergedParams = params ? { ...params } : {};
  if (contextKey) {
    if (contextKey.UserId && !mergedParams.UserId) {
      mergedParams.UserId = contextKey.UserId;
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

    const response = await axios[method]<TData | { error: string }>(
      `${API_BASE}/${url}`,
      method === 'get' || method === 'delete' ? config : options.data,
      method === 'get' || method === 'delete' ? undefined : config
    );

    const responseData = response.data;
    if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
      throw new Error(responseData.error);
    }
    return responseData as TData;
  };

  try {
    return await executeRequest();
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && authReady) {
      // Try to refresh the token (cookies will be updated by the backend)
      const refreshed = await refreshAuth();
      if (refreshed) {
        try {
          return await executeRequest();
        } catch (retryErr: any) {
          if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
            throw new Error('Session expired');
          }
          throw retryErr;
        }
      } else {
        throw new Error('Session expired');
      }
    }
    throw err;
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

  const shouldEnable = enabled && authReady;
  const mergedParams = buildMergedParams(params, selectedContext, user);

  const callingUserId = getUserIdFromToken();
  const queryKeyArr: string[] = [queryKey];
  if (callingUserId) {
    queryKeyArr.push(`UserId:${callingUserId}`);
  }
  if (Object.keys(mergedParams).length > 0) {
    queryKeyArr.push(JSON.stringify(mergedParams));
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
        if (onError) {
          const errorMessage = err.message || 'An error occurred';
          onError(errorMessage);
        }
        throw err;
      }
    },
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: false,
  });

  if (queryInfo.error && onError && axios.isAxiosError(queryInfo.error)) {
    const errorMessage =
      (queryInfo.error.response?.data as { error?: string })?.error ||
      queryInfo.error.message ||
      'An error occurred';
    onError(errorMessage);
  }

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
    const { relatedQueryKeys, params, onSuccess, onError } = props || {};
    const callingUserId = getUserIdFromToken();

    const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
      const arr = [key];
      if (callingUserId) arr.push(`UserId:${callingUserId}`);
      if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
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
        if (onError) {
          const errorMessage = axios.isAxiosError(error)
            ? (error.response?.data as { error?: string })?.error || error.message
            : error.message;
          onError(errorMessage);
        }
      },
    });

    return mutation;
  };
}

export const useApiPost = createMutationHook('post');
export const useApiPut = createMutationHook('put');
export const useApiDelete = createMutationHook('delete');