import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs, googleCalendarUrl } from '../utils/calendarLinks';
import type { Event } from '../types/event';

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'evt-1',
  title: 'Poker Night, Round 2; Finals',
  description: 'Bring chips\nand snacks',
  startTime: '2026-08-14T19:00:00Z',
  endTime: '2026-08-14T21:30:00Z',
  location: 'Wiegand Gym, CUC',
  categories: [],
  organizer: { id: 'org-1', name: 'Chess Club', type: 'club' },
  color: '#FF6BA8',
  rsvpEnabled: true,
  rsvpCounts: { going: 3, maybe: 1, notGoing: 0 },
  attendees: [],
  attendeeVisibility: 'public',
  isClubEvent: true,
  isSocialEvent: false,
  tags: [],
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  ...overrides,
});

test('buildIcs escapes commas and semicolons in SUMMARY and LOCATION', () => {
  const ics = buildIcs(makeEvent());
  assert.ok(ics.includes('SUMMARY:Poker Night\\, Round 2\\; Finals'));
  assert.ok(ics.includes('LOCATION:Wiegand Gym\\, CUC'));
});

test('buildIcs escapes newlines in DESCRIPTION as literal \\n', () => {
  const ics = buildIcs(makeEvent());
  assert.ok(ics.includes('DESCRIPTION:Bring chips\\nand snacks'));
  // The escaped value must live on a single line.
  const descriptionLine = ics
    .split('\r\n')
    .find((line) => line.startsWith('DESCRIPTION:'));
  assert.equal(descriptionLine, 'DESCRIPTION:Bring chips\\nand snacks');
});

test('buildIcs escapes backslashes before other characters', () => {
  const ics = buildIcs(makeEvent({ title: 'Back\\slash, test' }));
  assert.ok(ics.includes('SUMMARY:Back\\\\slash\\, test'));
});

test('buildIcs formats DTSTART/DTEND in UTC basic format from ISO input', () => {
  const ics = buildIcs(makeEvent());
  assert.ok(ics.includes('DTSTART:20260814T190000Z'));
  assert.ok(ics.includes('DTEND:20260814T213000Z'));
});

test('buildIcs converts offset timestamps to UTC', () => {
  const ics = buildIcs(
    makeEvent({
      startTime: '2026-08-14T19:00:00.000-04:00',
      endTime: '2026-08-14T21:30:00.000-04:00',
    })
  );
  assert.ok(ics.includes('DTSTART:20260814T230000Z'));
  assert.ok(ics.includes('DTEND:20260815T013000Z'));
});

test('buildIcs includes the UID and calendar wrapper with CRLF endings', () => {
  const ics = buildIcs(makeEvent());
  assert.ok(ics.includes('UID:evt-1@cmunify'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('PRODID:-//CMUnify//EN'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('END:VEVENT\r\n'));
  assert.ok(ics.trimEnd().endsWith('END:VCALENDAR'));
  // Every line break is CRLF — no bare \n anywhere.
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false);
});

test('googleCalendarUrl uses the render endpoint with action=TEMPLATE', () => {
  const url = googleCalendarUrl(makeEvent());
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(url.includes('action=TEMPLATE'));
});

test('googleCalendarUrl formats the dates param as START/END in UTC basic', () => {
  const url = googleCalendarUrl(makeEvent());
  assert.ok(url.includes('dates=20260814T190000Z%2F20260814T213000Z'));
});

test('googleCalendarUrl URL-encodes text, details, and location', () => {
  const url = googleCalendarUrl(makeEvent());
  assert.ok(url.includes('text=Poker%20Night%2C%20Round%202%3B%20Finals'));
  assert.ok(url.includes('details=Bring%20chips%0Aand%20snacks'));
  assert.ok(url.includes('location=Wiegand%20Gym%2C%20CUC'));
});
