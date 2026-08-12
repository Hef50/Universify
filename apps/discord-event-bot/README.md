# Discord Event Review Bot

A Node.js Discord bot that monitors announcement channels for event posts, parses event information, and creates a private review flow for event authors.

## Features

- Monitors a configured announcement channel for new messages
- Parses event details from plain-text announcements
- Creates private review channels for each event
- Interactive approval/edit/rejection system with buttons and modals
- Local storage for review sessions
- America/New_York timezone support

## Setup

1. Clone this repository
2. Install dependencies (this is a pnpm workspace — run from the repo root):
   ```bash
   pnpm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Fill in your Discord bot token and announcement channel ID in `.env`

## Discord Bot Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token to your `.env` file
5. Under "OAuth2" > "URL Generator", select:
   - `bot` scope
   - `Read Messages/View Channels` permission
   - `Send Messages` permission
   - `Use Slash Commands` permission
   - `Manage Channels` permission (to create review channels)
   - `Read Message History` permission
6. Use the generated URL to invite the bot to your server
7. Get the announcement channel ID (right-click channel > Copy ID, requires Developer Mode)
8. Add the channel ID to your `.env` file

## Running the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## How It Works

1. The bot watches the configured announcement channel for new messages
2. When a new message is posted, it attempts to parse event information
3. A private "Event Review" category is created if it doesn't exist
4. A private review channel is created for the event, visible only to the bot and the message author
5. The bot posts a draft of the parsed event with Approve/Edit/Reject buttons
6. The author can approve (submits the event), edit (opens a modal to correct details), or reject (cancels the review)
7. Approved events are logged (stub implementation - no real backend yet)

## Event Parsing

The bot uses natural language processing to extract:
- Event title
- Date/time (in America/New_York timezone)
- Location
- Description
- Other details

If parsing is incomplete, the author can fill in missing information through the edit modal.

## Storage

Review sessions are stored locally in JSON files to persist across bot restarts.