/**
 * Universify Email Bot - Main Entry Point
 *
 * Starts two services:
 *   1. Express REST API on PORT (default 3002) for the Expo client to fetch events
 *   2. IMAP polling loop that checks the inbox every POLL_INTERVAL_MINUTES minutes
 *
 * Usage:
 *   1. Copy .env.example → .env and fill in your Gmail credentials
 *   2. Run: npm run dev
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createRouter } from './routes';
import { startPolling } from './emailClient';

const PORT = parseInt(process.env.PORT || '3002', 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MINUTES || '15', 10);

// ─── Validate env ──────────────────────────────────────────────────────

function validateEnv(): boolean {
  const missing: string[] = [];
  if (!process.env.EMAIL_ADDRESS) missing.push('EMAIL_ADDRESS');
  if (!process.env.EMAIL_APP_PASSWORD) missing.push('EMAIL_APP_PASSWORD');
  if (!process.env.OPENROUTER_API_KEY) missing.push('OPENROUTER_API_KEY');

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  Missing environment variables: ${missing.join(', ')}` +
      '\n   The REST API will start but email imports will fail.' +
      '\n   Copy .env.example → .env and fill in your credentials.\n'
    );
    return false;
  }
  return true;
}

// ─── Start services ────────────────────────────────────────────────────

async function main() {
  const hasCredentials = validateEnv();

  // ── 1. Express REST API ──
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/email', createRouter());

  app.get('/', (_req, res) => {
    res.json({
      service: 'universify-email-bot',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/email/health',
        events: 'GET /api/email/events',
        import: 'POST /api/email/import?days=7',
      },
    });
  });

  app.listen(PORT, () => {
    console.log(`\n📧 Universify Email Bot API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/email/health`);
    console.log(`   Events: http://localhost:${PORT}/api/email/events`);
    console.log(`   Import: POST http://localhost:${PORT}/api/email/import\n`);
  });

  // ── 2. IMAP polling loop ──
  if (hasCredentials) {
    startPolling(POLL_INTERVAL);
  } else {
    console.log(
      '📡 Polling disabled — missing credentials.' +
      '\n   Fill in .env then restart to enable automatic email imports.\n'
    );
  }
}

main().catch((err) => {
  console.error('Fatal error starting email bot:', err);
  process.exit(1);
});
