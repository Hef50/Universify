import { User } from '@/types/user';

/**
 * Dev-mode test accounts.
 *
 * These personas exist ONLY on the client: their ids carry a "dev-" prefix,
 * which the data layer uses to skip every Supabase write (they are not real
 * auth.users rows). They exist so the app can be exercised end-to-end —
 * tabs, calendar, RSVPs, recommendations — without CMU SSO.
 *
 * NOTE: dev mode is gated by a password that ships in the client bundle.
 * That is a convenience latch for testers, NOT security. Nothing behind it
 * may ever grant access to real data.
 */

const baseSettings: User['settings'] = {
  theme: 'system',
  defaultHomePage: 'calendar',
  calendarViewDays: 7,
  colorScheme: 'default',
  fontSize: 'medium',
  compactView: false,
  accessibility: {
    highContrast: false,
    reduceMotion: false,
  },
};

const basePreferences: User['preferences'] = {
  categoryInterests: [],
  eventTypePreferences: {
    clubEvents: true,
    socialEvents: true,
  },
  defaultRSVPVisibility: 'public',
  notificationPreferences: {
    email: false,
    push: false,
    eventReminders: true,
    newEventsInCategories: false,
  },
  publicProfile: false,
};

function makeAccount(overrides: Partial<User> & { id: string; name: string }): User {
  return {
    email: `${overrides.id}@example.invalid`,
    university: 'Carnegie Mellon University',
    preferences: basePreferences,
    settings: baseSettings,
    savedEvents: [],
    createdEvents: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: new Date().toISOString(),
    ...overrides,
  };
}

export interface DevAccount {
  user: User;
  /** Short blurb shown in the account picker */
  description: string;
}

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    user: makeAccount({
      id: 'dev-freshman',
      name: 'Fiona Freshman',
      email: 'dev-freshman@example.invalid',
    }),
    description: 'Brand-new user — no interests, no history. Cold-start experience.',
  },
  {
    user: makeAccount({
      id: 'dev-power-user',
      name: 'Petra Poweruser',
      email: 'dev-power-user@example.invalid',
      preferences: {
        ...basePreferences,
        categoryInterests: ['Tech', 'Social', 'Food'],
      },
    }),
    description: 'Explicit category interests set — exercises the ranked Home feed.',
  },
  {
    user: makeAccount({
      id: 'dev-organizer',
      name: 'Oscar Organizer',
      email: 'dev-organizer@example.invalid',
      preferences: {
        ...basePreferences,
        categoryInterests: ['Career', 'Academic'],
      },
    }),
    description: 'Club-officer persona — use Create to add events, then find them under My Events.',
  },
];

/** True when a user id belongs to a local dev persona (never hits Supabase). */
export function isDevUserId(id: string | undefined | null): boolean {
  return typeof id === 'string' && id.startsWith('dev-');
}
