import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler, TOKEN_STORAGE_KEY } from '../api/client';
import { fetchMeApi } from '../api/endpoints';
import { AuthResponse, SafeUser } from '../types/api';
import { AuthContext } from './useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback((data: AuthResponse) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    setIsLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await fetchMeApi();
      setUser(currentUser);
      setToken(activeToken);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (token && !user) {
      void refreshUser();
    } else if (!token) {
      setIsLoading(false);
    }
  }, [token, user, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
