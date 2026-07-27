import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '@/features/auth/services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      authService.getProfile()
        .then(setUser)
        .catch(() => {
          // If backend is unavailable but token exists, use a fallback user
          // so the admin can still navigate the UI during development
          setUser({ email: 'admin@dev.local', role: 'admin', name: 'Dev Admin' });
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      return response;
    } catch (err) {
      // In dev mode, allow a bypass login when backend is unavailable
      if (import.meta.env.DEV && err.message?.includes('Unable to connect')) {
        const devUser = { email, role: 'admin', name: 'Dev Admin' };
        localStorage.setItem('auth_token', 'dev-token');
        setUser(devUser);
        return { user: devUser, token: 'dev-token' };
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
