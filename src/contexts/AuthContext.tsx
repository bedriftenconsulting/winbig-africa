import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient, clearAuth, getCurrentUser, type User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; phone: string; password: string }) => Promise<{ requires_otp: boolean; session_id: string; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = getCurrentUser();
    if (stored) setUser(stored);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[AuthContext] login called with phone:', email);
    const res = await apiClient.login({ email, password });
    console.log('[AuthContext] login response:', res);

    // If OTP is required, the profile/tokens won't be in the response yet
    if (res.requires_otp) {
      throw new Error('OTP verification required. Please contact support.');
    }

    if (!res.access_token || !res.profile) {
      throw new Error('Invalid response from server. Please try again.');
    }

    // Merge any locally-stored name/email from registration
    const pending = localStorage.getItem('pending_profile');
    const extra = pending ? JSON.parse(pending) : {};
    const profile: User = {
      ...res.profile,
      first_name: res.profile.first_name || extra.first_name || '',
      last_name:  res.profile.last_name  || extra.last_name  || '',
      email:      res.profile.email      || extra.email      || '',
    };

    localStorage.setItem('token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    localStorage.setItem('user', JSON.stringify(profile));
    localStorage.removeItem('pending_profile');
    setUser(profile);
    console.log('[AuthContext] login complete, user set');
  };

  const register = async (userData: { name: string; email: string; phone: string; password: string }) => {
    const res = await apiClient.register(userData);
    // Store name/email locally so profile page shows them even before backend saves them
    localStorage.setItem('pending_profile', JSON.stringify({
      first_name: userData.name.split(' ')[0] || userData.name,
      last_name: userData.name.split(' ').slice(1).join(' ') || '',
      email: userData.email,
    }));
    return res;
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refresh_token') || '';
    if (refreshToken) apiClient.logout(refreshToken).catch(() => {});
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
