import { getVendorById } from './mockVendors';

const VENDOR_SESSION_KEY = 'decorfesto-vendor-user';

export function getStoredVendorUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(VENDOR_SESSION_KEY);
    if (!raw) return null;
    const vendor = JSON.parse(raw);

    // Verify vendor account status in case admin disabled the vendor
    if (vendor && vendor.id) {
      const currentVendor = getVendorById(vendor.id);
      if (currentVendor && (currentVendor.status === 'disabled' || currentVendor.status === 'inactive' || currentVendor.accountStatus === 'disabled' || currentVendor.accountStatus === 'inactive')) {
        clearVendorSession();
        return null;
      }
    }
    return vendor;
  } catch (error) {
    console.warn('Error reading vendor session', error);
    return null;
  }
}

export function persistVendorUser(vendorUser) {
  if (typeof window === 'undefined') return;
  if (!vendorUser) {
    window.localStorage.removeItem(VENDOR_SESSION_KEY);
  } else {
    window.localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(vendorUser));
  }
}

export function clearVendorSession() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('decorfesto_vendor_token');
    window.localStorage.removeItem('decorfesto_vendor_token');
  }
  persistVendorUser(null);
}

export async function loginVendorApi({ identifier, password }) {
  try {
    const res = await fetch('/auth/vendor-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof window !== 'undefined' && data.token) {
        window.sessionStorage.setItem('decorfesto_vendor_token', data.token);
        window.localStorage.setItem('decorfesto_vendor_token', data.token);
      }
      persistVendorUser(data.vendor);
      return { ok: true, vendor: data.vendor, token: data.token };
    }
    return { ok: false, error: data.error || 'Vendor authentication failed.' };
  } catch {
    // Local mock fallback for dev environment
    const cleanId = String(identifier || '').trim().toLowerCase();
    const cleanMobile = cleanId.replace(/\D/g, '').slice(-10);

    const { getStoredVendors } = await import('./mockVendors');
    const vendors = getStoredVendors();
    const matched = vendors.find((v) => {
      const vEmail = String(v.email || '').trim().toLowerCase();
      const vPhone = String(v.phone || '').replace(/\D/g, '').slice(-10);
      return (vEmail && vEmail === cleanId) || (cleanMobile && vPhone && vPhone === cleanMobile);
    });

    if (!matched) {
      return { ok: false, error: 'Vendor account not found.' };
    }

    if (matched.status === 'disabled' || matched.status === 'inactive' || matched.accountStatus === 'disabled') {
      return { ok: false, error: 'Vendor account is disabled. Please contact DecorFesto admin.' };
    }

    const expectedPass = matched.passwordHash || matched.password || 'VendorPassword123!';
    if (password !== expectedPass) {
      return { ok: false, error: 'Invalid password.' };
    }

    const safeVendor = {
      id: matched.id,
      name: matched.name,
      contactName: matched.contactName,
      email: matched.email,
      phone: matched.phone,
      specialties: matched.specialties,
      servicePincodes: matched.servicePincodes,
      status: matched.status || 'active',
    };

    persistVendorUser(safeVendor);
    return { ok: true, vendor: safeVendor };
  }
}

import { getAdminAuthHeaders } from './adminAuthService';

export async function getVendorsApi() {
  try {
    const res = await fetch('/vendors', {
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.vendors || [];
  } catch (err) {
    console.error('getVendorsApi Error:', err);
    return [];
  }
}

export async function getVendorByIdApi(vendorId) {
  try {
    const res = await fetch(`/vendors/${vendorId}`, {
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.vendor || null;
  } catch (err) {
    console.error('getVendorByIdApi Error:', err);
    return null;
  }
}

export async function updateVendorApi(vendorId, updates) {
  try {
    const res = await fetch(`/vendors/${vendorId}`, {
      method: 'PATCH',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to update vendor (${res.status})`);
    const data = await res.json();
    return data.vendor || null;
  } catch (err) {
    console.error('updateVendorApi Error:', err);
    throw err;
  }
}

export async function createVendorApi(vendorData) {
  try {
    const res = await fetch('/vendors', {
      method: 'POST',
      headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(vendorData),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to create vendor (${res.status})`);
    const data = await res.json();
    return data.vendor || null;
  } catch (err) {
    console.error('createVendorApi Error:', err);
    throw err;
  }
}

export async function fetchVendorProfileApi() {
  try {
    const headers = { Accept: 'application/json' };
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('decorfesto_vendor_token') || window.localStorage.getItem('decorfesto_vendor_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/vendor/profile', { headers, credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.vendor || null;
  } catch (err) {
    console.error('fetchVendorProfileApi Error:', err);
    return null;
  }
}

export async function updateVendorProfileApi(updates) {
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem('decorfesto_vendor_token') || window.localStorage.getItem('decorfesto_vendor_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch('/vendor/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Failed to update profile (${res.status})`);
    const data = await res.json();
    return data.vendor || null;
  } catch (err) {
    console.error('updateVendorProfileApi Error:', err);
    throw err;
  }
}
