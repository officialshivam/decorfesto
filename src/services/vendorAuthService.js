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
