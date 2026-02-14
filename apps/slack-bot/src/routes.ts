/**
 * REST API routes for the Slack integration.
 *
 * These endpoints are consumed by the Universify Expo client
 * to fetch channels and import Slack events.
 */

import { Router, Request, Response } from 'express';
import { WebClient } from '@slack/web-api';
import { parseSlackMessage } from './parser';
import { addEvent, getEvents, getEventsByChannel, getEventCount } from './store';

export function createRouter(slackClient: WebClient): Router {
  const router = Router();

  // ─── Health check ─────────────────────────────────────────────────

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'universify-slack-bot',
      eventsInStore: getEventCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── List channels the bot can access ─────────────────────────────

  router.get('/channels', async (_req: Request, res: Response) => {
    try {
      const result = await slackClient.conversations.list({
        types: 'public_channel',
        exclude_archived: true,
        limit: 200,
      });

      const channels = (result.channels || []).map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        topic: ch.topic?.value || '',
        purpose: ch.purpose?.value || '',
        memberCount: ch.num_members || 0,
        isPrivate: ch.is_private || false,
      }));

      res.json({ ok: true, channels });
    } catch (error: any) {
      console.error('Error listing channels:', error.message);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to list channels',
      });
    }
  });

  // ─── Fetch events from a channel ──────────────────────────────────
  // GET /api/slack/events?channel=C12345&limit=50

  router.get('/events', async (req: Request, res: Response) => {
    const channelId = req.query.channel as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);

    // If no channel specified, return all cached events
    if (!channelId) {
      const events = getEvents();
      res.json({ ok: true, events, count: events.length });
      return;
    }

    try {
      // Look up channel name
      let channelName = channelId;
      try {
        const info = await slackClient.conversations.info({ channel: channelId });
        channelName = (info.channel as any)?.name || channelId;
      } catch {
        // Non-critical — we can fall back to the id
      }

      // Fetch message history
      const result = await slackClient.conversations.history({
        channel: channelId,
        limit,
      });

      const messages = result.messages || [];
      const events = [];

      for (const msg of messages) {
        // Skip bot messages, thread replies, and subtypes like channel_join
        if (msg.subtype && msg.subtype !== 'bot_message') continue;

        const event = parseSlackMessage(
          {
            text: msg.text || '',
            ts: msg.ts || '',
            user: msg.user,
            channel: channelId,
            username: (msg as any).username,
          },
          channelName,
          channelId
        );

        if (event) {
          addEvent(event); // Cache in store
          events.push(event);
        }
      }

      res.json({
        ok: true,
        events,
        count: events.length,
        channel: { id: channelId, name: channelName },
      });
    } catch (error: any) {
      console.error(`Error fetching events from channel ${channelId}:`, error.message);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to fetch channel events',
      });
    }
  });

  // ─── Get cached events (from in-memory store) ────────────────────

  router.get('/cached', (req: Request, res: Response) => {
    const channelId = req.query.channel as string | undefined;
    const events = channelId ? getEventsByChannel(channelId) : getEvents();
    res.json({ ok: true, events, count: events.length });
  });

  return router;
}
