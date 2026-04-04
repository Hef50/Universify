/**
 * Email Newsletter → Universify Event Parser
 *
 * Two-stage parsing strategy:
 *   1. PRIMARY  — Send email content to an LLM via OpenRouter for intelligent
 *                 structured extraction (handles any newsletter format).
 *   2. FALLBACK — If the LLM call fails or returns unusable data, fall back
 *                 to the same regex-based extraction used in the Slack bot.
 */

import { ParsedMail } from 'mailparser';
import * as cheerio from 'cheerio';
import { AnyNode } from 'domhandler';
import OpenAI from 'openai';
import https from 'https';
import http from 'http';

// ─── Shared types (mirrors apps/client/types/event.ts) ─────────────────

export type EventCategory =
  | 'Career'
  | 'Food'
  | 'Fun'
  | 'Afternoon'
  | 'Events'
  | 'Academic'
  | 'Networking'
  | 'Social'
  | 'Sports'
  | 'Arts'
  | 'Tech'
  | 'Wellness';

export interface UniversifyEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  categories: EventCategory[];
  organizer: {
    id: string;
    name: string;
    type: 'club' | 'individual';
  };
  color: string;
  rsvpEnabled: boolean;
  rsvpCounts: { going: number; maybe: number; notGoing: number };
  attendees: Array<{ userId: string; status: string; timestamp: string }>;
  attendeeVisibility: 'public' | 'private';
  isClubEvent: boolean;
  isSocialEvent: boolean;
  capacity?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

const EMAIL_EVENT_COLOR = '#1a73e8';

const VALID_CATEGORIES: EventCategory[] = [
  'Career', 'Food', 'Fun', 'Afternoon', 'Events',
  'Academic', 'Networking', 'Social', 'Sports', 'Arts', 'Tech', 'Wellness',
];

// ─── OpenRouter client ─────────────────────────────────────────────────

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/Hef50/Universify',
    'X-Title': 'Universify Email Bot',
  },
});

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

// ─── Supported image MIME types for Claude vision ──────────────────────

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGES = 2; // cap to avoid overloading the model and breaking JSON output

// ─── Download a remote image URL → base64 data URI ─────────────────────

function downloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const contentType = res.headers['content-type'] || '';
      const mime = contentType.split(';')[0].trim();
      if (!SUPPORTED_IMAGE_TYPES.includes(mime)) {
        reject(new Error(`Unsupported type: ${mime}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const b64 = Buffer.concat(chunks).toString('base64');
        resolve(`data:${mime};base64,${b64}`);
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Extract images from a parsed email ────────────────────────────────

/**
 * Returns up to MAX_IMAGES base64 data URIs from:
 *   1. Inline / attached image buffers already in mail.attachments
 *   2. External <img src="..."> URLs found in the HTML body
 */
async function extractImagesFromMail(mail: ParsedMail): Promise<string[]> {
  const dataUris: string[] = [];

  // 1. Embedded attachments (inline CID images and image/* attachments)
  for (const att of mail.attachments || []) {
    if (dataUris.length >= MAX_IMAGES) break;
    const mime = att.contentType?.toLowerCase() || '';
    if (!SUPPORTED_IMAGE_TYPES.includes(mime)) continue;
    if (!att.content || att.content.length === 0) continue;
    const b64 = att.content.toString('base64');
    dataUris.push(`data:${mime};base64,${b64}`);
  }

  // 2. External <img> URLs from HTML (if we still have room)
  if (dataUris.length < MAX_IMAGES && mail.html) {
    const $ = cheerio.load(mail.html as string);
    const imgUrls: string[] = [];
    $('img[src]').each((_: number, el: AnyNode) => {
      const src = $(el).attr('src') || '';
      if (src.startsWith('http://') || src.startsWith('https://')) {
        imgUrls.push(src);
      }
    });

    for (const url of imgUrls) {
      if (dataUris.length >= MAX_IMAGES) break;
      try {
        const uri = await downloadImage(url);
        dataUris.push(uri);
      } catch {
        // skip images that fail to download
      }
    }
  }

  return dataUris;
}

// ─── HTML → plain text ─────────────────────────────────────────────────

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, head, noscript').remove();
  $('br').replaceWith('\n');
  $('p, div, tr, li, h1, h2, h3, h4, h5, h6').each((_: number, el: AnyNode) => {
    $(el).append('\n');
  });
  return $.text()
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── LLM-based extraction ──────────────────────────────────────────────

interface LLMExtractedEvent {
  title: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM (24h)
  endTime: string;     // HH:MM (24h)
  location: string;
  description: string;
  categories: EventCategory[];
  isEvent: boolean;    // false if the email has no event at all
}

async function extractWithLLM(
  subject: string,
  body: string,
  images: string[] = []
): Promise<LLMExtractedEvent | null> {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are an assistant that extracts campus event details from university newsletter emails.

Today's date is ${today}.

Given the email below${images.length > 0 ? ' (including any attached images)' : ''}, determine if it describes a real upcoming campus event (a specific happening with a date/time people can attend). Product announcements, account notices, general newsletters, and blog posts are NOT events.

Return ONLY a JSON object with these exact fields — no explanation, no prose, no markdown fences:
{
  "isEvent": true,                // true ONLY if this is a real upcoming event people can attend
  "title": "string",              // event name
  "date": "YYYY-MM-DD",          // event date (use ${today.split('-')[0]} if year not mentioned)
  "startTime": "HH:MM",          // 24-hour format, e.g. "14:00". Use "12:00" if unknown
  "endTime": "HH:MM",            // 24-hour format. Use one hour after start if unknown
  "location": "string",          // building, room, or address. Empty string if unknown
  "description": "string",       // 1-3 sentence summary
  "categories": ["string"]       // pick only from: Career, Food, Fun, Afternoon, Events, Academic, Networking, Social, Sports, Arts, Tech, Wellness
}

If this is NOT an event, return exactly: {"isEvent": false}

CRITICAL: Your entire response must be valid JSON only. Nothing else.

EMAIL SUBJECT: ${subject}

EMAIL BODY:
${body.substring(0, 3000)}`;

  // Build multimodal content: text prompt + any images
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

  const content: ContentPart[] = [{ type: 'text', text: prompt }];
  for (const uri of images) {
    content.push({ type: 'image_url', image_url: { url: uri } });
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: images.length > 0 ? content : prompt }],
    temperature: 0,
    max_tokens: 400,
  });

  const raw = response.choices[0]?.message?.content?.trim() || '';

  // Strip any accidental markdown code fences the model might add
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: LLMExtractedEvent;
  try {
    parsed = JSON.parse(cleaned) as LLMExtractedEvent;
  } catch {
    throw new Error(`LLM returned non-JSON response: ${cleaned.substring(0, 80)}`);
  }
  return parsed;
}

// ─── Regex fallback (mirrors slack-bot/src/parser.ts) ──────────────────

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function extractDate(text: string): Date | null {
  const slashDate = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashDate) {
    const month = parseInt(slashDate[1], 10) - 1;
    const day = parseInt(slashDate[2], 10);
    let year = parseInt(slashDate[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  const namedDate = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(\d{4}))?\b/i
  );
  if (namedDate) {
    const month = MONTH_NAMES[namedDate[1].toLowerCase()];
    const day = parseInt(namedDate[2], 10);
    const year = namedDate[3] ? parseInt(namedDate[3], 10) : new Date().getFullYear();
    if (month !== undefined) return new Date(year, month, day);
  }

  return null;
}

function extractTime(text: string): {
  startHour: number; startMinute: number;
  endHour: number; endMinute: number;
} | null {
  const rangeMatch = text.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1], 10);
    const startM = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
    let endH = parseInt(rangeMatch[4], 10);
    const endM = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : 0;
    const endMeridian = (rangeMatch[6] || '').toLowerCase();
    const startMeridian = (rangeMatch[3] || endMeridian).toLowerCase();
    if (endMeridian === 'pm' && endH < 12) endH += 12;
    if (endMeridian === 'am' && endH === 12) endH = 0;
    if (startMeridian === 'pm' && startH < 12) startH += 12;
    if (startMeridian === 'am' && startH === 12) startH = 0;
    if (startH > endH) startH = parseInt(rangeMatch[1], 10);
    return { startHour: startH, startMinute: startM, endHour: endH, endMinute: endM };
  }

  const singleMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (singleMatch) {
    let hour = parseInt(singleMatch[1], 10);
    const minute = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    const meridian = (singleMatch[3] || '').toLowerCase();
    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;
    return { startHour: hour, startMinute: minute, endHour: hour + 1, endMinute: minute };
  }

  return null;
}

function extractLocation(text: string): string {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const label = trimmed.match(/^(?:location|where|place|venue|room)\s*[:]\s*(.+)/i);
    if (label) return label[1].trim();
    const at = trimmed.match(/^(?:at|@)\s+(.{3,50})/i);
    if (at) return at[1].trim();
  }
  const inline = text.match(/(?:location|venue|where)\s*[:\-]\s*([^\n,]{3,60})/i);
  return inline ? inline[1].trim() : '';
}

function inferCategories(text: string): EventCategory[] {
  const lower = text.toLowerCase();
  const cats: EventCategory[] = [];
  if (/career|job|interview|hiring|recruit|internship/.test(lower)) cats.push('Career');
  if (/food|lunch|dinner|breakfast|pizza|snack|coffee|boba|catering/.test(lower)) cats.push('Food');
  if (/fun|party|game night|trivia|karaoke/.test(lower)) cats.push('Fun');
  if (/academic|class|lecture|study|exam|office hours|professor/.test(lower)) cats.push('Academic');
  if (/network|meetup|mixer|professional/.test(lower)) cats.push('Networking');
  if (/social|hangout|community|casual/.test(lower)) cats.push('Social');
  if (/sport|fitness|gym|basketball|soccer|yoga|run|athletic/.test(lower)) cats.push('Sports');
  if (/art|music|theater|dance|paint|drawing|creative|gallery/.test(lower)) cats.push('Arts');
  if (/tech|code|coding|hackathon|workshop|programming|ai|ml|software/.test(lower)) cats.push('Tech');
  if (/wellness|health|meditation|mindful|self[- ]care|mental health/.test(lower)) cats.push('Wellness');
  return cats.length > 0 ? cats : ['Events'];
}

// Keywords that strongly signal a real event people can attend
const EVENT_SIGNAL_RE = /\b(join us|rsvp|register|sign up|sign-up|attendance|attend|come join|you're invited|you are invited|seats? (are |is )?limited|free food|workshop|seminar|panel|webinar|hackathon|networking|info session|open house|guest speaker|office hours|club meeting|general meeting|social|mixer)\b/i;

/**
 * Returns true only if the text contains strong evidence of a real event:
 *   - Both a date AND a time are present, OR
 *   - Event-signal keywords are present
 */
function hasEventSignals(text: string, date: Date | null, time: ReturnType<typeof extractTime>): boolean {
  if (date && time) return true;                // has both date + time → likely an event
  if (EVENT_SIGNAL_RE.test(text)) return true;  // has event keywords → likely an event
  return false;
}

function regexFallback(
  subject: string,
  body: string,
  senderName: string,
  senderEmail: string,
  rawId: string,
  now: string
): UniversifyEvent | null {
  const fullText = `${subject}\n${body}`;
  const extractedDate = extractDate(fullText);
  const extractedTime = extractTime(fullText);

  // Require at least one strong event signal — skip pure newsletters/announcements
  if (!hasEventSignals(fullText, extractedDate, extractedTime)) {
    console.log(`[Parser] Regex fallback: no event signals found, skipping`);
    return null;
  }

  const baseDate = extractedDate || (() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d;
  })();

  const startH = extractedTime?.startHour ?? 12;
  const startM = extractedTime?.startMinute ?? 0;
  const endH = extractedTime?.endHour ?? startH + 1;
  const endM = extractedTime?.endMinute ?? 0;

  const startTime = new Date(baseDate);
  startTime.setHours(startH, startM, 0, 0);
  const endTime = new Date(baseDate);
  endTime.setHours(endH, endM, 0, 0);
  if (endTime <= startTime) endTime.setTime(startTime.getTime() + 3600000);

  return {
    id: `email-${rawId}`,
    title: subject.substring(0, 100) || 'Newsletter Event',
    description: body,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    location: extractLocation(fullText),
    categories: inferCategories(fullText),
    organizer: { id: `email-${senderEmail}`, name: senderName, type: 'club' },
    color: EMAIL_EVENT_COLOR,
    rsvpEnabled: false,
    rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
    attendees: [],
    attendeeVisibility: 'public',
    isClubEvent: true,
    isSocialEvent: false,
    tags: ['Email', 'Newsletter'],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main parser ───────────────────────────────────────────────────────

/**
 * Parse a mailparser ParsedMail into a Universify Event.
 *
 * Tries LLM extraction first via OpenRouter. If the LLM is unavailable,
 * returns an error, or says it's not an event, falls back to regex parsing.
 */
export async function parseEmail(mail: ParsedMail): Promise<UniversifyEvent | null> {
  const subject = (mail.subject || '').trim();

  // Get plain text body
  let body = '';
  if (mail.text && mail.text.trim()) {
    body = mail.text.trim();
  } else if (mail.html) {
    body = htmlToText(mail.html as string);
  }

  if (!subject && !body) return null;

  // Stable unique ID
  const rawId = mail.messageId
    ? mail.messageId.replace(/[<>\s]/g, '')
    : `${subject}-${Date.now()}`.replace(/\s/g, '-');

  const senderAddress = mail.from?.value[0];
  const senderName = senderAddress?.name || senderAddress?.address || 'Newsletter';
  const senderEmail = senderAddress?.address || 'unknown';
  const now = new Date().toISOString();

  // ── Try LLM extraction ──
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const images = await extractImagesFromMail(mail);
      if (images.length > 0) {
        console.log(`[Parser] Found ${images.length} image(s) in email — sending to LLM vision`);
      }
      const llmResult = await extractWithLLM(subject, body, images);

      // LLM said this email is not an event — skip it
      if (!llmResult || !llmResult.isEvent) {
        console.log(`[Parser] LLM skipped non-event email: "${subject}"`);
        return null;
      }

      // Parse the LLM date/time strings into Date objects
      const [year, month, day] = llmResult.date.split('-').map(Number);
      const [startH, startM] = llmResult.startTime.split(':').map(Number);
      const [endH, endM] = llmResult.endTime.split(':').map(Number);

      const startTime = new Date(year, month - 1, day, startH, startM, 0, 0);
      const endTime = new Date(year, month - 1, day, endH, endM, 0, 0);
      if (endTime <= startTime) endTime.setTime(startTime.getTime() + 3600000);

      // Validate categories against allowed set, fall back to ['Events']
      const categories = (llmResult.categories || []).filter(
        (c): c is EventCategory => VALID_CATEGORIES.includes(c as EventCategory)
      );

      console.log(`[Parser] LLM extracted event: "${llmResult.title}"`);

      return {
        id: `email-${rawId}`,
        title: (llmResult.title || subject).substring(0, 100),
        description: llmResult.description || body.substring(0, 500),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: llmResult.location || '',
        categories: categories.length > 0 ? categories : ['Events'],
        organizer: { id: `email-${senderEmail}`, name: senderName, type: 'club' },
        color: EMAIL_EVENT_COLOR,
        rsvpEnabled: false,
        rsvpCounts: { going: 0, maybe: 0, notGoing: 0 },
        attendees: [],
        attendeeVisibility: 'public',
        isClubEvent: true,
        isSocialEvent: false,
        tags: ['Email', 'Newsletter'],
        createdAt: now,
        updatedAt: now,
      };
    } catch (err: any) {
      console.warn(`[Parser] LLM extraction failed, using regex fallback: ${err.message}`);
    }
  }

  // ── Regex fallback ──
  console.log(`[Parser] Regex fallback: "${subject}"`);
  return regexFallback(subject, body, senderName, senderEmail, rawId, now) ?? null;
}
