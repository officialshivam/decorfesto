const SETTINGS_STORAGE_KEY = 'decorfesto-admin-settings';

const DEFAULT_CHARGES = [
  {
    id: 'booking_service_fee',
    name: 'Booking Service Fee',
    amount: 299,
    enabled: true,
    description: 'Booking/service charge applied to customer checkouts.',
  },
];

const DEFAULT_SETTINGS = {
  serviceFee: 299,
  charges: DEFAULT_CHARGES,
};

export function getStoredSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    const chargesList = Array.isArray(parsed.charges) && parsed.charges.length > 0
      ? parsed.charges
      : DEFAULT_CHARGES;

    return {
      serviceFee: parsed.serviceFee !== undefined ? parsed.serviceFee : 299,
      charges: chargesList,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateStoredSettings(updates) {
  const current = getStoredSettings();
  let nextCharges = [...current.charges];

  if (updates && Array.isArray(updates.charges)) {
    nextCharges = updates.charges;
  }

  const primaryFee = nextCharges.find((c) => c.id === 'booking_service_fee');
  const legacyFee = primaryFee ? (primaryFee.enabled ? primaryFee.amount : 0) : 0;

  const nextSettings = {
    serviceFee: legacyFee,
    charges: nextCharges,
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    window.dispatchEvent(new Event('decorfesto-settings-updated'));
  }

  return nextSettings;
}

export function getStoredCharges() {
  return getStoredSettings().charges || DEFAULT_CHARGES;
}

export function getEnabledCharges() {
  return getStoredCharges().filter(
    (c) => c.enabled && typeof c.amount === 'number' && !isNaN(c.amount) && c.amount >= 0,
  );
}

export function calculateTotalCharges() {
  return getEnabledCharges().reduce((sum, c) => sum + (c.amount || 0), 0);
}

export function getStoredServiceFee() {
  return calculateTotalCharges();
}

export function updateCharge(id, updates) {
  const charges = getStoredCharges();
  const nextCharges = charges.map((c) => (c.id === id ? { ...c, ...updates } : c));
  updateStoredSettings({ charges: nextCharges });
  return getStoredSettings();
}

export function addCharge(charge) {
  const charges = getStoredCharges();
  const newCharge = {
    id: charge.id || `charge_${Date.now()}`,
    name: charge.name || 'New Charge',
    amount: typeof charge.amount === 'number' ? charge.amount : Number(charge.amount) || 0,
    enabled: charge.enabled !== false,
    description: charge.description || 'Configured checkout charge.',
  };
  updateStoredSettings({ charges: [...charges, newCharge] });
  return getStoredSettings();
}

export function deleteCharge(id) {
  const charges = getStoredCharges();
  const nextCharges = charges.filter((c) => c.id !== id);
  updateStoredSettings({ charges: nextCharges });
  return getStoredSettings();
}

export function calculateItemSubtotal(item) {
  if (!item) return 0;
  const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;

  if (typeof item.totalPrice === 'number' && !isNaN(item.totalPrice) && item.totalPrice > 0) {
    return item.totalPrice * qty;
  }

  const base = Number(item.basePrice || item.price || 0);
  const addOn = Number(item.addOnPrice || 0);
  const unitPrice = (!isNaN(base) ? base : 0) + (!isNaN(addOn) ? addOn : 0);
  return unitPrice * qty;
}
