import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send cookies with requests
});

// Simple 401 error handler - redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Session expired or invalid, redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password) => api.post('/auth/register', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  platforms: () => api.get('/dashboard/platforms'),
  recent: (limit = 15) => api.get(`/dashboard/recent?limit=${limit}`),
  weekly: () => api.get('/dashboard/weekly'),
  googleSearchComparison: () => api.get('/dashboard/google-search-comparison'),
};

export default api;
