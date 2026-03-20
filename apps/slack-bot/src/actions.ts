import { App } from '@slack/bolt';
import { UniversifyEvent } from './parser';
import { addEvent } from './store';

interface PendingEvent {
  event: UniversifyEvent;
  channelId: string;
  channelName: string;
  duplicateWarning?: string;
  createdAt: number;
}

const pendingEvents = new Map<string, PendingEvent>();

const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, pending] of pendingEvents) {
    if (now - pending.createdAt > PENDING_TTL_MS) {
      pendingEvents.delete(key);
    }
  }
}

export function addPendingEvent(key: string, pending: PendingEvent): void {
  cleanupExpired();
  pendingEvents.set(key, pending);
}

export function buildEventBlocks(
  event: UniversifyEvent,
  pendingKey: string,
  duplicateWarning?: string
) {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const startTimeStr = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTimeStr = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const blocks: any[] = [];

  if (duplicateWarning) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: *Possible Duplicate Detected*\n${duplicateWarning}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: 'New Event Parsed', emoji: true },
  });

  blocks.push({
    type: 'section',
    fields: [
      { type: 'mrkdwn', text: `*Title:*\n${event.title}` },
      { type: 'mrkdwn', text: `*Date:*\n${dateStr}` },
      { type: 'mrkdwn', text: `*Time:*\n${startTimeStr} - ${endTimeStr}` },
      {
        type: 'mrkdwn',
        text: `*Location:*\n${event.location || '_Not specified_'}`,
      },
      {
        type: 'mrkdwn',
        text: `*Categories:*\n${event.categories.join(', ')}`,
      },
      { type: 'mrkdwn', text: `*Organizer:*\n${event.organizer.name}` },
    ],
  });

  if (event.description && event.description !== event.title) {
    const desc =
      event.description.length > 300
        ? event.description.slice(0, 297) + '...'
        : event.description;
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Description:*\n${desc}` },
    });
  }

  blocks.push({ type: 'divider' });

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Approve', emoji: true },
        style: 'primary',
        action_id: 'approve_event',
        value: pendingKey,
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Reject', emoji: true },
        style: 'danger',
        action_id: 'reject_event',
        value: pendingKey,
      },
    ],
  });

  return blocks;
}

export function registerActions(app: App): void {
  app.action('approve_event', async ({ action, ack, respond }) => {
    await ack();
    const key = (action as any).value as string;
    const pending = pendingEvents.get(key);

    if (!pending) {
      await respond({
        replace_original: true,
        text: ':x: This event confirmation has expired. Please re-send the message.',
      });
      return;
    }

    addEvent(pending.event);
    pendingEvents.delete(key);

    console.log(
      `[Actions] Event approved from #${pending.channelName}: "${pending.event.title}"`
    );

    await respond({
      replace_original: true,
      text:
        `:white_check_mark: *Event Approved!*\n` +
        `*${pending.event.title}*\n` +
        `${new Date(pending.event.startTime).toLocaleString('en-US')} | ${pending.event.location || 'No location'}\n` +
        `_Event has been added to the store._`,
    });
  });

  app.action('reject_event', async ({ action, ack, respond }) => {
    await ack();
    const key = (action as any).value as string;
    const pending = pendingEvents.get(key);

    if (!pending) {
      await respond({
        replace_original: true,
        text: ':x: This event confirmation has already expired.',
      });
      return;
    }

    pendingEvents.delete(key);

    console.log(
      `[Actions] Event rejected from #${pending.channelName}: "${pending.event.title}"`
    );

    await respond({
      replace_original: true,
      text:
        `:no_entry_sign: *Event Rejected*\n` +
        `*${pending.event.title}* was discarded.`,
    });
  });

  console.log('[Actions] Approve/reject action handlers registered');
}
