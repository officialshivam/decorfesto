import { getApiBaseUrl } from './apiConfig.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

const SETTINGS_STORAGE_KEY = 'decorfesto-admin-settings';

export const defaultCharges = [
  {
    id: 'booking_service_fee',
    name: 'Booking Service Fee',
    amount: 1,
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
      const response = await fetch(`${base}/charges/enabled`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching enabled charges`);
        continue;
      }

      const data = await response.json();
      const rawList = Array.isArray(data.charges) ? data.charges : (Array.isArray(data) ? data : []);
      return rawList.map(sanitizeCharge).filter((c) => c && c.enabled);
    } catch (err) {
      lastError = err;
    }
  }

  console.error('fetchEnabledChargesApi error:', lastError);
  throw lastError || new Error('Failed to fetch enabled charges from server.');
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
