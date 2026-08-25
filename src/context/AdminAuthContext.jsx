import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { checkAdminSessionApi, loginAdminApi, logoutAdminApi } from '../services/adminAuthService';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [adminAuthError, setAdminAuthError] = useState('');

  const syncAdminSession = async () => {
    try {
      const session = await checkAdminSessionApi();
      if (session.authenticated) {
        setAdminUser(session.user);
        setIsAdminAuthenticated(true);
      } else {
        setAdminUser(null);
        setIsAdminAuthenticated(false);
      }
    } catch {
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    syncAdminSession();
    window.addEventListener('focus', syncAdminSession);
    return () => {
      window.removeEventListener('focus', syncAdminSession);
    };
  }, []);

  const loginAdmin = async ({ username, password }) => {
    setAdminAuthError('');
    const result = await loginAdminApi({ username, password });
    if (!result.ok) {
      setAdminAuthError(result.error);
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      return result;
    }

    setAdminAuthError('');
    setAdminUser(result.user);
    setIsAdminAuthenticated(true);
    return result;
  };

  const logoutAdmin = async () => {
    await logoutAdminApi();
    setAdminUser(null);
    setIsAdminAuthenticated(false);
    setAdminAuthError('');
  };

  const value = useMemo(
    () => ({
      adminUser,
      isAdminAuthenticated,
      loadingSession,
      adminAuthError,
      loginAdmin,
      logoutAdmin,
      syncAdminSession,
      setAdminAuthError,
    }),
    [adminAuthError, adminUser, isAdminAuthenticated, loadingSession],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
