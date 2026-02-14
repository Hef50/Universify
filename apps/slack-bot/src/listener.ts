/**
 * Bolt.js real-time event listener.
 *
 * Subscribes to message events in Slack channels.
 * When a new message arrives in a monitored channel, it parses the message
 * and stores the result in the in-memory store.
 */

import { App } from '@slack/bolt';
import { parseSlackMessage } from './parser';
import { addEvent, isChannelMonitored, getMonitoredChannels } from './store';

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
        }
      }
    } catch (error) {
      console.error('[Listener] Error processing message:', error);
    }
  });

  console.log('[Listener] Slack message listeners registered');
}
