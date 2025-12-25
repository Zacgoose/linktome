
import { useRbacContext } from '@/context/RbacContext';
import { useAuthContext } from '@/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

const API_BASE = '/api';

// Helper to extract UserId from JWT access token
const getUserIdFromToken = (): string | undefined => {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
  if (!accessToken) return undefined;
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub;
  } catch {
    return undefined;
  }
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
  const { refreshAuth, user, loading, refreshing, authReady } = useAuthContext();
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

  const callingUserId = getUserIdFromToken();
  const queryKeyArr: string[] = [queryKey];
  if (callingUserId) {
    queryKeyArr.push(`UserId:${callingUserId}`);
  }
  if (Object.keys(mergedParams).length > 0) {
    queryKeyArr.push(JSON.stringify(mergedParams));
  }

  // Pass loading/refreshing via closure
  const queryInfo = useQuery<TData, AxiosError>({
    queryKey: queryKeyArr,
    enabled: shouldEnable,
    queryFn: async ({ signal }) => {
      // Never trigger a refresh or API call if AuthProvider is not ready
      if (!authReady) {
        return new Promise<TData>(() => {});
      }
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      // Only attempt refresh if authReady
      if (!token && authReady) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
        }
      }
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
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
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // Only attempt refresh if authReady
          if (authReady) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              const retryToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
              const retryHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (retryToken) retryHeaders['Authorization'] = `Bearer ${retryToken}`;
              try {
                const retryResponse = await axios.get<TData | { error: string }>(`${API_BASE}/${url}`, {
                  signal,
                  params: mergedParams,
                  headers: retryHeaders,
                });
                const retryData = retryResponse.data;
                if (typeof retryData === 'object' && retryData !== null && 'error' in retryData) {
                  if (onError) onError(retryData.error);
                  throw new Error(retryData.error);
                }
                if (onSuccess) onSuccess(retryData);
                return retryData as TData;
              } catch (retryErr: any) {
                if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
                  throw new Error('Session expired');
                }
                throw retryErr;
              }
            } else {
              throw new Error('Session expired');
            }
          } else {
            throw new Error('Session expired');
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
  onSuccess?: (data: TData) => void;
  onError?: (error: string) => void;
}

export function useApiPost<TData = unknown, TVariables = Record<string, unknown>>(
  props?: ApiMutationCallProps<TData>
) {
  const queryClient = useQueryClient();
  const { refreshAuth, loading, refreshing, authReady } = useAuthContext();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`UserId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };

  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      if (!authReady) {
        return new Promise<TData>(() => {});
      }
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!token && authReady) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
        }
      }
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const response = await axios.post<TData | { error: string }>(`${API_BASE}/${url}`, data, {
          headers,
        });
        const responseData = response.data;
        if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
          throw new Error(responseData.error);
        }
        return responseData as TData;
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          if (authReady) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              const retryToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
              const retryHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (retryToken) retryHeaders['Authorization'] = `Bearer ${retryToken}`;
              try {
                const retryResponse = await axios.post<TData | { error: string }>(`${API_BASE}/${url}`, data, {
                  headers: retryHeaders,
                });
                const retryData = retryResponse.data;
                if (typeof retryData === 'object' && retryData !== null && 'error' in retryData) {
                  throw new Error(retryData.error);
                }
                return retryData as TData;
              } catch (retryErr: any) {
                if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
                  throw new Error('Session expired');
                }
                throw retryErr;
              }
            } else {
              throw new Error('Session expired');
            }
          } else {
            throw new Error('Session expired');
          }
        }
        throw err;
      }
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
  const { refreshAuth, loading, refreshing, authReady } = useAuthContext();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`UserId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };
  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      if (!authReady) {
        return new Promise<TData>(() => {});
      }
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!token && authReady) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
        }
      }
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const response = await axios.put<TData | { error: string }>(`${API_BASE}/${url}`, data, {
          headers,
        });
        const responseData = response.data;
        if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
          throw new Error(responseData.error);
        }
        return responseData as TData;
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          if (authReady) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              const retryToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
              const retryHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (retryToken) retryHeaders['Authorization'] = `Bearer ${retryToken}`;
              try {
                const retryResponse = await axios.put<TData | { error: string }>(`${API_BASE}/${url}`, data, {
                  headers: retryHeaders,
                });
                const retryData = retryResponse.data;
                if (typeof retryData === 'object' && retryData !== null && 'error' in retryData) {
                  throw new Error(retryData.error);
                }
                return retryData as TData;
              } catch (retryErr: any) {
                if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
                  throw new Error('Session expired');
                }
                throw retryErr;
              }
            } else {
              throw new Error('Session expired');
            }
          } else {
            throw new Error('Session expired');
          }
        }
        throw err;
      }
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
  const { refreshAuth, loading, refreshing, authReady } = useAuthContext();
  const { relatedQueryKeys, onSuccess, onError } = props || {};
  const callingUserId = getUserIdFromToken();
  const buildRelatedQueryKey = (key: string, params?: Record<string, any>) => {
    const arr = [key];
    if (callingUserId) arr.push(`UserId:${callingUserId}`);
    if (params && Object.keys(params).length > 0) arr.push(JSON.stringify(params));
    return arr;
  };
  const mutation = useMutation<TData, Error, { url: string }>({
    mutationFn: async ({ url }) => {
      if (!authReady) {
        return new Promise<TData>(() => {});
      }
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!token && authReady) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
        }
      }
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const response = await axios.delete<TData | { error: string }>(`${API_BASE}/${url}`, {
          headers,
        });
        const responseData = response.data;
        if (typeof responseData === 'object' && responseData !== null && 'error' in responseData) {
          throw new Error(responseData.error);
        }
        return responseData as TData;
      } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          if (authReady) {
            const refreshed = await refreshAuth();
            if (refreshed) {
              const retryToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
              const retryHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (retryToken) retryHeaders['Authorization'] = `Bearer ${retryToken}`;
              try {
                const retryResponse = await axios.delete<TData | { error: string }>(`${API_BASE}/${url}`, {
                  headers: retryHeaders,
                });
                const retryData = retryResponse.data;
                if (typeof retryData === 'object' && retryData !== null && 'error' in retryData) {
                  throw new Error(retryData.error);
                }
                return retryData as TData;
              } catch (retryErr: any) {
                if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
                  throw new Error('Session expired');
                }
                throw retryErr;
              }
            } else {
              throw new Error('Session expired');
            }
          } else {
            throw new Error('Session expired');
          }
        }
        throw err;
      }
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


