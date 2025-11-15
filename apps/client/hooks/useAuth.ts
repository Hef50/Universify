import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { User, AuthCredentials, SignupData } from '@/types/user';

// Mock localStorage for React Native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    // For native, we'd use AsyncStorage, but for now just return null
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
    // For native, we'd use AsyncStorage
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    }
    // For native, we'd use AsyncStorage
  },
};

const AUTH_STORAGE_KEY = 'universify_auth';
const USERS_STORAGE_KEY = 'universify_users';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const authData = await storage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const user = JSON.parse(authData);
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('Failed to load auth state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async (): Promise<User[]> => {
    try {
      const usersData = await storage.getItem(USERS_STORAGE_KEY);
      if (usersData) {
        return JSON.parse(usersData);
      }
      // Load from mock data if not in storage
      const mockUsers = require('@/data/mockUsers.json');
      await storage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));
      return mockUsers;
    } catch (err) {
      console.error('Failed to load users:', err);
      return [];
    }
  };

  const saveUsers = async (users: User[]) => {
    try {
      await storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (err) {
      console.error('Failed to save users:', err);
    }
  };

  const login = useCallback(async (credentials: AuthCredentials): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const users = await loadUsers();
      const user = users.find(
        (u) => u.email === credentials.email && u.password === credentials.password
      );

      if (!user) {
        setError('Invalid email or password');
        setIsLoading(false);
        return false;
      }

      // Update last login
      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
      await saveUsers(updatedUsers);

      // Save auth state
      await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('Login failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const users = await loadUsers();

      // Check if email already exists
      if (users.some((u) => u.email === data.email)) {
        setError('Email already registered');
        setIsLoading(false);
        return false;
      }

      // Create new user
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: data.email,
        name: data.name,
        university: data.university,
        preferences: {
          categoryInterests: [],
          eventTypePreferences: {
            clubEvents: true,
            socialEvents: true,
          },
          defaultRSVPVisibility: 'public',
          notificationPreferences: {
            email: true,
            push: true,
            eventReminders: true,
            newEventsInCategories: true,
          },
        },
        settings: {
          theme: 'system',
          defaultHomePage: 'calendar',
          calendarViewDays: 7,
          colorScheme: 'default',
          fontSize: 'medium',
          accessibility: {
            highContrast: false,
            reduceMotion: false,
          },
        },
        savedEvents: [],
        createdEvents: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Save new user
      const updatedUsers = [...users, newUser];
      await saveUsers(updatedUsers);

      // Save auth state
      await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setCurrentUser(newUser);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('Signup failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await storage.removeItem(AUTH_STORAGE_KEY);
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedUser = { ...currentUser, ...updates };
      const users = await loadUsers();
      const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
      await saveUsers(updatedUsers);
      await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }, [currentUser]);

  return {
    currentUser,
    isAuthenticated: !!currentUser,
    isLoading,
    error,
    login,
    signup,
    logout,
    updateUser,
    clearError: () => setError(null),
  };
};

