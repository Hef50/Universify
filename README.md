# Universify

**A multi-platform event discovery and recommendation system for university students, built for CMU.**

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react)
![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)
![Discord.js](https://img.shields.io/badge/Discord.js-14-5865F2?logo=discord)
![Slack Bolt](https://img.shields.io/badge/Slack_Bolt-4.1-4A154B?logo=slack)
![pnpm](https://img.shields.io/badge/pnpm-monorepo-F69220?logo=pnpm)

---

## Overview

University students miss events they'd actually enjoy because announcements are scattered across dozens of Slack channels, Discord servers, email lists, and Instagram stories. Universify solves this by aggregating events from multiple platforms into a single, searchable calendar with personalized recommendations.

The system ingests event announcements from Slack workspaces and Discord servers, uses NLP-based parsing to extract structured data (title, date/time, location, categories), deduplicates entries, and stores everything in a shared Postgres database. A cross-platform mobile and web client lets students browse, filter, search, and RSVP to events — with a recommendation engine that learns which events they're likely to attend based on category affinity, time-of-day preferences, and popularity signals.

Universify is developed under the **ScottyLabs** organization as part of the **Labrador** team at Carnegie Mellon University. Authentication is scoped to `@andrew.cmu.edu` and `@cmu.edu` email domains via Google OAuth.

## Key Features

- **Multi-source event ingestion** — Slack bot (real-time Socket Mode + REST API) and Discord bot (announcement channel monitoring) independently parse and submit events to a shared Supabase database.
- **NLP-based message parsing** — Custom regex + chrono-node parsers extract dates, times, locations, and categories from free-text announcements with confidence scoring and missing-field detection.
- **Human-in-the-loop review (Discord)** — Parsed events surface as interactive embeds with Approve / Edit / Reject buttons; authors can correct fields via a Discord modal before events go live.
- **Personalized recommendation engine** — Analyzes user behavior to build interest profiles from category affinity, n-gram title matching (1–3 grams), RSVP popularity weighting (`log1p(going) + 1`), and time-of-day buckets.
- **Google Calendar sync** — Bidirectional: reads personal calendar events into the app and writes Universify events back to Google Calendar via the Calendar API with OAuth scopes.
- **Cross-platform client** — React Native (Expo) app with web support via `react-native-web`, responsive layout with desktop navigation, and haptic feedback on native.
- **Week-view calendar with overlap layout** — Google Calendar-style column algorithm that detects simultaneous events and renders them side-by-side with calculated widths.
- **Advanced filtering and search** — Multi-axis filtering by category, event type, time-of-day, date range, location, and availability. Three search modes: name-only, full-text, and weighted semantic scoring.
- **RSVP and attendance tracking** — Per-event going/maybe/not-going counts with capacity tracking and availability filtering.
- **Event scheduling** — Users pin events to weekly calendars; state syncs to Supabase when authenticated or falls back to local storage.
- **CMU-only authentication** — Google OAuth via Supabase Auth with email domain enforcement (`@andrew.cmu.edu`, `@cmu.edu`), automatic user profile creation via database trigger, and session caching.
- **Dark mode and accessibility** — System/light/dark themes, configurable font sizes, high-contrast mode, and reduced-motion support.

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81 | Cross-platform UI framework |
| Expo | 54 | Build toolchain, routing, native APIs |
| Expo Router | 6 | File-based routing with typed routes |
| React Navigation | 7 | Tab and stack navigation |
| React Native Reanimated | 4.1 | Gesture-driven animations |
| TypeScript | 5.9 | Type safety across the client |

### Backend / Bots
| Technology | Version | Purpose |
|---|---|---|
| Slack Bolt.js | 4.1 | Real-time Slack event streaming (Socket Mode) |
| Slack Web API | 7.8 | Channel history and user info lookups |
| Express | 4.21 | REST API serving parsed events to the client |
| Discord.js | 14 | Discord gateway, message parsing, interactive embeds |
| chrono-node | 2.7 | Natural language date/time extraction (Discord bot) |
| Luxon | 3.7 | Timezone-aware date formatting (Discord bot) |
| better-sqlite3 | 12.8 | Local review session persistence (Discord bot) |

### Data / Auth
| Technology | Purpose |
|---|---|
| Supabase (Postgres) | Events, user profiles, scheduled events; Row Level Security |
| Supabase Auth | Google OAuth with `@cmu.edu` domain enforcement |
| AsyncStorage | Offline-capable local storage on native platforms |

### DevOps / Testing
| Technology | Purpose |
|---|---|
| pnpm Workspaces | Monorepo dependency management |
| Playwright | End-to-end browser testing |
| ESLint | Code linting (Expo config) |
| Vercel | Web deployment target (`vercel.json` configured) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                 │
│                                                                     │
│   Slack Workspace          Discord Servers          Google Calendar  │
│   (announcement channels)  (announcement channels)  (personal)      │
└────────┬──────────────────────────┬──────────────────────┬──────────┘
         │                          │                      │
         ▼                          ▼                      │
┌────────────────┐     ┌─────────────────────┐             │
│   Slack Bot    │     │   Discord Bot       │             │
│                │     │                     │             │
│ • Socket Mode  │     │ • Gateway listener  │             │
│   listener     │     │ • chrono-node NLP   │             │
│ • Regex parser │     │ • Confidence scorer │             │
│ • Express API  │     │ • Review UI (embeds │             │
│ • In-memory    │     │   + modals)         │             │
│   event store  │     │ • SQLite sessions   │             │
└───────┬────────┘     └──────────┬──────────┘             │
        │                         │                        │
        │    ┌────────────────────┘                        │
        │    │  (approved events only)                     │
        ▼    ▼                                             │
┌──────────────────────────────────────┐                   │
│         Supabase (Postgres)          │                   │
│                                      │                   │
│  events           user_profiles      │                   │
│  ├─ id (PK)       ├─ id (FK→auth)   │                   │
│  ├─ title         ├─ email           │                   │
│  ├─ start_time    ├─ name            │                   │
│  ├─ end_time      ├─ university      │                   │
│  ├─ location      └─ preferences{}   │                   │
│  ├─ categories[]                     │                   │
│  ├─ rsvp_counts{} user_scheduled_    │                   │
│  ├─ organizer_id  events             │                   │
│  └─ tags[]        ├─ user_id (FK)    │                   │
│                   ├─ event_id (FK)   │                   │
│  RLS: public read └─ week_key        │                   │
│  auth'd write, owner update/delete   │                   │
└──────────────────┬───────────────────┘                   │
                   │                                       │
                   ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Expo Client (Web + Native)                    │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Home    │  │ Calendar │  │  Find    │  │ Recommendations│  │
│  │  (feed)  │  │ (week    │  │ (search  │  │ (interest      │  │
│  │          │  │  view)   │  │  +filter)│  │  engine)       │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
│                                                                  │
│  Auth (Google OAuth) ──► Google Calendar API (read/write)        │
│  Supabase client     ──► Events CRUD, user profiles, scheduling  │
│  Slack client lib    ──► Slack bot REST API (channel import)      │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion** — Bots listen for new messages in announcement channels. The Slack bot receives events via Bolt.js Socket Mode; the Discord bot monitors `GuildAnnouncement` channels and text channels matching `*announcements*`.
2. **Parsing** — Raw message text passes through platform-specific parsers. The Slack parser uses hand-written regex for dates (`MM/DD/YYYY`, `Month Day, Year`), time ranges (`3-5pm`, `3:00 PM - 5:00 PM`), and location labels (`Location:`, `at`). The Discord parser uses chrono-node for flexible NLP date extraction, with Luxon for timezone handling, plus regex for room codes (`WEH 5302`) and labeled fields.
3. **Review (Discord only)** — Parsed drafts are posted as rich embeds in a dedicated `#event-approval` channel with confidence scoring. Missing or low-confidence fields are flagged. Authors approve, edit via Discord modal, or reject.
4. **Storage** — Approved events are inserted into the shared Supabase `events` table. The Slack bot also maintains an in-memory store for its REST API. Both bots tag events with their source (`slack-`, `discord`) for traceability.
5. **Serving** — The Expo client fetches events from Supabase on load, with a static JSON fallback for offline/demo use. Google Calendar events are fetched separately via the Calendar API and merged client-side (prefixed `gcal-`).
6. **Recommendations** — The `useRecommendations` hook analyzes the event corpus to build interest profiles: it tokenizes titles into 1–3 grams, counts category frequencies, and weights by RSVP popularity. Suggestions for a given time range combine interest matching with temporal overlap and event-duration fit scoring.

## Project Structure

```
universify/
├── apps/
│   ├── client/                   # Expo React Native app (web + native)
│   │   ├── app/                  # File-based routes (Expo Router)
│   │   │   ├── (auth)/           # Login, signup, OAuth callback screens
│   │   │   ├── (tabs)/           # Main tab screens: home, calendar, find, create, profile
│   │   │   └── settings/         # Account, appearance, preferences screens
│   │   ├── components/           # 32 React components
│   │   │   ├── calendar/         # WeekView, CalendarHeader, EventDisplayCard, TimeColumn
│   │   │   ├── events/           # EventCard, EventDetailSidebar, CreateEventForm
│   │   │   ├── layout/           # DesktopNav, Header, FilterDrawer, ResponsiveLayout
│   │   │   ├── recommendations/  # RecommendationCard, RecommendationRail, RecommendationsList
│   │   │   └── ui/               # Button, Input, Modal, SearchBar, CategoryPill, DateTimePicker
│   │   ├── contexts/             # 7 React contexts (Auth, Events, GoogleCalendar, Slack, etc.)
│   │   ├── hooks/                # 11 custom hooks (useRecommendations, useCalendar, useAuth, etc.)
│   │   ├── lib/                  # API clients: Supabase, Slack REST, Google Calendar, storage
│   │   ├── types/                # TypeScript type definitions (Event, User, Settings)
│   │   ├── utils/                # Event filtering/sorting, date math, calendar layout algorithm
│   │   ├── data/                 # Static JSON: allEvents, categories, mock data
│   │   ├── e2e/                  # Playwright end-to-end tests
│   │   └── scripts/              # Seed data, health checks, backend testing
│   │
│   ├── slack-bot/                # Slack integration service (TypeScript)
│   │   └── src/
│   │       ├── index.ts          # Entry: Express server + Bolt.js Socket Mode
│   │       ├── listener.ts       # Real-time message handler
│   │       ├── parser.ts         # Regex-based event extraction (date, time, location, categories)
│   │       ├── routes.ts         # REST API: /health, /channels, /events, /cached
│   │       └── store.ts          # In-memory event store with channel-based querying
│   │
│   └── discord-event-bot/        # Discord integration service (JavaScript)
│       └── src/
│           ├── bot.js            # Gateway client, review UI (embeds + modals), SQLite sessions
│           ├── parser.js         # chrono-node date extraction, labeled field parsing
│           ├── storage.js        # JSON file-based review persistence (legacy)
│           └── supabaseSubmit.js # Approved event → Supabase insert with RLS bypass
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql  # events, user_profiles, user_scheduled_events tables + RLS + indexes
│       └── 002_handle_new_user.sql # Trigger: auto-create profile on auth.users insert
│
├── pnpm-workspace.yaml           # Monorepo workspace config
└── package.json                  # Root scripts: dev, build, lint
```

**By the numbers:** ~15,200 lines of TypeScript/JavaScript across 90+ source files, 122 lines of SQL schema, 32 React components, 11 custom hooks, 7 context providers, and 2 Playwright test suites.

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10 (`npm install -g pnpm`)
- A **Supabase** project ([supabase.com](https://supabase.com))
- (Optional) Slack app credentials for the Slack bot
- (Optional) Discord bot token for the Discord bot

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/universify.git
cd universify
pnpm install
```

### 2. Database Setup

Run the SQL migrations in your Supabase project's SQL Editor:

```bash
# In order:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_handle_new_user.sql
```

Enable **Google OAuth** in Supabase Auth settings (Dashboard → Authentication → Providers → Google). Configure the allowed redirect URL to include your app's callback route.

### 3. Environment Variables

**Client** (`apps/client/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
# Optional: for seed script
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Slack Bot** (`apps/slack-bot/.env`):
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_APP_TOKEN=xapp-your-app-token
PORT=3001
# Optional: LLM-powered duplicate detection
OPENROUTER_API_KEY=your_openrouter_key
```

**Discord Bot** (`apps/discord-event-bot/.env`):
```env
DISCORD_TOKEN=your_discord_bot_token
TIMEZONE=America/New_York
REVIEW_CATEGORY_NAME=Event Review
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ORGANIZER_ID=uuid_of_bot_user
```

### 4. Run

```bash
# Start the Expo client (web)
pnpm dev

# Start the Slack bot (separate terminal)
cd apps/slack-bot && pnpm dev

# Start the Discord bot (separate terminal)
pnpm dev:discord
```

### 5. Seed Data (Optional)

```bash
cd apps/client && pnpm seed
```

## API Integrations

| Service | Role in Universify |
|---|---|
| **Supabase (Postgres + Auth)** | Primary database for events, user profiles, and scheduled events. Handles authentication via Google OAuth with RLS policies enforcing ownership. Auto-provisions user profiles via a database trigger on signup. |
| **Slack (Bolt.js + Web API)** | The Slack bot connects via Socket Mode for real-time message streaming and exposes a REST API (`/api/slack/events`, `/channels`, `/cached`) that the Expo client calls to import events from specific channels. |
| **Discord (Discord.js)** | Monitors announcement channels in Discord servers, parses messages into event drafts, and surfaces them for human review via interactive embeds. Approved events are inserted directly into Supabase. |
| **Google Calendar API** | Reads the user's personal calendar events (next 4 weeks) and converts them to the Universify event format for unified display. Also supports writing Universify events back to Google Calendar. |
| **OpenRouter** | API key is configured for LLM-powered duplicate detection in the Slack bot pipeline. (Integration is in early stages.) |

## Notable Engineering Decisions

### Event Parsing: Two Strategies for Two Platforms

The Slack and Discord bots independently solve the same problem — extracting structured event data from free-text messages — but take different approaches. The Slack parser uses hand-written regex chains: first it tries `MM/DD/YYYY` patterns, then falls back to named months (`"December 5th"`), then extracts time ranges with meridian inference (if a message says "3-5pm", the parser correctly infers 3 PM, not 3 AM). The Discord parser delegates date/time extraction to chrono-node for broader NLP coverage, but adds a custom layer for CMU-specific patterns like room codes (`WEH 5302`, `GHC 4307`) and labeled fields (`Location:`, `Scheduled for:`). Both parsers infer event categories from keyword matching against the message body (e.g., "pizza" → Food, "hackathon" → Tech).

The Discord bot introduces a confidence scoring system (`high` / `medium` / `low`) based on which fields were successfully parsed, and tracks missing fields explicitly. This drives the review UI: low-confidence events prompt the author to click Edit, while high-confidence events can be approved with one click. Review sessions are persisted in a local SQLite database so they survive bot restarts.

### Recommendation Engine: N-gram Interest Profiles

Rather than requiring users to manually select interests, the recommendation engine builds implicit interest profiles by analyzing the events corpus. It tokenizes event titles into 1-grams, 2-grams, and 3-grams (after stopword filtering), then scores each gram by frequency weighted by event popularity (`log1p(going_count) + 1`). Categories and time-of-day buckets are scored separately and merged into a top-10 composite profile. When suggesting events for a time range, candidates are scored by interest match, popularity boost, and temporal fit (events that fit within the requested window score higher). This approach means recommendations improve as more events enter the system, without any cold-start configuration.

### Cross-Platform Storage and Auth Strategy

The client handles three storage tiers: Supabase for authenticated persistent state, `AsyncStorage` for native offline caching, and `localStorage` for web. The `storage.ts` abstraction detects the platform at runtime and routes accordingly. For event scheduling (pinning events to weekly calendars), the system first tries the Supabase `user_scheduled_events` table if the user is authenticated, then falls back to local storage — ensuring the app remains functional without network access. Authentication uses Supabase's Google OAuth flow with a strict domain check: the `GoogleAuthContext` validates that the signed-in email ends with `@andrew.cmu.edu` or `@cmu.edu` and automatically signs out non-CMU users.

## Status

Universify is under active development as a ScottyLabs Labrador project.

**Working:**
- Expo client with full tab navigation (Home, Calendar, Find, Create, Profile)
- Supabase-backed event CRUD with Row Level Security
- Google OAuth with CMU domain enforcement
- Google Calendar bidirectional sync
- Slack bot with real-time Socket Mode and REST API
- Discord bot with announcement parsing, review workflow, and Supabase submission
- Recommendation engine with interest profiling and time-range suggestions
- Week-view calendar with overlap-aware column layout
- Multi-axis event filtering and search (3 modes)
- Playwright E2E test suite
- Responsive web layout with desktop navigation

**In progress:**
- LLM-powered duplicate detection via OpenRouter
- Push notification delivery for event reminders
- Instagram event scraping pipeline

## Contributors

**Developers:** Haresh Muralidharan, Sam Mathew, Tiffany Ahn, Allan Fang
**Project Manager:** Geethika Gupta
**Designers:** Russell Sang, Camille Bove

Built at [Carnegie Mellon University](https://www.cmu.edu) under [ScottyLabs](https://scottylabs.org).