import React, { createContext, useContext, useState, useCallback } from 'react';

type AuthMode = 'api' | 'hardcode';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  authMode?: AuthMode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth') === 'true';
  });

  // Mode can be 'api' (default) or 'hardcode'. Set via Vite env `VITE_AUTH_MODE`.
  const authMode = (((import.meta as any).env?.VITE_AUTH_MODE as AuthMode) || 'api');

  const login = useCallback(async (email: string, password: string) => {
    try {
      const hardEmail = ((import.meta as any).env?.VITE_HARDCODE_EMAIL as string) || 'admin@admin.com';
      const hardPassword = ((import.meta as any).env?.VITE_HARDCODE_PASSWORD as string) || 'admin123';

      // Accept default hardcoded credentials regardless of authMode
      if (email === hardEmail && password === hardPassword) {
        localStorage.setItem('access_token', 'hardcoded-token');
        localStorage.setItem('auth', 'true');
        setIsAuthenticated(true);
        return true;
      }

      // If mode is forced to hardcode and credentials didn't match, deny
      if (authMode === 'hardcode') {
        return false;
      }

      const base = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://127.0.0.1:8080';
      const res = await fetch(`${base}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return false;
      }

      const body = await res.json();
      const token = body?.data?.token?.access_token || body?.data?.token?.accessToken || null;
      if (!token) return false;

      localStorage.setItem('access_token', token);
      localStorage.setItem('auth', 'true');
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      return false;
    }
  }, [authMode]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth');
    localStorage.removeItem('access_token');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, authMode }}>
      {children}
    </AuthContext.Provider>
  );
};
