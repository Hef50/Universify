import { App } from '@slack/bolt';
import { parseSlackMessage } from './parser';
import { isChannelMonitored, getMonitoredChannels } from './store';
import { addPendingEvent, buildEventBlocks } from './actions';
import { checkForDuplicate } from './duplicate-checker';

export function registerListeners(app: App): void {
  app.message(async ({ message, client }) => {
    try {
      if (message.subtype && message.subtype !== 'bot_message') return;

      const msg = message as any;
      const channelId = msg.channel as string;
      const text = msg.text as string;
      const ts = msg.ts as string;
      const userId = msg.user as string | undefined;

      if (!text || !text.trim()) return;

      const monitored = getMonitoredChannels();
      if (monitored.length > 0 && !isChannelMonitored(channelId)) {
        return;
      }

      let channelName = channelId;
      try {
        const info = await client.conversations.info({ channel: channelId });
        channelName = (info.channel as any)?.name || channelId;
      } catch {
        // Non-critical
      }

      let username: string | undefined;
      if (userId) {
        try {
          const userInfo = await client.users.info({ user: userId });
          username =
            (userInfo.user as any)?.real_name ||
            (userInfo.user as any)?.name ||
            undefined;
        } catch {
          // Non-critical
        }
      }

      const event = parseSlackMessage(
        { text, ts, user: userId, channel: channelId, username },
        channelName,
        channelId
      );

      if (!event) return;

      const pendingKey = `pending-${channelId}-${ts}`;

      let duplicateWarning: string | undefined;
      try {
        const dupResult = await checkForDuplicate(event);
        if (dupResult.isDuplicate) {
          duplicateWarning =
            dupResult.reason ||
            `Similar to existing event: "${dupResult.matchedEventTitle || 'unknown'}"`;
          console.log(
            `[Listener] Duplicate detected for "${event.title}": ${duplicateWarning}`
          );
        }
      } catch (err) {
        console.error('[Listener] Duplicate check failed, proceeding anyway:', err);
      }

      addPendingEvent(pendingKey, {
        event,
        channelId,
        channelName,
        duplicateWarning,
        createdAt: Date.now(),
      });

      const blocks = buildEventBlocks(event, pendingKey, duplicateWarning);

      if (userId) {
        try {
          await client.chat.postEphemeral({
            channel: channelId,
            user: userId,
            text: `New event parsed: "${event.title}" — approve or reject?`,
            blocks,
          });
          console.log(
            `[Listener] Ephemeral confirmation sent to ${username || userId} for "${event.title}"`
          );
        } catch (ephErr: any) {
          console.error('[Listener] Failed to send ephemeral:', ephErr.message);
        }
      } else {
        console.warn(
          '[Listener] No user ID on message; cannot send ephemeral. Skipping confirmation.'
        );
      }
    } catch (error) {
      console.error('[Listener] Error processing message:', error);
    }
  });

  console.log('[Listener] Slack message listeners registered');
}
