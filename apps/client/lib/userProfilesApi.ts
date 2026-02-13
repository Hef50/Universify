import { supabase } from '@/lib/supabase';
import type { User, UserPreferences, UserSettings } from '@/types/user';

export interface UserProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  university: string | null;
  preferences: {
    preferences?: UserPreferences;
    settings?: UserSettings;
    [key: string]: unknown;
  };
}

export async function fetchUserProfile(userId: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfileRow;
}

export async function upsertUserProfile(user: {
  id: string;
  email: string;
  name: string;
  university: string;
  preferences?: User['preferences'];
  settings?: UserSettings;
}): Promise<void> {
  const prefs = user.preferences || {};
  const settings = user.settings || {
    theme: 'system',
    defaultHomePage: 'calendar',
    calendarViewDays: 7,
    colorScheme: 'default',
    fontSize: 'medium',
    accessibility: { highContrast: false, reduceMotion: false },
  };

  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      university: user.university,
      preferences: { preferences: prefs, settings },
    },
    { onConflict: 'id' }
  );

  if (error) throw error;
}

export async function updateUserProfilePreferences(
  userId: string,
  updates: { preferences?: Partial<User['preferences']>; settings?: Partial<UserSettings> }
): Promise<void> {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single();

  const current = (existing?.preferences as { preferences?: Record<string, unknown>; settings?: Record<string, unknown> }) || {};
  const merged = {
    preferences: { ...current.preferences, ...updates.preferences },
    settings: { ...current.settings, ...updates.settings },
  };

  const { error } = await supabase
    .from('user_profiles')
    .update({ preferences: merged })
    .eq('id', userId);

  if (error) throw error;
}
