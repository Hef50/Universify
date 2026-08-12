/**
 * Re-date the bundled demo events onto the current month.
 *
 * The seed catalogue is content the app ships with — real CMU-flavoured
 * titles, locations and organisers — but its dates go stale the moment the
 * month turns over, and an events app whose events are all in the past looks
 * broken. This rewrites `data/allEvents.json` in place, spreading every event
 * across a window that starts on the 1st of the current month and runs at
 * least three weeks past today, so there is always a mix of events that
 * already happened, events happening today, and events still to come.
 *
 * Content, ids and RSVP counts are preserved — ids especially, so RSVPs and
 * calendar pins saved on a device still line up after a refresh.
 *
 * Usage:
 *   node scripts/refreshEventDates.js              # anchor on today
 *   node scripts/refreshEventDates.js --today 2026-09-03
 */
const fs = require('fs');
const path = require('path');

// Campus time. Wall-clock hours in the source data are treated as local
// Pittsburgh times so a 10:00 career fair stays a 10:00 career fair.
const TIME_ZONE = 'America/New_York';

const DATA_FILE = path.join(__dirname, '..', 'data', 'allEvents.json');
const DAY_MS = 24 * 60 * 60 * 1000;
// Always keep at least this much future runway, even when run on the 30th
const MIN_FUTURE_DAYS = 21;
// Titles that read like a standing commitment become weekly series
const RECURRING_TITLE = /weekly|practice|study group|office hours|rehearsal|club meeting/i;
const MAX_RECURRING = 6;

/** Offset of `timeZone` from UTC, in ms, at the given instant. */
function offsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/** The wall-clock hour and minute an instant lands on in `timeZone`. */
function zonedHourMinute(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return { hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

/** Wall-clock time in `timeZone` -> the UTC instant it refers to. */
function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // One correction pass is exact except inside a DST transition hour
  return new Date(naive - offsetMs(new Date(naive), timeZone));
}

function parseArgs(argv) {
  const todayIndex = argv.indexOf('--today');
  if (todayIndex === -1) return { today: new Date() };
  const value = argv[todayIndex + 1];
  const parsed = new Date(`${value}T12:00:00Z`);
  if (isNaN(parsed.getTime())) {
    throw new Error(`--today expects YYYY-MM-DD, got "${value}"`);
  }
  return { today: parsed };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function main() {
  const { today } = parseArgs(process.argv.slice(2));
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const dayOfMonth = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // 1st of this month .. end of month (or 3 weeks out, whichever is later)
  const spanDays = Math.max(daysInMonth, dayOfMonth + MIN_FUTURE_DAYS);

  const events = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error(`No events found in ${DATA_FILE}`);
  }

  // Order by id, not by current date: ids never change, so re-running this
  // script lands every event on exactly the same day rather than reshuffling
  // the catalogue a little further each time.
  const ordered = [...events].sort((a, b) => a.id.localeCompare(b.id));

  const windowStart = zonedToUtc(year, month, 1, 0, 0, TIME_ZONE);
  const windowEnd = new Date(windowStart.getTime() + (spanDays - 1) * DAY_MS);

  let recurringLeft = MAX_RECURRING;
  const counts = { past: 0, today: 0, future: 0, recurring: 0 };

  ordered.forEach((event, index) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMs = Math.max(end.getTime() - start.getTime(), 30 * 60 * 1000);

    // Keep each event at the campus-local hour it already runs at, so
    // re-running this script never drifts a 7pm event into a 3pm one
    const { hour, minute } = zonedHourMinute(start, TIME_ZONE);

    // Even spread across the window, in catalogue order
    const dayOffset = Math.floor((index * spanDays) / ordered.length);
    const slotDay = new Date(windowStart.getTime() + dayOffset * DAY_MS);
    const newStart = zonedToUtc(
      slotDay.getUTCFullYear(),
      slotDay.getUTCMonth() + 1,
      slotDay.getUTCDate(),
      hour,
      minute,
      TIME_ZONE
    );
    const newEnd = new Date(newStart.getTime() + durationMs);

    event.startTime = newStart.toISOString();
    event.endTime = newEnd.toISOString();
    event.createdAt = new Date(newStart.getTime() - 21 * DAY_MS).toISOString();
    event.updatedAt = new Date(newStart.getTime() - 7 * DAY_MS).toISOString();

    // A few standing commitments repeat weekly through the window
    if (
      recurringLeft > 0 &&
      dayOffset < 10 &&
      RECURRING_TITLE.test(event.title) &&
      !event.recurring
    ) {
      event.recurring = {
        frequency: 'weekly',
        interval: 1,
        endDate: isoDate(new Date(windowEnd.getTime() + 28 * DAY_MS)),
      };
      recurringLeft -= 1;
    }
    if (event.recurring) counts.recurring += 1;

    const startsToday = isoDate(newStart) === isoDate(today);
    if (startsToday) counts.today += 1;
    else if (newEnd < today) counts.past += 1;
    else counts.future += 1;
  });

  fs.writeFileSync(DATA_FILE, `${JSON.stringify(ordered, null, 2)}\n`);

  console.log(
    `Re-dated ${ordered.length} events onto ${isoDate(windowStart)} .. ${isoDate(windowEnd)}`
  );
  console.log(
    `  ${counts.past} already happened, ${counts.today} today, ${counts.future} upcoming, ${counts.recurring} weekly series`
  );
}

main();
