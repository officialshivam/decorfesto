import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addOrderToUser, clearStoredSession, getStoredUser, loginWithCredentials, signupWithDetails, updateStoredUser } from '../services/mockAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!user) {
      setAuthError('');
    }
  }, [user]);

  const login = ({ identifier, password }) => {
    const result = loginWithCredentials({ identifier, password });
    if (!result.ok) {
      setAuthError(result.error);
      return result;
    }

    setAuthError('');
    setUser(result.user);
    return result;
  };

  const signup = (payload) => {
    const result = signupWithDetails(payload);
    if (!result.ok) {
      setAuthError(result.error);
      return result;
    }

    setAuthError('');
    setUser(result.user);
    return result;
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
    setAuthError('');
  };

  const updateProfile = (payload) => {
    const nextUser = updateStoredUser({ ...user, ...payload });
    setUser(nextUser);
    return nextUser;
  };

  const addOrder = (order, profileUpdates = {}) => {
    const nextUser = addOrderToUser({ ...user, ...profileUpdates }, order);
    setUser(nextUser);
    return nextUser;
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      authError,
      login,
      signup,
      logout,
      updateProfile,
      addOrder,
    }),
    [authError, user],
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
