/* API Client - Central HTTP client for all API requests */
/* TODO: connect to FastAPI backend */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiClient = {
  async request(endpoint, options: any = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
      const error = await response.json().catch(() => ({}));
      let message = 'Unauthorized';
      if (typeof error.detail === 'string') {
        message = error.detail;
      }
      
      // Do not redirect to login page if the request is actually an attempt to login
      if (!endpoint.includes('/login')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      
      throw new Error(message);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      let message = 'Request failed';
      if (typeof error.detail === 'string') {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (error.detail) {
        message = JSON.stringify(error.detail);
      }
      throw new Error(message);
    }

    return response.json();
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  /* For file uploads (CSV, etc.) */
  async upload(endpoint, formData) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },
};

export default apiClient;
