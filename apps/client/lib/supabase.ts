import { createClient } from '@supabase/supabase-js';

// Supabase configuration - uses environment variables from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when real Supabase credentials are present. When false the app runs in
 * offline/demo mode: reads fall back to bundled mock data and writes are kept
 * in local state only. Callers should check this before hitting the network.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Missing Supabase credentials. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env. Running in offline demo mode.'
  );
}

// createClient throws on an empty URL, which would crash the bundle at module
// load. Fall back to a syntactically valid placeholder; isSupabaseConfigured
// gates all real usage so the placeholder client is never actually queried.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://offline-demo.invalid',
  isSupabaseConfigured ? supabaseAnonKey : 'offline-demo-anon-key'
);

// Export types for use throughout the app
export type { Session, User as SupabaseUser } from '@supabase/supabase-js';
