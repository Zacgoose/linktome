import axios from 'axios';

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

export const apiGet = async (endpoint: string, params?: Record<string, string | number | boolean>) => {
  try {
    const response = await axios.get(`${API_BASE}/${endpoint}`, {
      params,
      headers: buildHeaders(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const apiPost = async (endpoint: string, data?: Record<string, unknown>) => {
  try {
    const response = await axios.post(`${API_BASE}/${endpoint}`, data, {
      headers: buildHeaders(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const apiPut = async (endpoint: string, data?: Record<string, unknown>) => {
  try {
    const response = await axios.put(`${API_BASE}/${endpoint}`, data, {
      headers: buildHeaders(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const apiDelete = async (endpoint: string) => {
  try {
    const response = await axios.delete(`${API_BASE}/${endpoint}`, {
      headers: buildHeaders(),
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      // Tokens are in HTTP-only cookies, managed by backend
      // Just redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
};