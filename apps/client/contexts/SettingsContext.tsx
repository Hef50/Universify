import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, Appearance } from 'react-native';
import { UserSettings } from '@/types/user';

// Mock localStorage for React Native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    }
  },
};

const SETTINGS_STORAGE_KEY = 'universify_settings';

const defaultSettings: UserSettings = {
  theme: 'system',
  defaultHomePage: 'calendar',
  calendarViewDays: 7,
  colorScheme: 'default',
  fontSize: 'medium',
  accessibility: {
    highContrast: false,
    reduceMotion: false,
  },
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  currentTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Update current theme based on settings
    if (settings.theme === 'system') {
      const colorScheme = Appearance.getColorScheme();
      setCurrentTheme(colorScheme === 'dark' ? 'dark' : 'light');

      // Listen for system theme changes
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setCurrentTheme(colorScheme === 'dark' ? 'dark' : 'light');
      });

      return () => subscription.remove();
    } else {
      setCurrentTheme(settings.theme as 'light' | 'dark');
    }
  }, [settings.theme]);

  const loadSettings = async () => {
    try {
      const storedSettings = await storage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const resetSettings = async () => {
    try {
      await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    currentTheme,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

