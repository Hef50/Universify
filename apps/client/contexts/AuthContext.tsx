import React, { createContext, useContext, ReactNode } from 'react';
import { User, AuthCredentials, SignupData } from '@/types/user';
import { useAuth as useAuthHook } from '@/hooks/useAuth';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthCredentials) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthHook();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

