import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      // Session is stored in httpOnly cookie, just check if it's valid
      const { data } = await authAPI.me();
      setUser(data);
    } catch {
      // Session invalid or expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);
    // Cookie is set automatically by the server
    setUser(data.user);
    return data;
  };

  const register = async (email, password) => {
    const { data } = await authAPI.register(email, password);
    // Cookie is set automatically by the server
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore errors during logout
    }
    // Cookie is cleared by the server
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
