# Supabase Setup (New Project)

This app uses Supabase for auth and backend. Follow these steps to connect your Supabase project.

## 1. Get Your Credentials

1. Go to [app.supabase.com](https://app.supabase.com) and open your project
2. Click **Project Settings** (gear icon in sidebar)
3. Go to **API** tab
4. Copy:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
   - **anon public** key (the long JWT string under "Project API keys")

## 2. Create .env File

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `apps/client/.env` and paste your values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_key_here
   ```

3. **Never commit .env** - it's in .gitignore

## 3. Configure Google OAuth (for sign-in)

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth Client ID and Secret (from Google Cloud Console)
4. Under **Redirect URLs**, add your app URLs:
   - For web dev: `http://localhost:8081/**`
   - For Expo web: `https://auth.expo.io/@your-username/your-app-slug`
   - For production: your production URL

## 4. Restart the Dev Server

After creating/updating `.env`, restart Expo so it picks up the new values:

```bash
# Stop the current server (Ctrl+C), then:
pnpm start
# or
npm start
```

## 5. Create Database Tables

1. In Supabase Dashboard → **SQL Editor**, run the migration:
   - Open `supabase/migrations/001_initial_schema.sql` from the project root
   - Copy its contents and run in a new query

2. Seed events (optional, for initial data):
   ```bash
   cd apps/client
   # Add SUPABASE_SERVICE_ROLE_KEY to .env for seed (bypasses RLS)
   pnpm seed
   ```

## 6. Verify It Works

- Open the app and try "Sign in with Google"
- If you see auth errors, check the Supabase Dashboard → **Logs** for details
- Ensure Google OAuth redirect URLs match exactly
