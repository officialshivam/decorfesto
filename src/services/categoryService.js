import { getApiBaseUrl } from './apiConfig.js';
import { getAdminAuthHeaders } from './adminAuthService.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

export function sanitizeCategory(item) {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || '').trim();
  const id = String(item.id || `category-${name.toLowerCase().replace(/\s+/g, '-')}`).trim();
  return {
    id,
    name,
    displayOrder: Number(item.displayOrder ?? item.display_order ?? 0),
    active: item.active !== false && item.status !== 'INACTIVE',
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

export async function fetchCategoriesApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/categories`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching categories`);
        continue;
      }

      const data = await response.json();
      const rawList = Array.isArray(data.categories) ? data.categories : (Array.isArray(data) ? data : []);
      const list = rawList.map(sanitizeCategory).filter(Boolean);
      list.sort((a, b) => a.displayOrder - b.displayOrder);
      return list;
    } catch (err) {
      lastError = err;
    }
  }

  console.error('fetchCategoriesApi error:', lastError);
  throw lastError || new Error('Failed to fetch categories from server.');
}

export async function createCategoryApi(categoryData) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/categories`, {
        method: 'POST',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(categoryData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || `HTTP ${response.status} creating category`);
        continue;
      }

      const data = await response.json();
      return sanitizeCategory(data.category || data);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to create category.');
}

export async function updateCategoryApi(id, categoryData) {
  const targetId = String(id).trim();
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/categories/${targetId}`, {
        method: 'PUT',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(categoryData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || `HTTP ${response.status} updating category`);
        continue;
      }

      const data = await response.json();
      return sanitizeCategory(data.category || data);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to update category.');
}

export async function toggleCategoryStatusApi(id, active) {
  const targetId = String(id).trim();
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/categories/${targetId}/status`, {
        method: 'PATCH',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ active }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || `HTTP ${response.status} toggling category status`);
        continue;
      }

      const data = await response.json();
      return sanitizeCategory(data.category || data);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to update category status.');
}

export async function deleteCategoryApi(id) {
  const targetId = String(id).trim();
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/categories/${targetId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || `HTTP ${response.status} deleting category`);
        continue;
      }

      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to delete category.');
}
