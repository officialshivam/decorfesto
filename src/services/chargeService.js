import { getApiBaseUrl } from './apiConfig.js';
import { getAdminAuthHeaders } from './adminAuthService.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

const SETTINGS_STORAGE_KEY = 'decorfesto-admin-settings';

export const defaultCharges = [
  {
    id: 'booking_service_fee',
    name: 'Booking Service Fee',
    amount: 100,
    enabled: true,
    description: 'Booking/service charge applied to customer checkouts.',
    type: 'FIXED',
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:00:00.000Z',
  },
];

function sanitizeCharge(c) {
  if (!c) return null;
  const amt = Number(c.amount ?? c.fee);
  return {
    id: String(c.id || `charge_${Date.now()}`).trim(),
    name: String(c.name || 'Service Charge').trim(),
    amount: !isNaN(amt) && amt >= 0 ? amt : 0,
    enabled: c.enabled !== false,
    description: String(c.description || '').trim(),
    type: c.type || 'FIXED',
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString(),
  };
}

export async function fetchEnabledChargesApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/charges/enabled?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching enabled charges`);
        continue;
      }

      const data = await response.json();
      const rawList = Array.isArray(data.charges) ? data.charges : (Array.isArray(data) ? data : []);
      const sanitized = rawList.map(sanitizeCharge).filter((c) => c && c.enabled);
      if (sanitized.length > 0) {
        writeSettings({ charges: sanitized });
      }
      return sanitized;
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('fetchEnabledChargesApi fallback to stored settings:', lastError?.message);
  return readSettings().charges.filter((c) => c.enabled);
}

export async function fetchAdminChargesApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/charges?_t=${Date.now()}`, {
        method: 'GET',
        headers: getAdminAuthHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching admin charges`);
        continue;
      }

      const data = await response.json();
      const rawList = Array.isArray(data.charges) ? data.charges : (Array.isArray(data) ? data : []);
      const sanitized = rawList.map(sanitizeCharge).filter(Boolean);
      if (sanitized.length > 0) {
        writeSettings({ charges: sanitized });
      }
      return sanitized;
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('fetchAdminChargesApi fallback to stored settings:', lastError?.message);
  return readSettings().charges;
}

export async function updateAdminChargeApi(id, updates) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/charges/${id}`, {
        method: 'PUT',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify(updates),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} updating admin charge`);
        continue;
      }

      const data = await response.json();
      const updated = sanitizeCharge(data.charge || data);
      updateCharge(id, updates);
      return updated;
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('updateAdminChargeApi local fallback:', lastError?.message);
  return updateCharge(id, updates);
}

export async function createAdminChargeApi(chargeData) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/charges`, {
        method: 'POST',
        headers: getAdminAuthHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify(chargeData),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} creating admin charge`);
        continue;
      }

      const data = await response.json();
      const created = sanitizeCharge(data.charge || data);
      addCharge(chargeData);
      return created;
    } catch (err) {
      lastError = err;
    }
  }

  return addCharge(chargeData);
}

export async function deleteAdminChargeApi(id) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/admin/charges/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders({ Accept: 'application/json' }),
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} deleting admin charge`);
        continue;
      }

      deleteCharge(id);
      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  return deleteCharge(id);
}

export function readSettings() {
  if (typeof window === 'undefined') {
    return { charges: defaultCharges.map(sanitizeCharge) };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const initial = { charges: defaultCharges.map(sanitizeCharge) };
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    let chargesList = [];

    if (Array.isArray(parsed.charges)) {
      chargesList = parsed.charges.map(sanitizeCharge);
    } else if (typeof parsed.serviceFee === 'number') {
      chargesList = [
        sanitizeCharge({
          id: 'booking_service_fee',
          name: 'Booking Service Fee',
          amount: parsed.serviceFee,
          enabled: true,
          description: 'Booking/service charge applied to customer checkouts.',
        }),
      ];
    } else {
      chargesList = defaultCharges.map(sanitizeCharge);
    }

    return { charges: chargesList };
  } catch (err) {
    console.warn('Unable to read charges settings from storage.', err);
    return { charges: defaultCharges.map(sanitizeCharge) };
  }
}

export function writeSettings(settings) {
  if (typeof window !== 'undefined' && settings) {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}

export function getCharges() {
  return readSettings().charges;
}

export function getStoredCharges() {
  return getCharges();
}

export function getEnabledCharges() {
  return getCharges().filter((c) => c.enabled === true);
}

export function calculateTotalCharges() {
  return getEnabledCharges().reduce((sum, c) => sum + c.amount, 0);
}

export function updateCharge(id, updates) {
  const settings = readSettings();
  const nextCharges = settings.charges.map((c) => {
    if (c.id !== id) return c;
    return sanitizeCharge({ ...c, ...updates, updatedAt: new Date().toISOString() });
  });

  const updatedSettings = { ...settings, charges: nextCharges };
  writeSettings(updatedSettings);
  return nextCharges.find((c) => c.id === id) || null;
}

export function addCharge({ name, amount, description = '', enabled = true, type = 'FIXED' }) {
  const settings = readSettings();
  const newCharge = sanitizeCharge({
    id: `charge_${Date.now().toString().slice(-6)}`,
    name,
    amount,
    description,
    enabled,
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const updatedSettings = {
    ...settings,
    charges: [...settings.charges, newCharge],
  };

  writeSettings(updatedSettings);
  return newCharge;
}

export function deleteCharge(id) {
  const settings = readSettings();
  const nextCharges = settings.charges.filter((c) => c.id !== id);
  writeSettings({ ...settings, charges: nextCharges });
  return { ok: true };
}

export function calculateItemSubtotal(item) {
  if (!item) return 0;
  const qty = Number(item.quantity) || 1;
  const base = Number(item.basePrice ?? item.totalPrice) || 0;
  const addOns = Number(item.customizationTotal ?? item.addOnTotal) || 0;
  const unitTotal = typeof item.totalPrice === 'number' && item.totalPrice > 0
    ? item.totalPrice
    : base + addOns;
  return unitTotal * qty;
}
