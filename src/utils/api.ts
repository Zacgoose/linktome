import axios from 'axios';

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

export const apiGet = async (endpoint: string, params?: any) => {
  try {
    const response = await axios.get(`${API_BASE}/${endpoint}`, {
      params,
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const apiPost = async (endpoint: string, data?: any) => {
  try {
    const response = await axios.post(`${API_BASE}/${endpoint}`, data, {
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
};