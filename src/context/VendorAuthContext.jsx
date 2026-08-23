import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearVendorSession, getStoredVendorUser, loginVendorApi } from '../services/vendorAuthService';

const VendorAuthContext = createContext(null);

export function VendorAuthProvider({ children }) {
  const [vendorUser, setVendorUser] = useState(() => getStoredVendorUser());
  const [vendorAuthError, setVendorAuthError] = useState('');

  useEffect(() => {
    const syncVendor = () => {
      const current = getStoredVendorUser();
      setVendorUser(current);
      if (!current) setVendorAuthError('');
    };

    syncVendor();
    window.addEventListener('storage', syncVendor);
    window.addEventListener('focus', syncVendor);
    return () => {
      window.removeEventListener('storage', syncVendor);
      window.removeEventListener('focus', syncVendor);
    };
  }, []);

  const loginVendor = async ({ identifier, password }) => {
    const result = await loginVendorApi({ identifier, password });
    if (!result.ok) {
      setVendorAuthError(result.error);
      return result;
    }

    setVendorAuthError('');
    setVendorUser(result.vendor);
    return result;
  };

  const logoutVendor = () => {
    clearVendorSession();
    setVendorUser(null);
    setVendorAuthError('');
  };

  const value = useMemo(
    () => ({
      vendorUser,
      isVendorAuthenticated: Boolean(vendorUser),
      vendorAuthError,
      loginVendor,
      logoutVendor,
      setVendorUser,
    }),
    [vendorAuthError, vendorUser],
  );

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
}

export function useVendorAuth() {
  const context = useContext(VendorAuthContext);
  if (!context) {
    throw new Error('useVendorAuth must be used within a VendorAuthProvider');
  }
  return context;
}
