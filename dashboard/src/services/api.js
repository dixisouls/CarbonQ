/**
 * API service — all calls to the CarbonQ backend.
 *
 * Uses the Firebase ID-token from the currently signed-in user for
 * every authenticated request.
 */

import { auth } from '../firebase';

const API_BASE = 'http://localhost:8000/api';

// ── Token helper ───────────────────────────────────────────────────────

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

// ── Generic fetch wrapper ──────────────────────────────────────────────

async function apiFetch(endpoint, options = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }

  return res.json();
}

// ── Dashboard API ──────────────────────────────────────────────────────

export async function fetchStats() {
  return apiFetch('/dashboard/stats');
}

export async function fetchPlatforms() {
  return apiFetch('/dashboard/platforms');
}

export async function fetchRecent(limit = 15) {
  return apiFetch(`/dashboard/recent?limit=${limit}`);
}

export async function fetchWeekly() {
  return apiFetch('/dashboard/weekly');
}

// ── Auth API (backend endpoints, not used by default) ──────────────────

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Login failed');
  }
  return res.json();
}

export async function apiRegister(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || 'Registration failed');
  }
  return res.json();
}

export async function apiRefreshToken(refreshToken) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error('Token refresh failed');
  }
  return res.json();
}

export async function apiGetMe() {
  return apiFetch('/auth/me');
}

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
