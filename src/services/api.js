import axios from 'axios';
import config from '../config';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - add auth token to requests
apiClient.interceptors.request.use(
  (requestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    
    // Handle authentication errors
    if (status === 401 || status === 403) {
      // Clear auth data on unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userName');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Retry utility with exponential backoff
export const withRetry = async (fn, retries = config.api.retryAttempts, delay = config.api.retryDelay) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Retry ${i + 1}/${retries} failed:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

// Error handler utility
export const handleApiError = (error, operation) => {
  const status = error.response?.status;
  let message = `Failed to ${operation}. Please try again.`;

  if (error.response) {
    message = error.response.data?.error || error.response.data?.message || message;
    if (status === 401) {
      message = 'Invalid email or password.';
    } else if (status === 400) {
      message = error.response.data?.error || 'Invalid request data.';
    } else if (status === 403) {
      message = error.response.data?.error || 'Access denied.';
    } else if (status >= 500) {
      message = 'Server error. Please try again later.';
    }
  } else if (error.request) {
    message = 'Network error. Please check your connection.';
  } else if (error.code === 'ECONNABORTED') {
    message = 'Request timeout. Please try again.';
  }

  console.error(`${operation} error:`, status, message);
  return { message, status };
};

export default apiClient;
