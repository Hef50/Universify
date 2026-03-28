/**
 * REST API routes for the email bot.
 *
 * These endpoints are consumed by the Universify Expo client
 * to check bot status and import email events.
 */

import { Router, Request, Response } from 'express';
import { importEmailEvents } from './emailClient';
import { getEvents, getEventCount } from './store';

export function createRouter(): Router {
  const router = Router();

  // ─── Health check ──────────────────────────────────────────────────
  // GET /api/email/health

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'universify-email-bot',
      eventsInStore: getEventCount(),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Get all cached events ─────────────────────────────────────────
  // GET /api/email/events

  router.get('/events', (_req: Request, res: Response) => {
    const events = getEvents();
    res.json({ ok: true, events, count: events.length });
  });

  // ─── Trigger a manual import ───────────────────────────────────────
  // POST /api/email/import?days=7
  //
  // Fetches emails from the inbox for the last `days` days (default 7),
  // parses them with the LLM parser, and adds new events to the store.

  router.post('/import', async (req: Request, res: Response) => {
    const days = Math.min(parseInt(req.query.days as string, 10) || 7, 30);

    try {
      const newCount = await importEmailEvents(days);
      const total = getEventCount();
      res.json({
        ok: true,
        newEvents: newCount,
        totalEvents: total,
        message: `Imported ${newCount} new event(s) from the last ${days} day(s). ${total} total in store.`,
      });
    } catch (error: any) {
      console.error('[Routes] Import failed:', error.message);
      res.status(500).json({
        ok: false,
        error: error.message || 'Failed to import email events',
      });
    }
  });

  return router;
}
