/**
 * IMAP Email Client
 *
 * Connects to a Gmail inbox via IMAP, fetches recent emails,
 * parses them with mailparser, and feeds them through the event parser.
 *
 * Setup required:
 *   1. Enable IMAP in Gmail Settings → See all settings → Forwarding and POP/IMAP
 *   2. Generate a Gmail App Password:
 *      Google Account → Security → 2-Step Verification → App Passwords
 *   3. Set EMAIL_ADDRESS and EMAIL_APP_PASSWORD in your .env file
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { parseEmail } from './parser';
import { addEvent, getEventCount } from './store';

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── IMAP client factory ───────────────────────────────────────────────

function createClient(): ImapFlow {
  return new ImapFlow({
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '993', 10),
    secure: true,
    auth: {
      user: process.env.EMAIL_ADDRESS!,
      pass: process.env.EMAIL_APP_PASSWORD!,
    },
    logger: false as any,
  });
}

// ─── Core fetch logic ──────────────────────────────────────────────────

/**
 * Connect to the inbox, search for emails received in the last `limitDays`
 * days, parse each one with mailparser, and return the results.
 */
export async function fetchRecentEmails(limitDays = 7): Promise<ParsedMail[]> {
  const client = createClient();
  const emails: ParsedMail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const since = new Date();
      since.setDate(since.getDate() - limitDays);

      // client.search returns false if no results, or number[] if found
      const result = await client.search({ since }, { uid: true });
      const uids: number[] = result === false ? [] : result;

      if (uids.length === 0) {
        console.log(`[EmailClient] No emails found in the last ${limitDays} days`);
        return [];
      }

      console.log(`[EmailClient] Found ${uids.length} email(s) — parsing...`);

      for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          emails.push(parsed);
        } catch (parseErr) {
          console.error('[EmailClient] Failed to parse one email, skipping:', parseErr);
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    console.error('[EmailClient] IMAP connection error:', err.message);
    throw err;
  } finally {
    await client.logout().catch(() => {});
  }

  return emails;
}

// ─── Import pipeline ───────────────────────────────────────────────────

/**
 * Fetch recent emails, run each through the event parser, and add new
 * events to the in-memory store.
 *
 * @returns The number of net-new events added to the store.
 */
export async function importEmailEvents(limitDays = 7): Promise<number> {
  const emails = await fetchRecentEmails(limitDays);

  // Parse all emails in parallel — each fires an LLM request simultaneously
  // 20s per-email timeout guards against stalled image downloads or slow LLM responses
  const withTimeout = (mail: import('mailparser').ParsedMail) =>
    Promise.race([
      parseEmail(mail),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Email parse timeout after 20s')), 20000)
      ),
    ]);

  const results = await Promise.allSettled(emails.map(withTimeout));

  let newCount = 0;
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[EmailClient] Error parsing email into event:', result.reason);
      continue;
    }
    const event = result.value;
    if (event) {
      const isNew = addEvent(event);
      if (isNew) {
        newCount++;
        console.log(`[EmailClient] New event: "${event.title}" (${event.startTime})`);
      }
    }
  }

  console.log(
    `[EmailClient] Import complete — ${newCount} new event(s), ${getEventCount()} total in store`
  );
  return newCount;
}

// ─── Polling ───────────────────────────────────────────────────────────

/**
 * Start a recurring poll that imports emails every `intervalMinutes` minutes.
 * Runs once immediately on start.
 */
export function startPolling(intervalMinutes = 15): void {
  console.log(
    `[EmailClient] Polling started — checking inbox every ${intervalMinutes} minute(s)`
  );

  importEmailEvents().catch((err) =>
    console.error('[EmailClient] Initial import failed:', err.message)
  );

  pollTimer = setInterval(() => {
    importEmailEvents().catch((err) =>
      console.error('[EmailClient] Polling import failed:', err.message)
    );
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the polling loop.
 */
export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('[EmailClient] Polling stopped');
  }
}
