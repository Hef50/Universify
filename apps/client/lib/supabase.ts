import { createClient } from '@supabase/supabase-js';

// Supabase configuration (same as GCal project)
const supabaseUrl = 'https://yjfmijtqacsnhicpyqzk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZm1panRxYWNzbmhpY3B5cXprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5OTQ2MzQsImV4cCI6MjA3NzU3MDYzNH0.F-mYSFVvrkJUETuEA2AimNebGWdHnsLRdM6XEBUL6-k';

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export types for use throughout the app
export type { Session, User as SupabaseUser } from '@supabase/supabase-js';

