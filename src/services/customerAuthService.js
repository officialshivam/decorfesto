import { getApiBaseUrl } from './apiConfig.js';

const API_BASE_URL = getApiBaseUrl();

export function getCustomerAuthHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  try {
    const token = localStorage.getItem('decorfesto_customer_token') || localStorage.getItem('customer_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export async function customerSignupApi(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/customer-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    return { ok: false, error: data.error || 'Signup failed.' };
  }
  if (data.token) {
    try {
      localStorage.setItem('decorfesto_customer_token', data.token);
    } catch {}
  }
  return { ok: true, user: data.user, token: data.token };
}

export async function customerLoginApi(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/customer-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    return { ok: false, error: data.error || 'Login failed.' };
  }
  if (data.token) {
    try {
      localStorage.setItem('decorfesto_customer_token', data.token);
    } catch {}
  }
  return { ok: true, user: data.user, token: data.token };
}

export async function getCustomerMeApi() {
  try {
    const headers = getCustomerAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/auth/customer-me`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      return { ok: false, user: null };
    }
    const data = await response.json();
    if (data.authenticated && data.user) {
      return { ok: true, user: data.user };
    }
    return { ok: false, user: null };
  } catch {
    return { ok: false, user: null };
  }
}

export async function customerLogoutApi() {
  try {
    localStorage.removeItem('decorfesto_customer_token');
    localStorage.removeItem('customer_token');
  } catch {}
  try {
    await fetch(`${API_BASE_URL}/auth/customer-logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {}
  return { ok: true };
}
