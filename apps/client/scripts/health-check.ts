/**
 * Health-check: verify Supabase env and connectivity.
 * Run with: pnpm run test:health (from apps/client)
 */

import { config } from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.join(process.cwd(), '.env') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!url || !anonKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);
  const { error } = await supabase.from('events').select('id').limit(1);

  if (error) {
    console.error('Supabase health check failed:', error.message);
    process.exit(1);
  }

  console.log('Health check passed: Supabase reachable and env set.');
  process.exit(0);
}

main();
