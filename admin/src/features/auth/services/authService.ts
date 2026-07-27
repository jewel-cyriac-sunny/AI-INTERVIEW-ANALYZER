/* Auth Service - handles login, logout, token management */
/* TODO: connect to FastAPI backend */

import apiClient from '@/services/apiClient';

const AUTH_TOKEN_KEY = 'auth_token';
const HASH_SALT = import.meta.env.VITE_HASH_SALT || 'default_salt';

export const authService = {
  async login(email, password) {
    /* TODO: connect FastAPI backend */
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      }
      return response;
    } catch (err) {
      // Re-throw with a user-friendly message
      if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
        throw new Error('Unable to connect to the server. Please ensure the backend is running.');
      }
      throw err;
    }
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    window.location.href = '/login';
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  async getProfile() {
    /* TODO: connect FastAPI backend */
    try {
      return await apiClient.get('/auth/me');
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
        throw new Error('Backend unavailable');
      }
      throw err;
    }
  },
};

export default authService;
