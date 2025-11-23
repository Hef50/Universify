import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { User, AuthCredentials, SignupData } from '@/types/user';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';

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

// Helper function to extract university from email
const extractUniversityFromEmail = (email: string): string => {
  if (!email) return '';
  const domain = email.split('@')[1];
  if (!domain) return '';
  
  // Try to extract university name from common patterns
  if (domain.includes('cmu.edu') || domain.includes('andrew.cmu.edu')) return 'Carnegie Mellon University';
  if (domain.includes('stanford.edu')) return 'Stanford University';
  if (domain.includes('mit.edu')) return 'MIT';
  if (domain.includes('harvard.edu')) return 'Harvard University';
  
  // Default: return domain without .edu
  return domain.replace('.edu', '').split('.').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get Google auth state
  const { 
    isGoogleAuthenticated, 
    googleSession, 
    isLoading: isGoogleLoading,
    googleSignOut 
  } = useGoogleAuth();

  // Load auth state on mount
  useEffect(() => {
    loadAuthState();
  }, []);

  // Sync Google auth with local auth state
  useEffect(() => {
    if (isGoogleAuthenticated && googleSession?.user) {
      // Create a User object from Google session
      const googleUser: User = {
        id: googleSession.user.id,
        email: googleSession.user.email || '',
        name: googleSession.user.user_metadata?.full_name || googleSession.user.email?.split('@')[0] || 'Google User',
        university: extractUniversityFromEmail(googleSession.user.email || ''),
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
        createdAt: googleSession.user.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      
      // Only set if we don't already have a local user, or if Google user is different
      if (!currentUser || currentUser.id !== googleUser.id) {
        setCurrentUser(googleUser);
        // Store Google auth indicator
        if (Platform.OS === 'web') {
          try {
            localStorage.setItem('universify_auth_provider', 'google');
          } catch (err) {
            console.error('Failed to store auth provider:', err);
          }
        }
      }
    } else if (!isGoogleAuthenticated && !isGoogleLoading) {
      // If Google auth is not active and we're not loading, check if current user was from Google
      if (Platform.OS === 'web') {
        try {
          const provider = localStorage.getItem('universify_auth_provider');
          if (provider === 'google' && currentUser) {
            // User was signed in with Google but session expired
            setCurrentUser(null);
            localStorage.removeItem('universify_auth_provider');
          }
        } catch (err) {
          console.error('Failed to check auth provider:', err);
        }
      }
    }
  }, [isGoogleAuthenticated, googleSession, isGoogleLoading, currentUser]);

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
      // Check if user was signed in with Google
      if (Platform.OS === 'web') {
        try {
          const provider = localStorage.getItem('universify_auth_provider');
          if (provider === 'google') {
            // Sign out from Google
            await googleSignOut();
            localStorage.removeItem('universify_auth_provider');
          }
        } catch (err) {
          console.error('Failed to check auth provider:', err);
        }
      }
      
      // Clear local auth
      await storage.removeItem(AUTH_STORAGE_KEY);
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [googleSignOut]);

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
    isAuthenticated: !!currentUser || isGoogleAuthenticated,
    isLoading: isLoading || isGoogleLoading,
    error,
    login,
    signup,
    logout,
    updateUser,
    clearError: () => setError(null),
  };
};
