const { createClient } = require("@supabase/supabase-js");
const { isDuplicate, TIME_WINDOW_MS } = require("./dedupe");

/**
 * Insert an approved Discord event into Supabase `events` (same shape as Expo client).
 * Uses the service role key server-side so RLS does not block the insert.
 */

function generateEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function draftToRow(draft, session) {
  const organizerId = process.env.SUPABASE_ORGANIZER_ID;
  const tags = [...(draft.tags || [])];
  if (!tags.includes("discord")) tags.push("discord");
  tags.push(`guild:${session.guild_id}`);

  return {
    id: generateEventId(),
    title: draft.title.trim(),
    description: draft.description || null,
    start_time: draft.start_time,
    end_time: draft.end_time,
    location: draft.location || null,
    categories: draft.categories || [],
    organizer_id: organizerId,
    organizer_name: draft.organizer_name,
    organizer_type: "club",
    color: "#FF6B6B",
    rsvp_enabled: true,
    rsvp_counts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendee_visibility: "public",
    is_club_event: true,
    is_social_event: false,
    capacity: null,
    recurring: null,
    tags,
    image_url: null,
  };
}

function validateDraftForSubmit(draft) {
  const missing = [];
  if (!draft.title || !String(draft.title).trim()) missing.push("title");
  if (!draft.start_time) missing.push("start_time");
  if (!draft.end_time) missing.push("end_time");
  return missing;
}

/**
 * @returns {Promise<{ ok: boolean, skipped?: boolean, eventId?: string, error?: string }>}
 */
async function submitApprovedEvent(session) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizerId = process.env.SUPABASE_ORGANIZER_ID;

  if (!url || !serviceKey) {
    console.warn(
      "[discord-event-bot] Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY); logging payload only."
    );
    console.log(JSON.stringify(session.draft, null, 2));
    return { ok: true, skipped: true };
  }

  if (!organizerId || !String(organizerId).trim()) {
    return {
      ok: false,
      error:
        "Server misconfiguration: SUPABASE_ORGANIZER_ID must be set to a Supabase user UUID for Discord imports.",
    };
  }

  const missing = validateDraftForSubmit(session.draft);
  if (missing.length) {
    return {
      ok: false,
      error: `Cannot submit: missing required fields: ${missing.join(", ")}. Use Edit to fix them.`,
    };
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Cross-source dedupe: skip if an existing event (from the app, Slack, or
  // an earlier Discord submission) within ±2h looks like the same announcement.
  const startMs = Date.parse(session.draft.start_time);
  if (Number.isFinite(startMs)) {
    const windowStart = new Date(startMs - TIME_WINDOW_MS).toISOString();
    const windowEnd = new Date(startMs + TIME_WINDOW_MS).toISOString();
    const { data: nearby, error: queryError } = await supabase
      .from("events")
      .select("id, title, start_time")
      .gte("start_time", windowStart)
      .lte("start_time", windowEnd);

    if (!queryError && Array.isArray(nearby)) {
      const candidates = nearby.map((r) => ({
        id: r.id,
        title: r.title || "",
        startTime: r.start_time,
      }));
      if (isDuplicate({ title: session.draft.title, startTime: session.draft.start_time }, candidates)) {
        return {
          ok: false,
          error: "An event with a very similar title already exists around this time — looks like a duplicate.",
        };
      }
    }
  }

  const row = draftToRow(session.draft, session);

  const { data, error } = await supabase.from("events").insert([row]).select("id").single();

  if (error) {
    console.error("[discord-event-bot] Supabase insert failed:", error);
    return {
      ok: false,
      error: error.message || "Database error while creating the event.",
    };
  }

  console.log(`[discord-event-bot] Event created in Supabase: ${data?.id}`);
  return { ok: true, eventId: data?.id };
}

module.exports = {
  submitApprovedEvent,
};
