import { Event, EventCategory } from '@/types/event';

/**
 * Dev-mode helpers: generate realistic test events pinned to the CURRENT
 * week (the bundled mock data has fixed dates that drift into the past),
 * so the calendar and feed always have something fresh to show.
 */

const SAMPLE_TITLES: { title: string; categories: EventCategory[]; location: string }[] = [
  { title: 'Poker Night @ Wiegand', categories: ['Social', 'Fun'], location: 'Wiegand Gym Lounge' },
  { title: 'Intro to Systems Study Session', categories: ['Academic', 'Tech'], location: 'Gates 4401' },
  { title: 'ScottyLabs Demo Day', categories: ['Tech', 'Networking'], location: 'Rangos Ballroom' },
  { title: 'Late Night Pancakes', categories: ['Food', 'Social'], location: 'Cohon Center Kitchen' },
  { title: 'Climbing Wall Open Hours', categories: ['Sports', 'Wellness'], location: 'Cohon Fitness Center' },
  { title: 'Resume Review Drop-in', categories: ['Career'], location: 'CPDC Office' },
  { title: 'A Cappella Showcase', categories: ['Arts'], location: 'McConomy Auditorium' },
  { title: 'Board Game Cafe', categories: ['Fun', 'Social'], location: 'Danforth Lounge' },
  { title: 'Startup Pitch Practice', categories: ['Career', 'Networking'], location: 'Swartz Center' },
  { title: 'Trivia Night', categories: ['Fun', 'Social'], location: 'Schatz Dining' },
];

const COLORS = ['#E11D48', '#8B5CF6', '#0EA5E9', '#059669', '#D97706', '#DB2777'];

export const DEV_EVENT_PREFIX = 'dev-seed-';

/**
 * Generate `count` events spread over the next 7 days at plausible times.
 * Ids carry DEV_EVENT_PREFIX so they can be cleared with one tap.
 */
export function generateDevEvents(count: number): Event[] {
  const events: Event[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const sample = SAMPLE_TITLES[i % SAMPLE_TITLES.length];
    const dayOffset = i % 7;
    const startHour = 10 + ((i * 3) % 11); // 10:00 .. 20:00

    const start = new Date(now);
    start.setDate(now.getDate() + dayOffset);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(startHour + 1, 30, 0, 0);

    const going = ((i * 17) % 80) + 5;
    const iso = new Date().toISOString();

    events.push({
      id: `${DEV_EVENT_PREFIX}${i}-${start.toISOString().slice(0, 10)}`,
      title: sample.title,
      description: `Test event seeded by dev mode. ${sample.title} — come hang out!`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: sample.location,
      categories: sample.categories,
      organizer: { id: 'dev-organizer', name: 'Dev Mode', type: 'club' },
      color: COLORS[i % COLORS.length],
      rsvpEnabled: true,
      rsvpCounts: { going, maybe: (i * 5) % 20, notGoing: (i * 3) % 10 },
      attendees: [],
      attendeeVisibility: 'public',
      isClubEvent: i % 2 === 0,
      isSocialEvent: i % 2 === 1,
      capacity: i % 3 === 0 ? going + 20 : undefined,
      tags: ['dev-seed'],
      createdAt: iso,
      updatedAt: iso,
    });
  }

  return events;
}
