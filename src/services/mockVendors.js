const VENDORS_STORAGE_KEY = 'decorfesto-admin-vendors';
const VENDOR_AUDIT_LOGS_KEY = 'decorfesto-vendor-audit-logs';

export const PRESET_SPECIALTIES = [
  'Birthday',
  'Anniversary',
  'Wedding',
  'Balloon Decoration',
  'Floral',
  'Corporate',
  'Premium Decoration',
];

export const initialVendors = [
  {
    id: 'VND-0001',
    name: 'DecorFesto Studio',
    contactName: 'Aarav Mehta',
    phone: '+919876543210',
    email: 'vendor@decorfesto.com',
    passwordHash: 'VendorPassword123!',
    servicePincodes: ['110001', '110032', '400001'],
    specialties: ['Balloon Decoration', 'Floral', 'Birthday', 'Premium Decoration'],
    role: 'VENDOR',
    status: 'active',
    accountStatus: 'active',
    address: 'Connaught Place, Block C, Shop 14',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    gstin: '07AAAAA0000A1Z5',
    pan: 'ABCDE1234F',
    notes: 'Primary vendor partner for Central & North Delhi.',
    lastLoginAt: '2026-08-23T20:15:00.000Z',
    invalidatedBefore: null,
    createdAt: '2026-08-08T17:30:32.319Z',
    updatedAt: '2026-08-23T17:30:32.319Z',
  },
  {
    id: 'VND-0002',
    name: 'Delhi Celebrations Co.',
    contactName: 'Priya Sharma',
    phone: '+919812345670',
    email: 'delhi@decorfesto.com',
    passwordHash: 'VendorPassword123!',
    servicePincodes: ['110001', '110032', '110002'],
    specialties: ['Balloon Decoration', 'Corporate', 'Anniversary'],
    role: 'VENDOR',
    status: 'active',
    accountStatus: 'active',
    address: 'Rajouri Garden, Main Market',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110032',
    gstin: '07BBBBB1111B1Z6',
    pan: 'FGHIJ5678K',
    notes: 'Specialist in corporate events and anniversary balloon setups.',
    lastLoginAt: '2026-08-23T19:40:00.000Z',
    invalidatedBefore: null,
    createdAt: '2026-08-09T14:23:13.673Z',
    updatedAt: '2026-08-23T14:23:13.675Z',
  },
  {
    id: 'VND-0003',
    name: 'Royal Events Studio',
    contactName: 'Vikram Singh',
    phone: '+919899887766',
    email: 'royal@decorfesto.com',
    passwordHash: 'VendorPassword123!',
    servicePincodes: ['110002', '110003', '110048'],
    specialties: ['Wedding', 'Premium Decoration', 'Floral'],
    role: 'VENDOR',
    status: 'invited',
    accountStatus: 'active',
    address: 'South Extension Part 2',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110049',
    gstin: '07CCCCC2222C1Z7',
    pan: 'KLMNO9012P',
    notes: 'Newly onboarded premium wedding and luxury floral vendor.',
    lastLoginAt: null,
    invalidatedBefore: null,
    createdAt: '2026-08-20T10:15:00.000Z',
    updatedAt: '2026-08-20T10:15:00.000Z',
  },
];

let inMemoryVendors = [...initialVendors];

function readVendors() {
  if (typeof window === 'undefined') {
    return inMemoryVendors;
  }
  try {
    const stored = window.localStorage.getItem(VENDORS_STORAGE_KEY);
    if (!stored) return inMemoryVendors;
    const vendors = JSON.parse(stored);
    return Array.isArray(vendors) && vendors.length > 0 ? vendors : inMemoryVendors;
  } catch {
    return inMemoryVendors;
  }
}

function writeVendors(vendors) {
  inMemoryVendors = vendors;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VENDORS_STORAGE_KEY, JSON.stringify(vendors));
  }
}

export function getStoredVendors() {
  return readVendors();
}

export function getVendorById(vendorId) {
  const vendors = readVendors();
  const target = String(vendorId || '').trim().toLowerCase();
  return vendors.find((v) => {
    const vId = String(v.id || '').trim().toLowerCase();
    const vEmail = String(v.email || '').trim().toLowerCase();
    return vId === target || vEmail === target || (target === 'vendor-001' && vId === 'vnd-0001') || (target === 'vendor-002' && vId === 'vnd-0002') || (target === 'vnd-0001' && vId === 'vendor-001') || (target === 'vnd-0002' && vId === 'vendor-002');
  }) || null;
}

export function generateNextVendorId() {
  const vendors = readVendors();
  const numericIds = vendors
    .map((v) => {
      const match = String(v.id).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((num) => !isNaN(num));

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
  const nextNum = maxId + 1;
  return `VND-${String(nextNum).padStart(4, '0')}`;
}

export function validateVendorUnique({ email, phone, id }) {
  const vendors = readVendors();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim().replace(/\s+/g, '');
  const cleanId = String(id || '').trim();

  for (const v of vendors) {
    if (v.id === cleanId) continue;
    if (cleanEmail && String(v.email).toLowerCase() === cleanEmail) {
      return { valid: false, field: 'email', message: `Email address '${email}' is already in use by vendor ${v.name} (${v.id}).` };
    }
    if (cleanPhone && String(v.phone).replace(/\s+/g, '') === cleanPhone) {
      return { valid: false, field: 'phone', message: `Phone number '${phone}' is already in use by vendor ${v.name} (${v.id}).` };
    }
  }
  return { valid: true };
}

export function saveStoredVendor(vendorData) {
  const vendors = readVendors();
  const now = new Date().toISOString();
  const isNew = !vendorData.id || !vendors.some((v) => v.id === vendorData.id);
  const vendorId = isNew ? (vendorData.id || generateNextVendorId()) : vendorData.id;

  const existing = vendors.find((v) => v.id === vendorId);

  // Normalize status
  const status = vendorData.status || existing?.status || 'active';
  const accountStatus = (status === 'disabled' || status === 'inactive' || status === 'suspended' || status === 'archived')
    ? 'disabled'
    : 'active';

  const nextVendor = {
    ...existing,
    ...vendorData,
    id: vendorId,
    name: String(vendorData.name || existing?.name || 'Vendor Partner').trim(),
    contactName: String(vendorData.contactName || existing?.contactName || '').trim(),
    email: String(vendorData.email || existing?.email || '').trim().toLowerCase(),
    phone: String(vendorData.phone || existing?.phone || '').trim(),
    passwordHash: vendorData.passwordHash || vendorData.password || existing?.passwordHash || 'VendorPassword123!',
    servicePincodes: Array.isArray(vendorData.servicePincodes)
      ? vendorData.servicePincodes
      : (typeof vendorData.servicePincodes === 'string'
        ? vendorData.servicePincodes.split(',').map((s) => s.trim()).filter(Boolean)
        : existing?.servicePincodes || []),
    specialties: Array.isArray(vendorData.specialties)
      ? vendorData.specialties
      : (typeof vendorData.specialties === 'string'
        ? vendorData.specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : existing?.specialties || []),
    status,
    accountStatus,
    role: 'VENDOR',
    address: String(vendorData.address || existing?.address || '').trim(),
    city: String(vendorData.city || existing?.city || 'New Delhi').trim(),
    state: String(vendorData.state || existing?.state || 'Delhi').trim(),
    pincode: String(vendorData.pincode || existing?.pincode || '').trim(),
    gstin: String(vendorData.gstin || existing?.gstin || '').trim().toUpperCase(),
    pan: String(vendorData.pan || existing?.pan || '').trim().toUpperCase(),
    notes: String(vendorData.notes || existing?.notes || '').trim(),
    lastLoginAt: vendorData.lastLoginAt || existing?.lastLoginAt || null,
    invalidatedBefore: vendorData.invalidatedBefore || existing?.invalidatedBefore || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextVendors = existing
    ? vendors.map((v) => (v.id === vendorId ? nextVendor : v))
    : [nextVendor, ...vendors];

  writeVendors(nextVendors);

  // Log audit event
  addVendorAuditLog(
    vendorId,
    'ADMIN',
    isNew ? 'Vendor Created' : 'Vendor Profile Updated',
    isNew ? `Created vendor account ${vendorId} (${nextVendor.name})` : `Updated vendor profile details.`
  );

  return nextVendor;
}

export function updateVendorStatus(vendorId, newStatus, reason = '') {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;

  const now = new Date().toISOString();
  const accountStatus = (newStatus === 'disabled' || newStatus === 'inactive' || newStatus === 'suspended' || newStatus === 'archived')
    ? 'disabled'
    : 'active';

  const updated = saveStoredVendor({
    ...vendor,
    status: newStatus,
    accountStatus,
    invalidatedBefore: newStatus !== 'active' ? now : vendor.invalidatedBefore,
    updatedAt: now,
  });

  addVendorAuditLog(
    vendorId,
    'ADMIN',
    `Status Changed to ${newStatus.toUpperCase()}`,
    reason ? `Status set to ${newStatus}. Reason: ${reason}` : `Vendor account status updated to ${newStatus}.`
  );

  return updated;
}

export function resetVendorPassword(vendorId, newPassword, actor = 'ADMIN') {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;

  const now = new Date().toISOString();
  const updated = saveStoredVendor({
    ...vendor,
    passwordHash: newPassword,
    invalidatedBefore: now,
    updatedAt: now,
  });

  addVendorAuditLog(
    vendorId,
    actor,
    'Password Reset',
    'Vendor portal login password reset and active sessions invalidated.'
  );

  return updated;
}

export function forceLogoutVendor(vendorId, actor = 'ADMIN') {
  const vendor = getVendorById(vendorId);
  if (!vendor) return null;

  const now = new Date().toISOString();
  const updated = saveStoredVendor({
    ...vendor,
    invalidatedBefore: now,
    updatedAt: now,
  });

  addVendorAuditLog(
    vendorId,
    actor,
    'Force Logout',
    'Invalidated all active portal sessions for vendor.'
  );

  return updated;
}

export function deleteOrArchiveVendor(vendorId, hasOrderHistory = false) {
  const vendors = readVendors();
  const vendor = vendors.find((v) => v.id === vendorId);
  if (!vendor) return { ok: false, message: 'Vendor not found' };

  if (hasOrderHistory) {
    updateVendorStatus(vendorId, 'archived', 'Archived due to existing historical orders');
    return { ok: true, mode: 'archived', message: `Vendor ${vendorId} has order history and was safely archived.` };
  }

  const nextVendors = vendors.filter((v) => v.id !== vendorId);
  writeVendors(nextVendors);
  return { ok: true, mode: 'deleted', message: `Vendor ${vendorId} deleted permanently.` };
}

// Workload Calculation Helper
export function calculateVendorWorkload(orders = [], vendorId) {
  const vendorOrders = orders.filter((o) => o.vendorId === vendorId);
  const activeCount = vendorOrders.filter((o) =>
    ['VENDOR_ASSIGNED', 'VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP'].includes(o.bookingStatus)
  ).length;

  const completedCount = vendorOrders.filter((o) => o.bookingStatus === 'COMPLETED').length;
  const totalCount = vendorOrders.length;

  let level = 'LOW';
  let badgeClass = 'workload-pill--low';
  if (activeCount >= 6) {
    level = 'HIGH';
    badgeClass = 'workload-pill--high';
  } else if (activeCount >= 3) {
    level = 'MEDIUM';
    badgeClass = 'workload-pill--medium';
  }

  return {
    activeCount,
    completedCount,
    totalCount,
    level,
    badgeClass,
  };
}

// Vendor Audit Log Helpers
export function readVendorAuditLogs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VENDOR_AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addVendorAuditLog(vendorId, actor, action, note = '') {
  const logs = readVendorAuditLogs();
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    vendorId,
    actor,
    action,
    note,
    timestamp: new Date().toISOString(),
  };
  const updatedLogs = [entry, ...logs].slice(0, 100);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(VENDOR_AUDIT_LOGS_KEY, JSON.stringify(updatedLogs));
  }
  return entry;
}

export function getVendorAuditLogs(vendorId) {
  const logs = readVendorAuditLogs();
  return logs.filter((l) => l.vendorId === vendorId);
}
