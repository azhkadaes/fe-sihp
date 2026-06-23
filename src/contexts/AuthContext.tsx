import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  getApiBaseUrl,
  type ApiEnvelope,
  type AuthUser,
  type LoginResponseData,
} from '@/lib/api';

type AuthMode = 'api' | 'hardcode';

export interface LoginResult {
  ok: boolean;
  message?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  authMode?: AuthMode;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('auth') === 'true' && !!localStorage.getItem('access_token');
  });
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser());

  const authMode = (import.meta.env.VITE_AUTH_MODE as AuthMode) || 'api';

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    if (authMode === 'hardcode') {
      const hardEmail = import.meta.env.VITE_HARDCODE_EMAIL || 'admin@admin.com';
      const hardPassword = import.meta.env.VITE_HARDCODE_PASSWORD || 'admin123';
      if (email === hardEmail && password === hardPassword) {
        const fallbackUser: AuthUser = { id: 'local', email: hardEmail, name: 'Administrator' };
        localStorage.setItem('access_token', 'hardcoded-token');
        localStorage.setItem('auth', 'true');
        localStorage.setItem('auth_user', JSON.stringify(fallbackUser));
        setUser(fallbackUser);
        setIsAuthenticated(true);
        return { ok: true };
      }
      return { ok: false, message: 'Email atau password salah.' };
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = (await res.json()) as ApiEnvelope<LoginResponseData>;

      if (!res.ok || !body.success) {
        return {
          ok: false,
          message: body.message || 'Email atau password salah.',
        };
      }

      const token = body.data?.token?.access_token;
      if (!token) {
        return { ok: false, message: 'Token tidak diterima dari server.' };
      }

      localStorage.setItem('access_token', token);
      localStorage.setItem('auth', 'true');
      if (body.data?.user) {
        localStorage.setItem('auth_user', JSON.stringify(body.data.user));
        setUser(body.data.user);
      }
      setIsAuthenticated(true);
      return { ok: true };
    } catch {
      return {
        ok: false,
        message: 'Tidak dapat terhubung ke server. Pastikan backend berjalan di ' + getApiBaseUrl(),
      };
    }
  }, [authMode]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('auth');
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, authMode }}>
      {children}
    </AuthContext.Provider>
  );
};
