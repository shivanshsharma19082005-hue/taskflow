import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

// Guards against a corrupted/partial localStorage value crashing the entire
// app on load (JSON.parse throwing inside a useState initializer is
// unrecoverable without an error boundary, so we neutralize it here instead).
const readStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep every open tab honest about which account is actually active.
  // localStorage is shared across every tab on the same origin, so logging
  // into a different account in one tab silently swaps the token underneath
  // every other open tab too - without this, a tab can keep showing a stale
  // "logged in as X" UI while its actual requests are now carrying a
  // different account's token, producing confusing 403s that look like a
  // permissions bug but are really a stale-tab problem. The browser's
  // 'storage' event fires in every tab EXCEPT the one that made the change,
  // which is exactly what we need to catch this.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== 'token' && event.key !== 'user') return;

      const currentToken = localStorage.getItem('token');
      const currentUserRaw = localStorage.getItem('user');

      if (!currentToken) {
        // Another tab logged out (or this account was force-logged-out) -
        // reflect that here too instead of pretending we're still signed in.
        setToken(null);
        setUser(null);
        return;
      }

      let currentUser = null;
      try {
        currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      } catch {
        currentUser = null;
      }

      // Only react if the account genuinely changed underneath us, not on
      // every unrelated write to these keys.
      setToken((prevToken) => (prevToken !== currentToken ? currentToken : prevToken));
      setUser((prevUser) => {
        if (!currentUser) return prevUser;
        if (prevUser?.id === currentUser.id) return prevUser;
        return currentUser;
      });
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const bootstrapMainBoss = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/bootstrap-mainboss', { name, email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, bootstrapMainBoss, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
