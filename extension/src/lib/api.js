/**
 * API client for CarbonQ extension
 * Communicates with the backend API using fetch with credentials
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api';

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Send cookies
  };

  console.log('[CarbonQ API] Request:', url, config);

  try {
    const response = await fetch(url, config);
    console.log('[CarbonQ API] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        // Clear stored auth state
        await chrome.storage.local.remove(['carbonq_user', 'carbonq_logged_in']);
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      
      // Handle validation errors (422) which return detail as an array
      if (Array.isArray(error.detail)) {
        const firstError = error.detail[0];
        throw new Error(firstError?.msg || 'Validation failed');
      }
      
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  } catch (err) {
    console.error('[CarbonQ API] Fetch error:', err);
    throw err;
  }
}

/**
 * Authentication API
 */
export const authAPI = {
  async login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store user info in chrome.storage
    await chrome.storage.local.set({
      carbonq_user: data.user,
      carbonq_logged_in: true,
    });
    
    return data;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    
    // Clear stored auth state
    await chrome.storage.local.remove(['carbonq_user', 'carbonq_logged_in']);
  },

  async me() {
    return apiRequest('/auth/me');
  },
};

/**
 * Dashboard API
 */
export const dashboardAPI = {
  async stats() {
    return apiRequest('/dashboard/stats');
  },

  async recent(limit = 15) {
    return apiRequest(`/dashboard/recent?limit=${limit}`);
  },

  async submitQuery(platform, carbonGrams) {
    // Note: This endpoint needs to be created in the backend
    return apiRequest('/dashboard/query', {
      method: 'POST',
      body: JSON.stringify({ platform, carbon_grams: carbonGrams }),
    });
  },
};

/**
 * Check if user is logged in
 */
export async function isLoggedIn() {
  const { carbonq_logged_in } = await chrome.storage.local.get('carbonq_logged_in');
  return !!carbonq_logged_in;
}

/**
 * Get current user from storage
 */
export async function getCurrentUser() {
  const { carbonq_user } = await chrome.storage.local.get('carbonq_user');
  return carbonq_user || null;
}
