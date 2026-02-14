/**
 * Universify Slack Bot - Main Entry Point
 *
 * Starts two services:
 *   1. Express REST API on PORT (default 3001) for the Expo client to fetch events
 *   2. Bolt.js Socket Mode listener for real-time Slack event streaming
 *
 * Usage:
 *   1. Copy .env.example → .env and fill in your Slack credentials
 *   2. Run: pnpm dev
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { App as BoltApp } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { createRouter } from './routes';
import { registerListeners } from './listener';

const PORT = parseInt(process.env.PORT || '3001', 10);
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;

// ─── Validate env ──────────────────────────────────────────────────────

function validateEnv(): boolean {
  const missing: string[] = [];
  if (!SLACK_BOT_TOKEN) missing.push('SLACK_BOT_TOKEN');
  if (!SLACK_SIGNING_SECRET) missing.push('SLACK_SIGNING_SECRET');

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  Missing environment variables: ${missing.join(', ')}` +
      '\n   The REST API will start but Slack API calls will fail.' +
      '\n   Copy .env.example → .env and fill in your Slack credentials.\n'
    );
    return false;
  }
  return true;
}

// ─── Start services ────────────────────────────────────────────────────

async function main() {
  const hasSlackCreds = validateEnv();

  // Create Slack web client (may have empty token in dev)
  const slackClient = new WebClient(SLACK_BOT_TOKEN || '');

  // ── 1. Express REST API ──
  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use('/api/slack', createRouter(slackClient));

  // Root route
  expressApp.get('/', (_req, res) => {
    res.json({
      service: 'universify-slack-bot',
      version: '1.0.0',
      endpoints: {
        health: 'GET /api/slack/health',
        channels: 'GET /api/slack/channels',
        events: 'GET /api/slack/events?channel={id}&limit={n}',
        cached: 'GET /api/slack/cached?channel={id}',
      },
    });
  });

  expressApp.listen(PORT, () => {
    console.log(`\n🚀 Universify Slack Bot API running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/slack/health`);
    console.log(`   Channels:     http://localhost:${PORT}/api/slack/channels`);
    console.log(`   Events:       http://localhost:${PORT}/api/slack/events?channel=CHANNEL_ID\n`);
  });

  // ── 2. Bolt Socket Mode (real-time listener) ──
  if (hasSlackCreds && SLACK_APP_TOKEN) {
    try {
      const boltApp = new BoltApp({
        token: SLACK_BOT_TOKEN,
        signingSecret: SLACK_SIGNING_SECRET,
        socketMode: true,
        appToken: SLACK_APP_TOKEN,
        // Don't start Bolt's built-in HTTP server — we use Express
      });

      registerListeners(boltApp);

      await boltApp.start();
      console.log('⚡ Bolt Socket Mode listener connected to Slack\n');
    } catch (error: any) {
      console.error('Failed to start Bolt listener:', error.message);
      console.log('   The REST API is still running — you can import events manually.\n');
    }
  } else {
    if (!SLACK_APP_TOKEN) {
      console.log(
        '📡 Socket Mode disabled (no SLACK_APP_TOKEN).' +
        '\n   Real-time message listening is off.' +
        '\n   You can still use the REST API to import events from channels.\n'
      );
    }
  }
}

main().catch((err) => {
  console.error('Fatal error starting Slack bot:', err);
  process.exit(1);
});
