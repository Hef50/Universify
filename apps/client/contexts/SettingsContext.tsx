import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance } from 'react-native';
import { UserSettings } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserProfile, updateUserProfilePreferences } from '@/lib/userProfilesApi';

import { storage } from '@/lib/storage';

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
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    loadSettings();
  }, [currentUser?.id]);

  useEffect(() => {
    if (settings.theme === 'system') {
      const colorScheme = Appearance.getColorScheme();
      setCurrentTheme(colorScheme === 'dark' ? 'dark' : 'light');
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
      if (currentUser) {
        const profile = await fetchUserProfile(currentUser.id);
        if (profile?.preferences?.settings) {
          setSettings({ ...defaultSettings, ...profile.preferences.settings });
          return;
        }
      }
      const storedSettings = await storage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(storedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);

      if (currentUser) {
        await updateUserProfilePreferences(currentUser.id, { settings: newSettings });
      } else {
        await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(defaultSettings);
      if (currentUser) {
        await updateUserProfilePreferences(currentUser.id, { settings: defaultSettings });
      } else {
        await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        currentTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
