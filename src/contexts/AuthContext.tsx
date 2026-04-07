import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
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

  const login = useCallback((email: string, password: string) => {
    if (email === 'admin@admin.com' && password === 'admin123') {
      setIsAuthenticated(true);
      localStorage.setItem('auth', 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
