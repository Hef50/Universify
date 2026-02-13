# Google Sign-In & Calendar Integration Summary

This document summarizes all the changes made to integrate Google Sign-In and Google Calendar functionality into Universify.

---

## 📦 New Dependencies Added

### Package Dependencies
- **`@supabase/supabase-js`** (v2.78.0) - Supabase client for authentication and database
- **`@supabase/auth-helpers-react`** (v0.5.0) - React helpers for Supabase auth (deprecated but functional)

**Location:** `apps/client/package.json`

---

## 🆕 New Files Created

### 1. **`apps/client/lib/supabase.ts`**
- **Purpose:** Supabase client configuration
- **Key Features:**
  - Creates Supabase client with project URL and anon key
  - Exports Session and User types
  - Shared configuration with GCal project

### 2. **`apps/client/contexts/GoogleAuthContext.tsx`**
- **Purpose:** Manages Google OAuth authentication state
- **Key Features:**
  - `googleSignIn()` - Initiates Google OAuth flow with Calendar scope
  - `googleSignOut()` - Signs out from Google
  - `refreshSession()` - Refreshes authentication session
  - Tracks `providerToken` for Google Calendar API access
  - Listens to auth state changes
  - Stores session in localStorage (web)

### 3. **`apps/client/contexts/GoogleCalendarContext.tsx`**
- **Purpose:** Manages Google Calendar events sync and creation
- **Key Features:**
  - `syncGoogleCalendar()` - Fetches events from Google Calendar (4 weeks ahead)
  - `getGoogleEventsForWeek()` - Filters events for a specific week
  - `createEventInGoogleCalendar()` - Creates events in user's Google Calendar
  - `refreshGoogleCalendar()` - Forces a refresh of calendar events
  - Caches events in localStorage (5-minute cache duration)
  - Converts Google Calendar events to Universify Event format

### 4. **`apps/client/lib/googleCalendar.ts`**
- **Purpose:** Google Calendar API service functions
- **Key Functions:**
  - `fetchGoogleCalendarEvents()` - Fetches events from Google Calendar API
  - `createGoogleCalendarEvent()` - Creates events in Google Calendar
  - `convertGoogleEventToUniversifyEvent()` - Converts Google format to Universify format
  - `getWeekTimeRange()` - Calculates time range for a week
  - `getTimeRangeForDates()` - Calculates time range for date range
  - `extractCategoriesFromEvent()` - Extracts categories from Google event

### 5. **`apps/client/types/json.d.ts`**
- **Purpose:** TypeScript declaration for JSON imports
- **Why:** Allows TypeScript to properly handle `.json` file imports

---

## 🔄 Modified Files

### 1. **`apps/client/app/_layout.tsx`**
**Changes:**
- Added `GoogleAuthProvider` wrapper (outermost)
- Added `GoogleCalendarProvider` wrapper
- Provider hierarchy: `GoogleAuthProvider` → `AuthProvider` → `GoogleCalendarProvider` → `SettingsProvider` → `EventsProvider`

### 2. **`apps/client/app/(auth)/login.tsx`**
**Changes:**
- Imported `useGoogleAuth` hook
- Added "Sign in with Google" button with Google icon
- Added loading state for Google sign-in
- Added error display for Google sign-in errors
- Button disabled during Google or regular sign-in loading

### 3. **`apps/client/app/(auth)/signup.tsx`**
**Changes:**
- Imported `useGoogleAuth` hook
- Added "Sign up with Google" button with Google icon
- Added loading state for Google sign-in
- Added error display for Google sign-in errors
- Button disabled during Google or regular sign-up loading

### 4. **`apps/client/hooks/useAuth.ts`**
**Changes:**
- Integrated with `GoogleAuthContext`
- `isAuthenticated` now returns `true` if either local auth OR Google auth is active
- `isLoading` reflects loading states from both auth systems
- Creates `User` object from Google session when Google-authenticated
- Extracts university from Google email
- Sets default preferences for Google users
- `logout()` calls `googleSignOut()` if user signed in with Google
- Stores auth provider type in localStorage to track sign-in method

### 5. **`apps/client/app/(tabs)/calendar.tsx`**
**Changes:**
- Imported `useGoogleCalendar` and `useGoogleAuth`
- Merges Universify events and Google Calendar events in calendar grid
- `universifyWeekEvents` - Universify events scheduled for current week
- `googleWeekEvents` - Google Calendar events for current week
- `weekEvents` - Combined events for calendar grid display
- `sortedEvents` - Only Universify events (excludes Google events) for sidebar
- `handleScheduleEvent()` - Creates event in Google Calendar when "+" button pressed
  - Uses direct API call matching GCal implementation
  - Refreshes session before using `provider_token`
  - Builds event object exactly like GCal
  - Shows success/error alerts
- Filters out Google events from sidebar (Google events only in grid)

### 6. **`apps/client/components/calendar/EventDisplayCard.tsx`**
**Changes:**
- Added `isGoogleEvent` prop (detected by `event.id.startsWith('gcal-')`)
- Shows "Google" badge for Google Calendar events
- Hides schedule/unschedule buttons for Google events (read-only)
- Google events are visually distinguished but not interactive

### 7. **`apps/client/contexts/EventsContext.tsx`**
**Changes:**
- Filters out Google Calendar events (IDs starting with `gcal-`) during load/save
- Ensures `EventsContext` only holds Universify-native events
- Prevents Google events from being stored in localStorage

### 8. **`apps/client/app/(tabs)/find.tsx`**
**Changes:**
- Filters out Google Calendar events before passing to `FilterProvider`
- Ensures only Universify events appear in the "Find" tab

---

## 🔑 Key Features Implemented

### Google Sign-In
1. **OAuth Flow:**
   - Uses Supabase OAuth with Google provider
   - Requests Calendar API scope: `https://www.googleapis.com/auth/calendar`
   - Configures `access_type: 'offline'` for refresh tokens
   - Forces consent screen with `prompt: 'consent'`

2. **Session Management:**
   - Tracks session state via `onAuthStateChange` listener
   - Extracts `provider_token` for Google Calendar API access
   - Stores session in localStorage (web)
   - Auto-refreshes session when needed

3. **Integration with Existing Auth:**
   - Google-authenticated users are recognized by main `AuthContext`
   - Seamless transition between local and Google auth
   - User object created from Google session data

### Google Calendar Integration
1. **Event Fetching:**
   - Fetches events for next 4 weeks
   - Caches events in localStorage (5-minute cache)
   - Auto-syncs when user authenticates
   - Converts Google Calendar format to Universify Event format

2. **Event Display:**
   - Google events appear in calendar grid (read-only)
   - Google events have "Google" badge
   - Google events excluded from sidebar and "Find" tab
   - Events identified by `gcal-` prefix in ID

3. **Event Creation:**
   - When user clicks "+" on Universify event, it's added to:
     - Local calendar view (via localStorage)
     - User's actual Google Calendar (via API)
   - Uses exact same implementation as GCal project
   - Direct API call with `provider_token`
   - Shows success/error alerts

4. **Date Consistency:**
   - All dates are centralized - same dates shown everywhere
   - No date adjustment - original event dates used
   - Google Calendar receives same dates as displayed in app

---

## 🎯 User Flow

### Sign-In Flow
1. User clicks "Sign in with Google" on login/signup page
2. Redirected to Google OAuth consent screen
3. User grants Calendar permissions
4. Redirected back to app
5. Session created with `provider_token`
6. User is authenticated and can access Google Calendar features

### Calendar Sync Flow
1. When user authenticates with Google, calendar auto-syncs
2. Google Calendar events fetched for next 4 weeks
3. Events converted to Universify format
4. Events cached in localStorage
5. Events displayed in calendar grid with "Google" badge

### Event Scheduling Flow
1. User browses Universify events in sidebar or "Find" tab
2. User clicks "+" button on event card
3. Event scheduled locally (stored in localStorage)
4. If Google-authenticated:
   - Session refreshed
   - Event created in Google Calendar via API
   - Success/error alert shown
5. Event appears in calendar grid
6. Event appears in user's actual Google Calendar

---

## 🔧 Technical Details

### Supabase Configuration
- **Project URL:** Set in `.env` as `EXPO_PUBLIC_SUPABASE_URL` (from your Supabase Project Settings -> API)
- **Anon Key:** (stored in `lib/supabase.ts`)
- **Same project as GCal** - shared configuration

### Google Calendar API
- **Endpoint:** `https://www.googleapis.com/calendar/v3/calendars/primary/events`
- **Authentication:** Bearer token from `session.provider_token`
- **Scope:** `https://www.googleapis.com/auth/calendar`

### Event ID Format
- **Universify events:** `evt-{timestamp}-{random}`
- **Google Calendar events:** `gcal-{google_event_id}`
- This allows filtering and identification

### Caching Strategy
- **Google Calendar events:** 5-minute cache in localStorage
- **Scheduled Universify events:** Stored per week in localStorage
- **Cache keys:**
  - `universify_google_events` - Cached Google events
  - `universify_google_events_last_sync` - Last sync timestamp
  - `universify_scheduled_events` - Scheduled Universify events

---

## 🐛 Known Issues & Solutions

### Issue: "No Google access token from Supabase"
**Cause:** `provider_token` not in session  
**Solution:**
1. Check Supabase dashboard → Settings → Auth → Providers → Google
2. Ensure "Store provider tokens" is enabled
3. Sign out and sign in again
4. Check browser console for detailed error logs

### Issue: Events not appearing in Google Calendar
**Cause:** Token not available or API call failing  
**Solution:**
1. Verify user is authenticated (`isGoogleAuthenticated === true`)
2. Check browser console for API errors
3. Verify `provider_token` exists in session
4. Check Google Calendar API quota/limits

---

## 📝 Code Patterns

### GCal-Aligned Implementation
The implementation closely follows the GCal codebase patterns:
- Direct API calls (not wrapped in extra layers)
- Same event object structure
- Same error handling patterns
- Same token usage (`session.provider_token`)

### Separation of Concerns
- **GoogleAuthContext:** Authentication only
- **GoogleCalendarContext:** Calendar operations only
- **EventsContext:** Universify events only (filters Google events)
- Clear separation prevents conflicts

---

## 🚀 Future Enhancements (Not Implemented)

1. **Real-time sync** - WebSocket updates for Google Calendar changes
2. **Two-way sync** - Update Universify events when Google events change
3. **Multiple calendars** - Support for multiple Google calendars
4. **Event updates** - Update Google Calendar events from Universify
5. **Event deletion** - Delete Google Calendar events from Universify

---

## 📊 File Statistics

- **New Files:** 5
- **Modified Files:** 8
- **New Dependencies:** 2
- **Lines of Code Added:** ~1,500+
- **Integration Points:** 10+

---

## ✅ Testing Checklist

- [x] Google Sign-In works on login page
- [x] Google Sign-In works on signup page
- [x] Google Calendar events appear in calendar grid
- [x] Google events have "Google" badge
- [x] Google events are read-only (no schedule buttons)
- [x] Google events excluded from sidebar
- [x] Google events excluded from "Find" tab
- [x] Scheduling Universify event creates it in Google Calendar
- [x] Session refresh works correctly
- [x] Error handling shows user-friendly messages
- [x] Dates are consistent across app and Google Calendar

---

**Last Updated:** Based on GCalView branch commit

