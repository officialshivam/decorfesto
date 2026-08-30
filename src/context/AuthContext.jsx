import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  customerLoginApi,
  customerLogoutApi,
  customerSignupApi,
  getCustomerMeApi,
} from '../services/customerAuthService';
import { persistCurrentUser } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await getCustomerMeApi();
        if (isMounted) {
          if (res.ok && res.user) {
            setUser(res.user);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async ({ identifier, password }) => {
    setAuthError('');
    const result = await customerLoginApi({ identifier, password });
    if (!result.ok) {
      setAuthError(result.error || 'Login failed.');
      return result;
    }

    setAuthError('');
    const userWithToken = { ...result.user, token: result.token };
    persistCurrentUser(userWithToken);
    setUser(result.user);
    return result;
  };

  const signup = async (payload) => {
    setAuthError('');
    const result = await customerSignupApi(payload);
    if (!result.ok) {
      setAuthError(result.error || 'Signup failed.');
      return result;
    }

    setAuthError('');
    const userWithToken = { ...result.user, token: result.token };
    persistCurrentUser(userWithToken);
    setUser(result.user);
    return result;
  };

  const logout = async () => {
    await customerLogoutApi();
    persistCurrentUser(null);
    setUser(null);
    setAuthError('');
  };

  const updateProfile = (payload) => {
    setUser((curr) => (curr ? { ...curr, ...payload } : null));
  };

  const addOrder = (order) => {
    setUser((curr) => (curr ? { ...curr, orders: [order, ...(curr.orders || [])] } : null));
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      authError,
      login,
      signup,
      logout,
      updateProfile,
      addOrder,
    }),
    [authError, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
