import { useState, useEffect, useCallback } from 'react';
import { User, AuthCredentials, SignupData } from '@/types/user';
import { EventCategory } from '@/types/event';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { fetchUserProfile, upsertUserProfile, updateUserProfile, updateUserProfilePreferences } from '@/lib/userProfilesApi';
import { fetchCreatedEventIds } from '@/lib/api';

function extractUniversityFromEmail(email: string): string {
  if (!email) return '';
  const domain = email.split('@')[1];
  if (!domain) return '';

  if (domain.includes('cmu.edu') || domain.includes('andrew.cmu.edu')) return 'Carnegie Mellon University';
  if (domain.includes('stanford.edu')) return 'Stanford University';
  if (domain.includes('mit.edu')) return 'MIT';
  if (domain.includes('harvard.edu')) return 'Harvard University';

  return domain.replace('.edu', '').split('.').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

const defaultUserPreferences = {
  categoryInterests: [] as EventCategory[],
  eventTypePreferences: {
    clubEvents: true,
    socialEvents: true,
  },
  defaultRSVPVisibility: 'public' as const,
  notificationPreferences: {
    email: true,
    push: true,
    eventReminders: true,
    newEventsInCategories: true,
  },
  publicProfile: false,
};

const defaultUserSettings = {
  theme: 'system' as const,
  defaultHomePage: 'calendar' as const,
  calendarViewDays: 7,
  colorScheme: 'default',
  fontSize: 'medium' as const,
  compactView: false,
  accessibility: {
    highContrast: false,
    reduceMotion: false,
  },
};

function sessionToUser(googleSession: { user: { id: string; email?: string; created_at?: string; user_metadata?: { full_name?: string } } }): User {
  const email = googleSession.user.email || '';
  return {
    id: googleSession.user.id,
    email,
    name: googleSession.user.user_metadata?.full_name || email.split('@')[0] || 'Google User',
    university: extractUniversityFromEmail(email),
    preferences: defaultUserPreferences,
    settings: defaultUserSettings,
    savedEvents: [],
    createdEvents: [],
    createdAt: googleSession.user.created_at || new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const {
    isGoogleAuthenticated,
    googleSession,
    isLoading: isGoogleLoading,
    googleSignOut,
    googleSignIn,
    error: googleError,
    clearError: clearGoogleError,
  } = useGoogleAuth();

  useEffect(() => {
    if (!isGoogleAuthenticated || !googleSession?.user) {
      setCurrentUser(null);
      return;
    }
    const user = sessionToUser(googleSession);
    setCurrentUser(user);
    (async () => {
      try {
        await upsertUserProfile({
          id: user.id,
          email: user.email,
          name: user.name,
          university: user.university,
          preferences: user.preferences,
          settings: user.settings,
        });
      } catch (err) {
        console.error('Failed to upsert user profile:', err);
      }
      try {
        const [profile, createdIds] = await Promise.all([
          fetchUserProfile(user.id),
          fetchCreatedEventIds(user.id),
        ]);
        setCurrentUser((prev) => {
          if (!prev || prev.id !== user.id) return prev;
          const merged: User = {
            ...prev,
            createdEvents: createdIds,
          };
          if (profile) {
            if (profile.name != null) merged.name = profile.name;
            if (profile.email != null) merged.email = profile.email;
            if (profile.university != null) merged.university = profile.university;
            const prefs = profile.preferences;
            if (prefs?.preferences) {
              merged.preferences = { ...merged.preferences, ...prefs.preferences };
            }
            if (prefs?.settings) {
              merged.settings = { ...merged.settings, ...prefs.settings };
            }
            if (Array.isArray(prefs?.savedEvents)) {
              merged.savedEvents = prefs.savedEvents;
            }
          }
          return merged;
        });
      } catch (err) {
        console.error('Failed to load profile or created events:', err);
      }
    })();
  }, [isGoogleAuthenticated, googleSession]);

  const logout = useCallback(async () => {
    await googleSignOut();
    setCurrentUser(null);
  }, [googleSignOut]);

  const addCreatedEvent = useCallback((eventId: string) => {
    setCurrentUser((prev) =>
      prev && !prev.createdEvents.includes(eventId)
        ? { ...prev, createdEvents: [...prev.createdEvents, eventId] }
        : prev
    );
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : null));
    try {
      if (updates.name !== undefined || updates.university !== undefined) {
        await updateUserProfile(currentUser.id, {
          name: updates.name,
          university: updates.university,
        });
      }
      if (updates.preferences || updates.settings || updates.savedEvents !== undefined) {
        await updateUserProfilePreferences(currentUser.id, {
          preferences: updates.preferences,
          settings: updates.settings,
          savedEvents: updates.savedEvents,
        });
      }
    } catch (err) {
      console.error('Failed to update user profile:', err);
    }
  }, [currentUser]);

  return {
    currentUser,
    isAuthenticated: isGoogleAuthenticated,
    isLoading: isGoogleLoading,
    error: googleError,
    login: async (_credentials?: AuthCredentials) => {
      await googleSignIn();
      return true;
    },
    signup: async (_data?: SignupData) => {
      await googleSignIn();
      return true;
    },
    logout,
    updateUser,
    addCreatedEvent,
    clearError: clearGoogleError,
  };
};
