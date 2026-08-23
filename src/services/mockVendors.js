const VENDORS_STORAGE_KEY = 'decorfesto-admin-vendors';

export const initialVendors = [
  {
    id: 'vendor-001',
    name: 'DecorFesto Studio',
    contactName: 'Aarav Mehta',
    phone: '+919876543210',
    email: 'vendor@decorfesto.com',
    passwordHash: 'VendorPassword123!',
    servicePincodes: ['110001', '110032', '400001'],
    specialties: ['Balloon', 'Floral', 'Birthday'],
    role: 'VENDOR',
    accountStatus: 'active',
    status: 'active',
    createdAt: '2026-08-08T17:30:32.319Z',
    updatedAt: '2026-08-08T17:30:32.319Z',
  },
  {
    id: 'vendor-002',
    name: 'Delhi Celebrations Co.',
    contactName: 'Priya Sharma',
    phone: '+919812345670',
    email: 'delhi@decorfesto.com',
    passwordHash: 'VendorPassword123!',
    servicePincodes: ['110001', '110032'],
    specialties: ['Balloon', 'Kids', 'Corporate'],
    role: 'VENDOR',
    accountStatus: 'active',
    status: 'active',
    createdAt: '2026-08-09T14:23:13.673Z',
    updatedAt: '2026-08-09T14:23:13.675Z',
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
    return Array.isArray(vendors) && vendors.length > 0 ? vendors : initialVendors;
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

export function getVendorById(vendorId) {
  const vendors = readVendors();
  return vendors.find((v) => v.id === vendorId) || null;
}

export function saveStoredVendor(vendor) {
  const vendors = readVendors();
  const now = new Date().toISOString();
  const existingVendor = vendors.find((entry) => entry.id === vendor.id);
  const nextVendor = {
    ...existingVendor,
    ...vendor,
    id: vendor.id || `vendor-${Date.now()}`,
    passwordHash: vendor.passwordHash || existingVendor?.passwordHash || 'VendorPassword123!',
    role: 'VENDOR',
    accountStatus: vendor.accountStatus || vendor.status || existingVendor?.accountStatus || 'active',
    status: vendor.status || vendor.accountStatus || existingVendor?.status || 'active',
    createdAt: existingVendor?.createdAt || now,
    updatedAt: now,
  };
  const nextVendors = existingVendor
    ? vendors.map((entry) => (entry.id === nextVendor.id ? nextVendor : entry))
    : [...vendors, nextVendor];

  writeVendors(nextVendors);
  return nextVendor;
}
