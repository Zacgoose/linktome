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

// Standard API response format from backend
interface ApiResponse<TData> {
  success: boolean;
  error?: string;
  data?: TData;
}

// Helper to handle API errors and redirects
const handleApiError = (error: AxiosError) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    localStorage.removeItem('accessToken');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
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
  enabled?: boolean;
  retry?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
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
    onSuccess,
    onError,
  } = props;

  const queryInfo = useQuery<TData, AxiosError>({
    queryKey: [queryKey, params],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await axios.get<ApiResponse<TData>>(`${API_BASE}/${url}`, {
        signal,
        params,
        headers: buildHeaders(),
      });
      
      const data = response.data;
      
      // Handle backend error responses
      if (!data.success && data.error) {
        if (onError) {
          onError(data.error);
        }
        throw new Error(data.error);
      }
      
      // Return the actual data from the backend response
      const result = data.data ?? data;
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result as TData;
    },
    staleTime,
    refetchOnWindowFocus,
    refetchOnMount,
    retry: createRetryFn(retry),
  });

  // Handle axios errors
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

  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const response = await axios.post<ApiResponse<TData>>(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Handle backend error responses
      if (!responseData.success && responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Return the actual data from the backend response
      return (responseData.data ?? responseData) as TData;
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

  const mutation = useMutation<TData, Error, { url: string; data?: TVariables }>({
    mutationFn: async ({ url, data }) => {
      const response = await axios.put<ApiResponse<TData>>(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Handle backend error responses
      if (!responseData.success && responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Return the actual data from the backend response
      return (responseData.data ?? responseData) as TData;
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

  const mutation = useMutation<TData, Error, { url: string }>({
    mutationFn: async ({ url }) => {
      const response = await axios.delete<ApiResponse<TData>>(`${API_BASE}/${url}`, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Handle backend error responses
      if (!responseData.success && responseData.error) {
        throw new Error(responseData.error);
      }
      
      // Return the actual data from the backend response
      return (responseData.data ?? responseData) as TData;
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
