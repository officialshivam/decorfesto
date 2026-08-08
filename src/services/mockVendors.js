const VENDORS_STORAGE_KEY = 'decorfesto-admin-vendors';

const initialVendors = [
  {
    id: 'vendor-001',
    name: 'DecorFesto Studio',
    contactName: 'Aarav Mehta',
    phone: '+919876543210',
    email: 'vendor@decorfesto.com',
    servicePincodes: ['110001', '400001'],
    specialties: ['Balloon', 'Floral', 'Birthday'],
    status: 'active',
  },
];

function readVendors() {
  if (typeof window === 'undefined') {
    return initialVendors;
  }

  try {
    const stored = window.localStorage.getItem(VENDORS_STORAGE_KEY);
    if (!stored) {
      return initialVendors;
    }

    const vendors = JSON.parse(stored);
    return Array.isArray(vendors) ? vendors : initialVendors;
  } catch (error) {
    console.warn('Unable to read saved vendors.', error);
    return initialVendors;
  }
}

function writeVendors(vendors) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(vendors));
  }
}

export function getStoredVendors() {
  return readVendors();
}

export function saveStoredVendor(vendor) {
  const vendors = readVendors();
  const now = new Date().toISOString();
  const existingVendor = vendors.find((entry) => entry.id === vendor.id);
  const nextVendor = {
    ...existingVendor,
    ...vendor,
    id: vendor.id || `vendor-${Date.now()}`,
    createdAt: existingVendor?.createdAt || now,
    updatedAt: now,
  };
  const nextVendors = existingVendor
    ? vendors.map((entry) => (entry.id === nextVendor.id ? nextVendor : entry))
    : [...vendors, nextVendor];

  writeVendors(nextVendors);
  return nextVendor;
}
