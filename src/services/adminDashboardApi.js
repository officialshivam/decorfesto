import { getStoredOrders } from './mockAuth';
import { getStoredVendors } from './mockVendors';
import { getStoredServiceAreas } from './mockServiceAreas';
import { getStoredDecorations } from './mockDecorations';
import { getStoredCategories } from './mockCategories';

import { getApiBaseUrl } from './apiConfig.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base] : [''];
}

async function getJson(path, extraHeaders = {}) {
  const bases = resolveApiBases();
  let lastError;

  const headers = { ...extraHeaders };
  const sessionToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('decorfesto_admin_token') : null;
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        lastError = new Error(`Request to ${base}${path} failed with status ${response.status}.`);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function loginAdminCredentials({ username, password }) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Admin authentication failed.');
      }

      if (data.token && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('decorfesto_admin_token', data.token);
      }

      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function fetchBackendDashboard() {
  return getJson('/admin/dashboard');
}

export async function fetchHealth() {
  return getJson('/health');
}

export async function fetchAdminDashboard() {
  const [backend, health, orders, vendors, serviceAreas, decorations, categories] = await Promise.all([
    fetchBackendDashboard().catch(() => null),
    fetchHealth().catch(() => null),
    Promise.resolve(getStoredOrders()),
    Promise.resolve(getStoredVendors()),
    Promise.resolve(getStoredServiceAreas()),
    Promise.resolve(getStoredDecorations()),
    Promise.resolve(getStoredCategories()),
  ]);

  return {
    client: { orders, vendors, serviceAreas, decorations, categories },
    backend,
    health,
    fetchedAt: new Date().toISOString(),
  };
}
