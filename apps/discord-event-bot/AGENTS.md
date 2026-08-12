# Project: Discord Event Review Bot

Build a Node.js Discord bot for one announcement channel per server.

Requirements:
- Use Node.js
- Use discord.js
- Watch only configured announcement channel(s)
- Read new messages only
- Parse event info from inconsistent plain-text announcements
- Use America/New_York timezone for all time parsing
- If only start time exists, set end time equal to start time
- organizer_name = Discord server name
- organizer_type = "club"
- is_club_event = true
- is_social_event = false
- Missing optional fields can stay blank/null
- No image extraction for now
- No update/delete sync for now

Review flow:
- Bot creates an "Event Review" category if it does not exist
- For each announcement, bot creates a private review channel visible only to:
  - the bot
  - the original announcement author
- Bot posts parsed draft with Approve / Edit / Reject buttons
- Only original announcement author can use those buttons
- Edit should open a modal form
- If parsing fails badly, author should fill missing fields in the edit form

Storage:
- Persist review sessions locally so restarts do not lose state

Backend:
- Approved events are inserted into the shared Supabase `events` table via
  `src/supabaseSubmit.js` (service-role key; see .env.example)
- A cross-source duplicate check (`src/dedupe.js`) runs before insert
- When Supabase env vars are missing, submission falls back to logging the
  normalized payload

Coding expectations:
- Generate complete runnable files, not snippets
- Prefer simple structure over overengineering
- Explain how to run locally
- When changing files, tell me which files were added or modified