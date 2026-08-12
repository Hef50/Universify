# Database Setup Guide

## Current Status

The app currently uses **localStorage** (web) for data persistence. Events are loaded from mock JSON files on first load.

## What Was Fixed

✅ **Recommendations Sidebar** - Now shows actual event recommendations instead of "coming soon"
✅ **Event Loading** - Improved event loading logic to ensure mock data is always available
✅ **Loading States** - Added loading indicators for better UX

## Connecting to a Database

### Option 1: Supabase (Recommended)

1. **Create a Supabase project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Install Supabase client**
   ```bash
   cd Universify/apps/client
   npm install @supabase/supabase-js
   ```

3. **Create environment file**
   Create `.env` in `apps/client/`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up database schema**
   Create a table called `events` with columns matching the Event type:
   ```sql
   CREATE TABLE events (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     start_time TIMESTAMPTZ NOT NULL,
     end_time TIMESTAMPTZ NOT NULL,
     location TEXT,
     categories TEXT[],
     organizer_id TEXT,
     organizer_name TEXT,
     organizer_type TEXT,
     color TEXT,
     rsvp_enabled BOOLEAN DEFAULT true,
     rsvp_counts JSONB,
     attendees JSONB,
     attendee_visibility TEXT,
     is_club_event BOOLEAN DEFAULT false,
     is_social_event BOOLEAN DEFAULT false,
     capacity INTEGER,
     recurring JSONB,
     tags TEXT[],
     image_url TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **Update API service**
   - Uncomment and configure the Supabase code in `lib/api.ts`
   - Update `contexts/EventsContext.tsx` to use the API functions

### Option 2: Custom REST API

1. **Set up your backend API**
   - Create endpoints: GET /events, POST /events, PUT /events/:id, DELETE /events/:id

2. **Update API service**
   - Modify `lib/api.ts` to use fetch() calls to your API
   - Update `contexts/EventsContext.tsx` to use the API functions

3. **Set environment variable**
   ```
   EXPO_PUBLIC_API_URL=https://your-api-url.com
   ```

## Testing Without Database

With no Supabase credentials the app runs in offline demo mode against
`data/allEvents.json` (125 events). RSVPs and calendar pins made in that mode
are saved to the device (localStorage) so they survive a reload.

Demo dates go stale as months pass. Re-date the whole catalogue onto the
current month — some events already past, some today, the rest upcoming:

```bash
pnpm --filter @universify/client exec node scripts/refreshEventDates.js
# or, from apps/client:  npm run refresh-events
```

Event ids are preserved, so RSVPs and pins already saved on a device still
line up afterwards.

## Troubleshooting

### Events not showing in calendar?

1. **Check browser console** for errors
2. **Clear localStorage** and refresh:
   ```javascript
   localStorage.removeItem('universify_events');
   ```
3. **Check event dates** - The calendar only shows events you RSVP'd to, pinned, or are hosting. If the demo catalogue is stale, run `node scripts/refreshEventDates.js` to move it onto the current month.

### Recommendations not showing?

- Make sure you're logged in (recommendations use user preferences)
- Check that events are loaded (should see events in calendar)
- Recommendations only show on desktop view (sidebar on right)

## Next Steps

1. Set up Supabase or your preferred database
2. Update `lib/api.ts` with real API calls
3. Update `contexts/EventsContext.tsx` to use API instead of localStorage
4. Test with real data

