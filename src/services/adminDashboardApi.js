import { getStoredOrders } from './mockAuth';
import { getStoredVendors } from './mockVendors';
import { getStoredServiceAreas } from './mockServiceAreas';
import { getStoredDecorations } from './mockDecorations';
import { getStoredCategories } from './mockCategories';

function resolveApiBases() {
  const bases = [window.location.origin];
  if (window.location.port === '5173') {
    bases.push('http://localhost:4100');
  }
  return bases;
}

async function getJson(path, extraHeaders = {}) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: 'GET',
        headers: { 'X-User-Role': 'admin', ...extraHeaders },
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
