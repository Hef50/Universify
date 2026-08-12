/**
 * Bolt.js real-time event listener.
 *
 * Subscribes to message events in Slack channels. When a new message arrives
 * in a monitored channel, it parses the message, stores the result in the
 * in-memory store, and persists it to Supabase.
 *
 * When SLACK_REVIEW_CHANNEL is set, parsed events are posted there with
 * Approve/Reject buttons instead of being persisted immediately — a
 * human-in-the-loop flow matching the Discord bot's review workflow.
 */

import { App } from '@slack/bolt';
import { parseSlackMessage, UniversifyEvent } from './parser';
import { addEvent, getEvent, removeEvent, isChannelMonitored, getMonitoredChannels } from './store';
import { submitSlackEvent, isPersistenceConfigured } from './supabaseSubmit';

const REVIEW_CHANNEL = process.env.SLACK_REVIEW_CHANNEL;

function reviewBlocks(event: UniversifyEvent) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*Event parsed from #${event.tags.find((t) => t.startsWith('channel:'))?.slice(8) || 'a channel'}*\n` +
          `*${event.title}*\n` +
          `🕒 ${event.startTime} → ${event.endTime}\n` +
          `📍 ${event.location || '—'}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          style: 'primary',
          text: { type: 'plain_text', text: 'Approve' },
          action_id: 'event_approve',
          value: event.id,
        },
        {
          type: 'button',
          style: 'danger',
          text: { type: 'plain_text', text: 'Reject' },
          action_id: 'event_reject',
          value: event.id,
        },
      ],
    },
  ];
}

/** Persist an event, logging the outcome. */
async function persistEvent(event: UniversifyEvent): Promise<string> {
  const result = await submitSlackEvent(event);
  switch (result.status) {
    case 'inserted':
      console.log(`[Persist] Stored "${event.title}" in Supabase`);
      return 'stored';
    case 'duplicate':
      console.log(`[Persist] Skipped "${event.title}" — duplicate of an existing event`);
      return 'duplicate';
    case 'skipped':
      return 'not configured';
    case 'error':
      console.error(`[Persist] Failed to store "${event.title}": ${result.error}`);
      return 'error';
  }
}

/**
 * Register Slack event listeners on the Bolt app.
 *
 * The app listens for `message` events in channels.
 * If the channel is in the monitored list (or if no channels are explicitly
 * monitored, it listens to ALL channels the bot is in), it parses the message
 * and stores it as a Universify event.
 */
export function registerListeners(app: App): void {
  // Listen for all messages in channels the bot is a member of
  app.message(async ({ message, client }) => {
    try {
      // Type guard: only handle regular messages (not edits, deletes, etc.)
      if (message.subtype && message.subtype !== 'bot_message') return;

      const msg = message as any;
      const channelId = msg.channel as string;
      const text = msg.text as string;
      const ts = msg.ts as string;

      // Skip if empty
      if (!text || !text.trim()) return;

      // If we have a monitored channel list, only process those
      const monitored = getMonitoredChannels();
      if (monitored.length > 0 && !isChannelMonitored(channelId)) {
        return;
      }

      // Look up channel name
      let channelName = channelId;
      try {
        const info = await client.conversations.info({ channel: channelId });
        channelName = (info.channel as any)?.name || channelId;
      } catch {
        // Non-critical
      }

      // Look up user display name
      let username: string | undefined;
      if (msg.user) {
        try {
          const userInfo = await client.users.info({ user: msg.user });
          username =
            (userInfo.user as any)?.real_name ||
            (userInfo.user as any)?.name ||
            undefined;
        } catch {
          // Non-critical
        }
      }

      // Parse and store
      const event = parseSlackMessage(
        {
          text,
          ts,
          user: msg.user,
          channel: channelId,
          username,
        },
        channelName,
        channelId
      );

      if (event) {
        const isNew = addEvent(event);
        if (isNew) {
          console.log(
            `[Listener] New event from #${channelName}: "${event.title}" (${event.startTime})`
          );

          if (REVIEW_CHANNEL) {
            // Human-in-the-loop: post for approval instead of auto-persisting
            try {
              await client.chat.postMessage({
                channel: REVIEW_CHANNEL,
                text: `Event parsed: ${event.title}`,
                blocks: reviewBlocks(event),
              });
            } catch (err) {
              console.error('[Listener] Failed to post review message:', err);
            }
          } else if (isPersistenceConfigured()) {
            await persistEvent(event);
          }
        }
      }
    } catch (error) {
      console.error('[Listener] Error processing message:', error);
    }
  });

  // ── Review-channel button handlers ──
  app.action('event_approve', async ({ ack, body, client }) => {
    await ack();
    const action = (body as any).actions?.[0];
    const eventId = action?.value as string | undefined;
    const event = eventId ? getEvent(eventId) : undefined;

    let outcome = 'not found';
    if (event) outcome = await persistEvent(event);

    const channel = (body as any).channel?.id;
    const ts = (body as any).message?.ts;
    if (channel && ts) {
      const label =
        outcome === 'stored'
          ? '✅ Approved and stored'
          : outcome === 'duplicate'
            ? '☑️ Approved — duplicate of an existing event, not re-added'
            : outcome === 'not configured'
              ? '✅ Approved (Supabase not configured; kept in memory only)'
              : `⚠️ Approval failed (${outcome})`;
      await client.chat.update({
        channel,
        ts,
        text: `${label}: ${event?.title ?? eventId}`,
        blocks: [],
      });
    }
  });

  app.action('event_reject', async ({ ack, body, client }) => {
    await ack();
    const action = (body as any).actions?.[0];
    const eventId = action?.value as string | undefined;
    const event = eventId ? getEvent(eventId) : undefined;
    if (eventId) removeEvent(eventId);

    const channel = (body as any).channel?.id;
    const ts = (body as any).message?.ts;
    if (channel && ts) {
      await client.chat.update({
        channel,
        ts,
        text: `🗑️ Rejected: ${event?.title ?? eventId}`,
        blocks: [],
      });
    }
  });

  console.log('[Listener] Slack message listeners registered');
  if (REVIEW_CHANNEL) {
    console.log(`[Listener] Review flow enabled — approvals go to ${REVIEW_CHANNEL}`);
  } else if (isPersistenceConfigured()) {
    console.log('[Listener] Auto-persisting parsed events to Supabase');
  } else {
    console.log('[Listener] Supabase not configured — events kept in memory only');
  }
}
