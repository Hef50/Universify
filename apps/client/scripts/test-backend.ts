/**
 * Backend test script: verifies Supabase connectivity and public read.
 * Run with: pnpm run test:backend (from apps/client)
 *
 * Requires .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { config } from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.join(process.cwd(), '.env') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function fail(msg: string): never {
  console.error('[FAIL]', msg);
  process.exit(1);
}

function pass(msg: string) {
  console.log('[PASS]', msg);
}

async function main() {
  if (!url || !anonKey) {
    fail('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  }

  const supabase = createClient(url, anonKey);

  // 1. Public read: events (no auth required)
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, title, start_time')
    .order('start_time', { ascending: true })
    .limit(5);

  if (eventsError) {
    fail(`Events read: ${eventsError.message}`);
  }
  pass(`Events read: ${Array.isArray(events) ? events.length : 0} rows (sample)`);

  const totalResult = await supabase.from('events').select('id', { count: 'exact', head: true });
  const total = totalResult.count ?? (Array.isArray(totalResult.data) ? totalResult.data.length : 0);
  if (total === 0 && totalResult.error) {
    fail(`Events count: ${totalResult.error.message}`);
  }
  pass(`Events table has ${totalResult.count ?? 0} total rows`);

  // 2. Tables exist: user_profiles, user_scheduled_events (empty is ok)
  const { error: profilesError } = await supabase.from('user_profiles').select('id').limit(1);
  if (profilesError) {
    fail(`user_profiles accessible: ${profilesError.message}`);
  }
  pass('user_profiles table readable');

  const { error: scheduledError } = await supabase.from('user_scheduled_events').select('id').limit(1);
  if (scheduledError) {
    fail(`user_scheduled_events accessible: ${scheduledError.message}`);
  }
  pass('user_scheduled_events table readable');

  console.log('\nAll backend checks passed. Run the app and sign in to verify write paths (create event, schedule).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
