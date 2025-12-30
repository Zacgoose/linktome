import axios from 'axios';
import type { ApiError } from '@/types/api';

const API_BASE = '/api';

const buildHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Tokens are now in HTTP-only cookies, not in localStorage
  // The browser will automatically send cookies with requests
  
  return headers;
};

// Configure axios defaults to send cookies with requests
axios.defaults.withCredentials = true;

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

/**
 * Handle API errors globally
 * Redirects to login on 401 (Unauthorized)
 */
const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      // Tokens are in HTTP-only cookies, managed by backend
      // Redirect to login page on unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login?session=expired';
      }
    }
  }
};

export const apiGet = async (endpoint: string, params?: Record<string, string | number | boolean>) => {
  try {
    const response = await axios.get(`${API_BASE}/${endpoint}`, {
      params,
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Re-throw with extracted error message
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage);
  }
};

export const apiPost = async (endpoint: string, data?: Record<string, unknown>) => {
  try {
    const response = await axios.post(`${API_BASE}/${endpoint}`, data, {
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Re-throw with extracted error message
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage);
  }
};

export const apiPut = async (endpoint: string, data?: Record<string, unknown>) => {
  try {
    const response = await axios.put(`${API_BASE}/${endpoint}`, data, {
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Re-throw with extracted error message
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage);
  }
};

export const apiDelete = async (endpoint: string) => {
  try {
    const response = await axios.delete(`${API_BASE}/${endpoint}`, {
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    // Re-throw with extracted error message
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage);
  }
};