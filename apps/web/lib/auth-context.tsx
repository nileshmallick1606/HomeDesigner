'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  profileType: string;
  platformRole: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  logout: () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient.fetch<User>('/users/me');
      setUser(userData);
    } catch {
      setUser(null);
      apiClient.setToken(null);
    }
  }, []);

  useEffect(() => {
    const token = apiClient.getToken();
    if (!token) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    refreshUser().finally(() => setLoading(false));
  }, [refreshUser, router]);

  const logout = useCallback(() => {
    apiClient.setToken(null);
    setUser(null);
    router.replace('/');
  }, [router]);

  // Redirect to login if not authenticated after loading
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return null; // Layout shows spinner
  }

  if (!user) {
    return null; // Redirecting to login
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
