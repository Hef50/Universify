# Universify Slack Bot

Ingests event announcements from Slack channels into Universify.

Two services run from one process:

1. **Bolt.js Socket Mode listener** — receives messages in real time from
   every channel the bot is in (or only the monitored ones), parses them into
   structured events, and persists them to the shared Supabase `events` table.
2. **Express REST API** (default port 3001) — lets the Expo client list
   channels and import parsed events on demand
   (`/api/slack/health`, `/channels`, `/events?channel=…`, `/cached`).

## Pipeline

```
Slack message ─► regex parser (dates, time ranges, locations, categories)
             ─► in-memory store (REST API cache)
             ─► duplicate check (title similarity + ±2h window,
                optional LLM tie-break via OpenRouter)
             ─► Supabase `events` insert (service-role key)
```

With `SLACK_REVIEW_CHANNEL` set, events are first posted to that channel
with **Approve / Reject** buttons and only persisted on approval — the
human-in-the-loop equivalent of the Discord bot's review flow.

## Setup

```bash
# From the repo root (pnpm workspace)
pnpm install

cd apps/slack-bot
cp .env.example .env   # fill in Slack + Supabase credentials
pnpm dev
```

See `.env.example` for every variable and what it enables. Degradation is
graceful: without `SLACK_APP_TOKEN` only the REST API runs; without Supabase
credentials events stay in memory; without `OPENROUTER_API_KEY` dedupe is
heuristic-only.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm start` | Run via ts-node |
| `pnpm typecheck` | TypeScript check |
| `pnpm build` && `pnpm serve` | Compile to `dist/` and run compiled JS |
