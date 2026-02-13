/**
 * Seed events from allEvents.json into Supabase.
 * Run with: pnpm seed (from apps/client)
 *
 * Requires in .env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (for RLS bypass)
 */

import { config } from 'dotenv';
import createFetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env - run from apps/client (pnpm seed)
config({ path: path.join(process.cwd(), '.env') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY. Use service role for seed (bypasses RLS).'
  );
  process.exit(1);
}

// Use node-fetch - Node native fetch can fail on Windows with external HTTPS
const supabase = createClient(url, serviceKey, {
  global: { fetch: createFetch as any },
});

interface JsonEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  categories: string[];
  organizer: { id: string; name: string; type: string };
  color: string;
  rsvpEnabled: boolean;
  rsvpCounts: { going: number; maybe: number; notGoing: number };
  attendees: unknown[];
  attendeeVisibility: string;
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  recurring?: unknown;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

function toDbEvent(e: JsonEvent) {
  // Schema allows only 'club' | 'individual'; normalize 'student' -> 'individual'
  const orgType = e.organizer.type === 'student' ? 'individual' : e.organizer.type;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    start_time: e.startTime,
    end_time: e.endTime,
    location: e.location,
    categories: e.categories,
    organizer_id: e.organizer.id,
    organizer_name: e.organizer.name,
    organizer_type: orgType,
    color: e.color,
    rsvp_enabled: e.rsvpEnabled,
    rsvp_counts: e.rsvpCounts,
    attendees: e.attendees,
    attendee_visibility: e.attendeeVisibility,
    is_club_event: e.isClubEvent,
    is_social_event: e.isSocialEvent,
    capacity: e.capacity,
    recurring: e.recurring,
    tags: e.tags,
    image_url: e.imageUrl,
  };
}

async function main() {
  const dataPath = path.join(process.cwd(), 'data', 'allEvents.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const events: JsonEvent[] = JSON.parse(raw);

  const dbEvents = events.map(toDbEvent);
  console.log(`Seeding ${dbEvents.length} events...`);

  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < dbEvents.length; i += batchSize) {
    const batch = dbEvents.slice(i, i + batchSize);
    const { error } = await supabase.from('events').upsert(batch, {
      onConflict: 'id',
    });

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${dbEvents.length}...`);
    }
  }

  console.log(`Done. Inserted: ${inserted}, Errors: ${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
