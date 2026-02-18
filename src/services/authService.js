import apiClient, { handleApiError } from './api';

// Auth Service - handles all authentication related API calls
const authService = {
  // Login user
  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', {
      email: email.trim(),
      password,
    });
    return response.data;
  },

  // Check admin status
  checkAdminStatus: async () => {
    const response = await apiClient.get('/api/auth/check-admin');
    return response.data;
  },

  // Logout user (client-side)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userName');
  },

  // Get current auth state
  getAuthState: () => ({
    token: localStorage.getItem('token'),
    isAdmin: localStorage.getItem('isAdmin') === 'true',
    userName: localStorage.getItem('userName'),
    isAuthenticated: !!localStorage.getItem('token'),
  }),

  // Save auth state
  saveAuthState: (token, isAdmin, email) => {
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', isAdmin.toString());
    if (email) localStorage.setItem('userName', email);
  },
};

export default authService;
