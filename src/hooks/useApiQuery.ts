import { useRbacContext } from '@/context/RbacContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

const API_BASE = '/api';

// Helper to get access token from localStorage
const getAccessToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem('accessToken') ?? undefined;
};

// Helper to extract UserId from JWT access token
const getUserIdFromToken = (): string | undefined => {
  const accessToken = getAccessToken();
  if (!accessToken) return undefined;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub;
  } catch {
    return undefined;
  }
};

// Helper to build merged params with context
const buildMergedParams = (
  params: Record<string, any> | undefined,
  selectedContext: string,
  user: any
): Record<string, any> => {
  let contextKey: Record<string, string> | undefined = undefined;
  if (selectedContext !== 'user' && user) {
    const company = user.companyMemberships?.find((c: { companyId: string }) => c.companyId === selectedContext);
    if (company) {
      contextKey = { companyId: selectedContext };
    } else if (user.userManagements?.find((um: { UserId: string; state: string }) => um.UserId === selectedContext && um.state === 'accepted')) {
      contextKey = { UserId: selectedContext };
    }
  }

  const mergedParams = params ? { ...params } : {};
  if (contextKey) {
    if (contextKey.companyId && !mergedParams.companyId) {
      mergedParams.companyId = contextKey.companyId;
    }
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

  const executeRequest = async (token: string | undefined): Promise<TData> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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

  let token = getAccessToken();
  
  if (!token && authReady) {
    const refreshed = await refreshAuth();
    if (refreshed) {
      token = getAccessToken();
    }
  }

  try {
    return await executeRequest(token);
  } catch (err: any) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && authReady) {
      const refreshed = await refreshAuth();
      if (refreshed) {
        const retryToken = getAccessToken();
        try {
          return await executeRequest(retryToken);
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
function createMutationHook<TData = unknown, TVariables = Record<string, unknown>>(
  method: 'post' | 'put' | 'delete'
) {
  return (props?: ApiMutationCallProps<TData>) => {
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