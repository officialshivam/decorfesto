import { getApiBaseUrl } from './apiConfig.js';
import { getAdminAuthHeaders } from './adminAuthService.js';
import { getCustomerAuthHeaders } from './customerAuthService.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

export async function fetchAvailableCouponsApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/coupons/available?_t=${Date.now()}`, {
        method: 'GET',
        headers: getCustomerAuthHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching available coupons`);
        continue;
      }

      const data = await response.json();
      return Array.isArray(data.coupons) ? data.coupons : [];
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('fetchAvailableCouponsApi failed:', lastError?.message);
  return [];
}

export async function validateCouponApi({ code, subtotal, items = [], customerId, customerPhone }) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/coupons/validate`, {
        method: 'POST',
        headers: getCustomerAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify({ code, subtotal, items, customerId, customerPhone }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(errorData.error || errorData.message || `HTTP ${response.status} validating coupon`);
        continue;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      lastError = err;
    }
  }

  return { valid: false, message: lastError?.message || 'Failed to connect to coupon validation service.' };
}

export async function fetchAdminCouponsApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/coupons?_t=${Date.now()}`, {
        method: 'GET',
        headers: getAdminAuthHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching admin coupons`);
        continue;
      }

      const data = await response.json();
      return Array.isArray(data.coupons) ? data.coupons : [];
    } catch (err) {
      lastError = err;
    }
  }

  console.error('fetchAdminCouponsApi failed:', lastError?.message);
  throw lastError || new Error('Failed to fetch coupons from server.');
}

export async function createAdminCouponApi(couponData) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/coupons`, {
        method: 'POST',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify(couponData),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status} creating admin coupon`);
      }

      return data.coupon || data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to create coupon on server.');
}

export async function updateAdminCouponApi(id, updates) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/coupons/${id}`, {
        method: 'PUT',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify(updates),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status} updating admin coupon`);
      }

      return data.coupon || data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to update coupon on server.');
}

export async function deleteAdminCouponApi(id) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders({
          Accept: 'application/json',
        }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status} deleting admin coupon`);
      }

      return { success: true };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to delete coupon on server.');
}
