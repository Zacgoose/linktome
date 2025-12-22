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
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
        }
      }
    } catch {}
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

// Standard API response format from backend
interface ApiResponse<TData> {
  success: boolean;
  error?: string;
  data?: TData;
}

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Helper to handle API errors and redirects
const handleApiError = (error: AxiosError) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Only redirect once, even if multiple API calls fail
    if (!isRedirecting && typeof window !== 'undefined') {
      isRedirecting = true;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
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
      const headers = await buildHeaders();
      const response = await axios.get<ApiResponse<TData> | TData>(`${API_BASE}/${url}`, {
        signal,
        params,
        headers,
      });
      const data = response.data;
      // Check if response has the { success, error, data } format
      if (typeof data === 'object' && data !== null && 'success' in data) {
        const apiResponse = data as ApiResponse<TData>;
        if (!apiResponse.success && apiResponse.error) {
          if (onError) {
            onError(apiResponse.error);
          }
          throw new Error(apiResponse.error);
        }
        const result = apiResponse.data ?? apiResponse;
        if (onSuccess) {
          onSuccess(result);
        }
        return result as TData;
      }
      if (onSuccess) {
        onSuccess(data);
      }
      return data as TData;
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
      const response = await axios.post<ApiResponse<TData> | TData>(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Check if response has the { success, error, data } format
      if (typeof responseData === 'object' && responseData !== null && 'success' in responseData) {
        const apiResponse = responseData as ApiResponse<TData>;
        
        // Handle backend error responses
        if (!apiResponse.success && apiResponse.error) {
          throw new Error(apiResponse.error);
        }
        
        // Return the actual data from the backend response
        return (apiResponse.data ?? apiResponse) as TData;
      }
      
      // Response is already in the expected format (e.g., Login returns { accessToken, user })
      return responseData as TData;
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
      const response = await axios.put<ApiResponse<TData> | TData>(`${API_BASE}/${url}`, data, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Check if response has the { success, error, data } format
      if (typeof responseData === 'object' && responseData !== null && 'success' in responseData) {
        const apiResponse = responseData as ApiResponse<TData>;
        
        // Handle backend error responses
        if (!apiResponse.success && apiResponse.error) {
          throw new Error(apiResponse.error);
        }
        
        // Return the actual data from the backend response
        return (apiResponse.data ?? apiResponse) as TData;
      }
      
      // Response is already in the expected format
      return responseData as TData;
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
      const response = await axios.delete<ApiResponse<TData> | TData>(`${API_BASE}/${url}`, {
        headers: buildHeaders(),
      });
      
      const responseData = response.data;
      
      // Check if response has the { success, error, data } format
      if (typeof responseData === 'object' && responseData !== null && 'success' in responseData) {
        const apiResponse = responseData as ApiResponse<TData>;
        
        // Handle backend error responses
        if (!apiResponse.success && apiResponse.error) {
          throw new Error(apiResponse.error);
        }
        
        // Return the actual data from the backend response
        return (apiResponse.data ?? apiResponse) as TData;
      }
      
      // Response is already in the expected format
      return responseData as TData;
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
