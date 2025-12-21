import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

const API_BASE = '/api';

const buildHeaders = () => {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

interface ApiGetCallProps {
  url: string;
  queryKey: string;
  params?: Record<string, string | number | boolean>;
  enabled?: boolean;
  retry?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  onError?: (error: AxiosError) => void;
}

export function useApiGet<TData = unknown>(props: ApiGetCallProps) {
  const {
    url,
    queryKey,
    params,
    enabled = true,
    retry = 3,
    staleTime = 300000,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    onError,
  } = props;

  const queryInfo = useQuery<TData, AxiosError>({
    queryKey: [queryKey, params],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await axios.get(`${API_BASE}/${url}`, {
        signal,
        params,
        headers: buildHeaders(),
      });
      return response.data;
    },
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: (failureCount, error) => {
      const HTTP_STATUS_TO_NOT_RETRY = [401, 403, 404, 500];
      
      if (failureCount >= retry) {
        return false;
      }
      
      if (axios.isAxiosError(error) && HTTP_STATUS_TO_NOT_RETRY.includes(error.response?.status ?? 0)) {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return false;
      }
      
      return true;
    },
  });

  // Call onError if provided and there's an error
  if (queryInfo.error && onError) {
    onError(queryInfo.error);
  }

  return queryInfo;
}

interface ApiMutationCallProps<TData = unknown> {
  relatedQueryKeys?: string[];
  onSuccess?: (data: TData) => void;
  onError?: (error: AxiosError) => void;
}

export function useApiPost<TData = unknown, TVariables = Record<string, unknown>>(
  props?: ApiMutationCallProps<TData>
) {
  const queryClient = useQueryClient();
  const { relatedQueryKeys, onSuccess, onError } = props || {};

  const mutation = useMutation<TData, AxiosError, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const response = await axios.post(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      if (onError) {
        onError(error);
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

  const mutation = useMutation<TData, AxiosError, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const response = await axios.put(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      if (onError) {
        onError(error);
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

  const mutation = useMutation<TData, AxiosError, { url: string }>({
    mutationFn: async ({ url }) => {
      const response = await axios.delete(`${API_BASE}/${url}`, {
        headers: buildHeaders(),
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (relatedQueryKeys) {
        relatedQueryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
      if (onError) {
        onError(error);
      }
    },
  });

  return mutation;
}
