import { getApiBaseUrl } from './apiConfig.js';

const API_BASE_URL = getApiBaseUrl();

export function getAdminAuthHeaders(extraHeaders = {}) {
  const headers = { Accept: 'application/json', ...extraHeaders };
  if (typeof sessionStorage !== 'undefined') {
    const token = sessionStorage.getItem('decorfesto_admin_token');
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function checkAdminSessionApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/admin-me`, {
      method: 'GET',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return { authenticated: false };
    const data = await res.json().catch(() => ({}));
    if (data.authenticated) {
      return { authenticated: true, user: data.user || { username: 'admin', role: 'ADMIN' } };
    }
    return { authenticated: false };
  } catch (err) {
    console.warn('checkAdminSessionApi network error', err);
    return { authenticated: false };
  }
}

export async function loginAdminApi({ username, password }) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Invalid admin credentials.' };
    }

    if (data.success) {
      const user = data.user || { username: username || 'admin', role: 'ADMIN' };
      return { ok: true, user };
    }

    return { ok: false, error: 'Authentication failed. Invalid response from server.' };
  } catch (err) {
    console.error('loginAdminApi error:', err);
    return { ok: false, error: 'Network error during login. Please check connection.' };
  }
}

export async function logoutAdminApi() {
  try {
    await fetch(`${API_BASE_URL}/auth/admin-logout`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    });
  } catch (err) {
    console.warn('logoutAdminApi network error', err);
  }
}

