require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  Client,
  GatewayIntentBits,
  Events,
  ChannelType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const Database = require("better-sqlite3");
const chrono = require("chrono-node");
const { DateTime } = require("luxon");

const { submitApprovedEvent } = require("./supabaseSubmit");

/* =========================
   CONFIG
========================= */

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TIMEZONE = process.env.TIMEZONE || "America/New_York";
const REVIEW_CATEGORY_NAME = process.env.REVIEW_CATEGORY_NAME || "Event Review";
const APPROVAL_CHANNEL_NAME = process.env.APPROVAL_CHANNEL_NAME || "event-approval";

if (!DISCORD_TOKEN) {
  throw new Error("Missing DISCORD_TOKEN in .env");
}

/* =========================
   DATA / DB
========================= */

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "bot.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS review_sessions (
    id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    source_message_id TEXT NOT NULL,
    review_channel_id TEXT,
    review_message_id TEXT,
    status TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const saveSessionStmt = db.prepare(`
  INSERT INTO review_sessions (
    id, guild_id, author_id, source_message_id,
    review_channel_id, review_message_id,
    status, draft_json, created_at, updated_at
  )
  VALUES (
    @id, @guild_id, @author_id, @source_message_id,
    @review_channel_id, @review_message_id,
    @status, @draft_json, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    guild_id = excluded.guild_id,
    author_id = excluded.author_id,
    source_message_id = excluded.source_message_id,
    review_channel_id = excluded.review_channel_id,
    review_message_id = excluded.review_message_id,
    status = excluded.status,
    draft_json = excluded.draft_json,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at
`);

const getSessionStmt = db.prepare(`
  SELECT * FROM review_sessions WHERE id = ?
`);

function nowIso() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomUUID();
}

function rowToSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    guild_id: row.guild_id,
    author_id: row.author_id,
    source_message_id: row.source_message_id,
    review_channel_id: row.review_channel_id,
    review_message_id: row.review_message_id,
    status: row.status,
    draft: JSON.parse(row.draft_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getSession(sessionId) {
  return rowToSession(getSessionStmt.get(sessionId));
}

function saveSession(session) {
  saveSessionStmt.run({
    id: session.id,
    guild_id: session.guild_id,
    author_id: session.author_id,
    source_message_id: session.source_message_id,
    review_channel_id: session.review_channel_id,
    review_message_id: session.review_message_id,
    status: session.status,
    draft_json: JSON.stringify(session.draft),
    created_at: session.created_at,
    updated_at: session.updated_at,
  });
}

/* =========================
   UTILS
========================= */

function oneLine(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeNullable(value) {
  const trimmed = (value || "").trim();
  return trimmed.length ? trimmed : null;
}

function truncate(value, max) {
  if (!value) return "";
  if (value.length <= max) return value;
  return value.slice(0, max - 3) + "...";
}

function slugify(value) {
  const base = (value || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "user";
}

function formatDisplayDate(isoString) {
  if (!isoString) return "—";
  const dt = DateTime.fromISO(isoString).setZone(TIMEZONE);
  if (!dt.isValid) return "—";
  return dt.toFormat("ccc, LLL d, yyyy h:mm a");
}

function isoForModal(isoString) {
  if (!isoString) return "";
  const dt = DateTime.fromISO(isoString).setZone(TIMEZONE);
  if (!dt.isValid) return "";
  return dt.toFormat("yyyy-MM-dd HH:mm");
}

function cleanTitle(value) {
  if (!value) return null;
  let out = value.trim();
  out = out.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "");
  out = out.replace(/\s+/g, " ").trim();
  out = out.replace(/[.,:;!\-–—]+$/g, "").trim();
  return out || null;
}

function isAnnouncementLikeChannel(channel) {
  if (!channel || !channel.isTextBased?.()) return false;

  const name = (channel.name || "").toLowerCase().trim();

  if (channel.type === ChannelType.GuildAnnouncement) {
    return true;
  }

  return /(^|-)announcements?(-|$)/.test(name);
}

function extractLabeledValue(text, label) {
  const lines = (text || "").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();

    if (current.toLowerCase() === label.toLowerCase()) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next) return next;
      }
    }

    const colonRegex = new RegExp(`^${label}\\s*:\\s*(.+)$`, "i");
    const spaceRegex = new RegExp(`^${label}\\s+(.+)$`, "i");

    const colonMatch = current.match(colonRegex);
    if (colonMatch) return colonMatch[1].trim();

    const spaceMatch = current.match(spaceRegex);
    if (spaceMatch && current.toLowerCase() !== label.toLowerCase()) {
      return spaceMatch[1].trim();
    }
  }

  return null;
}

function parseDurationToMinutes(raw) {
  if (!raw) return null;

  let total = 0;
  let found = false;
  const regex = /(\d+)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m)\b/gi;

  for (const match of raw.matchAll(regex)) {
    found = true;
    const num = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith("h")) total += num * 60;
    else total += num;
  }

  if (found) return total;

  if (/^\d+$/.test(raw.trim())) {
    return Number(raw.trim());
  }

  return null;
}

function parsedComponentsToDateTime(components, refDateTime) {
  if (!components) return null;
  if (!components.isCertain("hour")) return null;

  const year = components.get("year") ?? refDateTime.year;
  const month = components.get("month") ?? refDateTime.month;
  const day = components.get("day") ?? refDateTime.day;
  const hour = components.get("hour");
  const minute = components.get("minute") ?? 0;

  const dt = DateTime.fromObject(
    {
      year,
      month,
      day,
      hour,
      minute,
      second: 0,
      millisecond: 0,
    },
    { zone: TIMEZONE }
  );

  return dt.isValid ? dt : null;
}

function chooseChronoResult(text, refDateTime) {
  const results = chrono.parse(text, refDateTime.toJSDate(), {
    forwardDate: true,
  });

  for (const result of results) {
    if (result?.start?.isCertain("hour")) {
      return result;
    }
  }

  return null;
}

function parseFlexibleDateTime(raw, refDateTime) {
  if (!raw) return { dt: null, error: null };

  const cleaned = oneLine(raw);

  const formats = [
    "yyyy-MM-dd HH:mm",
    "yyyy-MM-dd H:mm",
    "yyyy-MM-dd h:mm a",
    "yyyy-MM-dd ha",
    "LLLL d, yyyy h:mm a",
    "LLL d, yyyy h:mm a",
    "cccc, LLLL d, yyyy h:mm a",
    "cccc, LLL d, yyyy h:mm a",
    "ccc, LLL d, yyyy h:mm a",
    "MMMM d, yyyy h:mm a",
    "MMM d, yyyy h:mm a",
  ];

  for (const fmt of formats) {
    const dt = DateTime.fromFormat(cleaned, fmt, { zone: TIMEZONE });
    if (dt.isValid) return { dt, error: null };
  }

  const noYearFormats = [
    "LLLL d h:mm a",
    "LLL d h:mm a",
    "cccc, LLLL d h:mm a",
    "cccc, LLL d h:mm a",
    "ccc, LLL d h:mm a",
    "MMMM d h:mm a",
    "MMM d h:mm a",
  ];

  for (const fmt of noYearFormats) {
    let dt = DateTime.fromFormat(cleaned, fmt, { zone: TIMEZONE });
    if (dt.isValid) {
      dt = dt.set({ year: refDateTime.year });
      return { dt, error: null };
    }
  }

  const chronoResult = chooseChronoResult(cleaned, refDateTime);
  if (chronoResult) {
    const dt = parsedComponentsToDateTime(chronoResult.start, refDateTime);
    if (dt) return { dt, error: null };
  }

  return {
    dt: null,
    error:
      `Could not parse "${cleaned}". ` +
      `Use "YYYY-MM-DD HH:mm" or "March 13, 2026 5:00 PM".`,
  };
}

function parseTitle(text) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((line) => oneLine(line))
    .filter(Boolean);

  const eventRegexes = [
    /\bcome to\s+(.+?)(?=\s+(?:next|this|tomorrow|today|on|from|at)\b|[.!?\n]|$)/i,
    /\bjoin us for\s+(.+?)(?=\s+(?:next|this|tomorrow|today|on|from|at)\b|[.!?\n]|$)/i,
    /\bjoin\s+(.+?)(?=\s+(?:next|this|tomorrow|today|on|from|at)\b|[.!?\n]|$)/i,
  ];

  for (const regex of eventRegexes) {
    const match = text.match(regex);
    if (match?.[1]) {
      return cleanTitle(match[1]);
    }
  }

  const contentLines = lines.filter(
    (line) => !/^(location|scheduled for|duration)\b/i.test(line)
  );

  if (contentLines.length > 0) {
    if (contentLines[0].endsWith("?") && contentLines[1]) {
      return cleanTitle(contentLines[1]);
    }
    return cleanTitle(contentLines[0]);
  }

  const firstSentence = oneLine((text || "").split(/[.!?\n]/)[0] || "");
  return cleanTitle(firstSentence.slice(0, 100));
}

function parseLocation(text) {
  const explicit = extractLabeledValue(text, "Location");
  if (explicit) return explicit;

  const roomMatch = text.match(/\b([A-Z]{2,6}\s?-?\d{3,5}[A-Z]?)\b/);
  if (roomMatch?.[1]) {
    return roomMatch[1].replace(/\s+/g, " ").trim();
  }

  const atMatch = text.match(
    /\bat\s+([^\n,.!?]+?)(?=\s+(?:to|for|from|on|next|this|tomorrow|today|with|learn)\b|[.!?,]|$)/i
  );
  if (atMatch?.[1]) {
    return oneLine(atMatch[1]);
  }

  return null;
}

function parseDateTimes(text, messageCreatedAt) {
  const refDateTime = DateTime.fromJSDate(messageCreatedAt).setZone(TIMEZONE);
  const explicitStartRaw = extractLabeledValue(text, "Scheduled for");
  const durationRaw = extractLabeledValue(text, "Duration");

  let start = null;
  let end = null;

  if (explicitStartRaw) {
    const parsed = parseFlexibleDateTime(explicitStartRaw, refDateTime);
    if (parsed.dt) {
      start = parsed.dt;
    }
  }

  if (!start) {
    const chronoResult = chooseChronoResult(text, refDateTime);
    if (chronoResult) {
      start = parsedComponentsToDateTime(chronoResult.start, refDateTime);
      if (chronoResult.end) {
        end = parsedComponentsToDateTime(chronoResult.end, refDateTime);
      }
    }
  }

  if (start && !end && durationRaw) {
    const durationMinutes = parseDurationToMinutes(durationRaw);
    if (durationMinutes && durationMinutes > 0) {
      end = start.plus({ minutes: durationMinutes });
    }
  }

  if (start && !end) {
    end = start;
  }

  return {
    start_time: start ? start.toISO() : null,
    end_time: end ? end.toISO() : null,
  };
}

function computeDraftMeta(draft) {
  const missing = [];

  if (!draft.title) missing.push("title");
  if (!draft.start_time) missing.push("start_time");
  if (!draft.end_time) missing.push("end_time");

  let parse_confidence = "high";
  if (!draft.title || !draft.start_time) {
    parse_confidence = "low";
  } else if (!draft.location) {
    parse_confidence = "medium";
  }

  draft.missing_fields = missing;
  draft.parse_confidence = parse_confidence;
  return draft;
}

function parseEventFromMessage(message) {
  const text = message.content || "";

  const draft = {
    title: parseTitle(text),
    description: text || null,
    start_time: null,
    end_time: null,
    location: parseLocation(text),
    categories: [],
    organizer_name: message.guild.name,
    organizer_type: "club",
    is_club_event: true,
    is_social_event: false,
    tags: [],
    image_url: null,

    source_message_id: message.id,
    source_channel_id: message.channelId,
    source_guild_id: message.guild.id,
    source_author_id: message.author.id,
    source_message_url: message.url,
    source_message_created_at: message.createdAt.toISOString(),

    parse_confidence: "low",
    missing_fields: [],
  };

  const dateTimes = parseDateTimes(text, message.createdAt);
  draft.start_time = dateTimes.start_time;
  draft.end_time = dateTimes.end_time;

  return computeDraftMeta(draft);
}

/* =========================
   DISCORD REVIEW UI
========================= */

function statusColor(status) {
  switch (status) {
    case "approved":
      return 0x57f287;
    case "rejected":
      return 0xed4245;
    default:
      return 0x5865f2;
  }
}

function buildReviewEmbed(session) {
  const draft = session.draft;

  return new EmbedBuilder()
    .setTitle(`Event Review — ${session.status.toUpperCase()}`)
    .setColor(statusColor(session.status))
    .setDescription(truncate(draft.description || "—", 3500))
    .addFields(
      {
        name: "Source Message",
        value: `[Open original message](${draft.source_message_url})`,
        inline: false,
      },
      {
        name: "Title",
        value: draft.title || "—",
        inline: false,
      },
      {
        name: "Start Time",
        value: formatDisplayDate(draft.start_time),
        inline: true,
      },
      {
        name: "End Time",
        value: formatDisplayDate(draft.end_time),
        inline: true,
      },
      {
        name: "Location",
        value: draft.location || "—",
        inline: true,
      },
      {
        name: "Organizer",
        value: draft.organizer_name || "—",
        inline: true,
      },
      {
        name: "Confidence",
        value: draft.parse_confidence || "low",
        inline: true,
      },
      {
        name: "Missing Fields",
        value:
          draft.missing_fields && draft.missing_fields.length
            ? draft.missing_fields.join(", ")
            : "none",
        inline: true,
      }
    )
    .setFooter({ text: `Session ${session.id.slice(0, 8)}` })
    .setTimestamp(new Date(session.updated_at));
}

function buildReviewComponents(session) {
  const disabled = session.status !== "pending";

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve:${session.id}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`edit:${session.id}`)
      .setLabel("Edit")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`reject:${session.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );

  return [row];
}

function buildEditModal(session) {
  const draft = session.draft;

  const modal = new ModalBuilder()
    .setCustomId(`editmodal:${session.id}`)
    .setTitle("Edit Event Draft");

  const titleInput = new TextInputBuilder()
    .setCustomId("title_input")
    .setLabel("Title")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(truncate(draft.title || "", 100))
    .setPlaceholder("KPDC open class");

  const startInput = new TextInputBuilder()
    .setCustomId("start_input")
    .setLabel("Start Time")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(isoForModal(draft.start_time))
    .setPlaceholder("2026-03-13 17:00");

  const endInput = new TextInputBuilder()
    .setCustomId("end_input")
    .setLabel("End Time")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(isoForModal(draft.end_time))
    .setPlaceholder("2026-03-13 18:00");

  const locationInput = new TextInputBuilder()
    .setCustomId("location_input")
    .setLabel("Location")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setValue(truncate(draft.location || "", 100))
    .setPlaceholder("WEH 5302");

  const descriptionInput = new TextInputBuilder()
    .setCustomId("description_input")
    .setLabel("Description")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setValue(truncate(draft.description || "", 4000))
    .setPlaceholder("Original event description");

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(startInput),
    new ActionRowBuilder().addComponents(endInput),
    new ActionRowBuilder().addComponents(locationInput),
    new ActionRowBuilder().addComponents(descriptionInput)
  );

  return modal;
}

async function ensureReviewCategory(guild) {
  let category = guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildCategory && ch.name === REVIEW_CATEGORY_NAME
  );

  if (!category) {
    category = await guild.channels.create({
      name: REVIEW_CATEGORY_NAME,
      type: ChannelType.GuildCategory,
    });
  }

  return category;
}

async function ensureApprovalChannel(guild, category) {
  const normalizedTarget = slugify(APPROVAL_CHANNEL_NAME);

  let channel = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildText &&
      slugify(ch.name) === normalizedTarget
  );

  if (!channel) {
    channel = await guild.channels.create({
      name: normalizedTarget,
      type: ChannelType.GuildText,
      parent: category.id,
    });
  } else if (channel.parentId !== category.id) {
    await channel.setParent(category.id);
  }

  return channel;
}

async function refreshReviewMessage(client, session) {
  if (!session.review_channel_id || !session.review_message_id) return;

  const channel = await client.channels.fetch(session.review_channel_id).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const message = await channel.messages.fetch(session.review_message_id).catch(() => null);
  if (!message) return;

  await message.edit({
    embeds: [buildReviewEmbed(session)],
    components: buildReviewComponents(session),
  });
}

/* =========================
   DISCORD CLIENT
========================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(
    "Watching channels that are official announcement channels or named like 'announcement' / 'announcements'."
  );
  console.log(`Sending all review posts to shared channel: ${APPROVAL_CHANNEL_NAME}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.inGuild()) return;
    if (message.author.bot) return;
    if (!isAnnouncementLikeChannel(message.channel)) return;

    const draft = parseEventFromMessage(message);

    const session = {
      id: generateId(),
      guild_id: message.guild.id,
      author_id: message.author.id,
      source_message_id: message.id,
      review_channel_id: null,
      review_message_id: null,
      status: "pending",
      draft,
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    saveSession(session);

    const category = await ensureReviewCategory(message.guild);
    const approvalChannel = await ensureApprovalChannel(message.guild, category);

    session.review_channel_id = approvalChannel.id;
    session.updated_at = nowIso();
    saveSession(session);

    const needsMoreInfo =
      session.draft.parse_confidence === "low" ||
      (session.draft.missing_fields && session.draft.missing_fields.length > 0);

    const intro = needsMoreInfo
      ? `<@${message.author.id}> I parsed your announcement into an event draft. Some fields are missing or weakly parsed, so please click **Edit** to fix them, or **Approve** if it looks right.`
      : `<@${message.author.id}> I parsed your announcement into an event draft. Please **Approve**, **Edit**, or **Reject** it.`;

    const reviewMessage = await approvalChannel.send({
      content: intro,
      embeds: [buildReviewEmbed(session)],
      components: buildReviewComponents(session),
    });

    session.review_message_id = reviewMessage.id;
    session.updated_at = nowIso();
    saveSession(session);
  } catch (error) {
    console.error("Error handling new announcement message:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      const [action, sessionId] = interaction.customId.split(":");
      if (!["approve", "edit", "reject"].includes(action)) return;

      const session = getSession(sessionId);
      if (!session) {
        await interaction.reply({
          content: "I could not find that review session.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.user.id !== session.author_id) {
        await interaction.reply({
          content: "Only the original announcement author can review this event.",
          ephemeral: true,
        });
        return;
      }

      if (action === "edit") {
        await interaction.showModal(buildEditModal(session));
        return;
      }

      if (session.status !== "pending") {
        await interaction.reply({
          content: "This review has already been completed.",
          ephemeral: true,
        });
        return;
      }

      if (action === "approve") {
        await interaction.deferUpdate();

        const result = await submitApprovedEvent(session);
        if (!result.ok) {
          await interaction.followUp({
            content: result.error || "Could not submit the event to the server.",
            ephemeral: true,
          });
          return;
        }

        session.status = "approved";
        session.updated_at = nowIso();
        saveSession(session);

        let footer = "";
        if (result.skipped) {
          footer = " _(Supabase env not set — draft was logged to the console only.)_";
        } else if (result.eventId) {
          footer = ` Supabase event id: \`${result.eventId}\`.`;
        }

        await interaction.editReply({
          content: `✅ Approved by <@${interaction.user.id}>.${footer}`,
          embeds: [buildReviewEmbed(session)],
          components: buildReviewComponents(session),
        });
        return;
      }

      if (action === "reject") {
        session.status = "rejected";
        session.updated_at = nowIso();
        saveSession(session);

        await interaction.update({
          content: `❌ Rejected by <@${interaction.user.id}>.`,
          embeds: [buildReviewEmbed(session)],
          components: buildReviewComponents(session),
        });
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      const [tag, sessionId] = interaction.customId.split(":");
      if (tag !== "editmodal") return;

      const session = getSession(sessionId);
      if (!session) {
        await interaction.reply({
          content: "I could not find that review session.",
          ephemeral: true,
        });
        return;
      }

      if (interaction.user.id !== session.author_id) {
        await interaction.reply({
          content: "Only the original announcement author can edit this event.",
          ephemeral: true,
        });
        return;
      }

      if (session.status !== "pending") {
        await interaction.reply({
          content: "This review has already been completed.",
          ephemeral: true,
        });
        return;
      }

      const refDateTime = DateTime.fromISO(
        session.draft.source_message_created_at
      ).setZone(TIMEZONE);

      const titleRaw = interaction.fields.getTextInputValue("title_input");
      const startRaw = interaction.fields.getTextInputValue("start_input");
      const endRaw = interaction.fields.getTextInputValue("end_input");
      const locationRaw = interaction.fields.getTextInputValue("location_input");
      const descriptionRaw = interaction.fields.getTextInputValue("description_input");

      const title = normalizeNullable(titleRaw);
      const location = normalizeNullable(locationRaw);
      const description = normalizeNullable(descriptionRaw);

      let startDt = null;
      let endDt = null;
      const errors = [];

      if (normalizeNullable(startRaw)) {
        const parsed = parseFlexibleDateTime(startRaw, refDateTime);
        if (!parsed.dt) errors.push(parsed.error);
        else startDt = parsed.dt;
      }

      if (normalizeNullable(endRaw)) {
        const parsed = parseFlexibleDateTime(endRaw, refDateTime);
        if (!parsed.dt) errors.push(parsed.error);
        else endDt = parsed.dt;
      }

      if (!startDt && endDt) {
        errors.push("End time requires a start time.");
      }

      if (errors.length > 0) {
        await interaction.reply({
          content: errors.join("\n"),
          ephemeral: true,
        });
        return;
      }

      if (startDt && !endDt) {
        endDt = startDt;
      }

      session.draft.title = title;
      session.draft.location = location;
      session.draft.description = description;
      session.draft.start_time = startDt ? startDt.toISO() : null;
      session.draft.end_time = endDt ? endDt.toISO() : null;

      computeDraftMeta(session.draft);
      session.updated_at = nowIso();
      saveSession(session);

      await refreshReviewMessage(client, session);

      await interaction.reply({
        content: "Updated. The review message has been refreshed.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error handling interaction:", error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while handling that action.",
        ephemeral: true,
      }).catch(() => {});
    }
  }
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

client.login(DISCORD_TOKEN);