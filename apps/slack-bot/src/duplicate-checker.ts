import { UniversifyEvent } from './parser';
import { getEvents } from './store';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedEventId?: string;
  matchedEventTitle?: string;
  reason?: string;
}

export async function checkForDuplicate(
  newEvent: UniversifyEvent
): Promise<DuplicateCheckResult> {
  if (!OPENROUTER_API_KEY) {
    console.warn('[DuplicateChecker] No OPENROUTER_API_KEY set, skipping check');
    return { isDuplicate: false };
  }

  const existingEvents = getEvents();
  if (existingEvents.length === 0) {
    return { isDuplicate: false };
  }

  const existingSummaries = existingEvents.slice(0, 30).map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
  }));

  const prompt = `You are a duplicate event detector. Compare the NEW event below against the list of EXISTING events and determine if the new event is a duplicate or very similar to any existing one.

Consider events duplicates if they have a very similar title AND similar date/time. Minor wording differences (e.g. "CS Club Meeting" vs "Computer Science Club Meeting") should still be flagged.

NEW EVENT:
- Title: "${newEvent.title}"
- Start: ${newEvent.startTime}
- End: ${newEvent.endTime}
- Location: ${newEvent.location || 'N/A'}

EXISTING EVENTS:
${JSON.stringify(existingSummaries, null, 2)}

Respond with ONLY valid JSON (no markdown, no code fences):
{"isDuplicate": true/false, "matchedEventId": "id or null", "matchedEventTitle": "title or null", "reason": "brief explanation"}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://universify.app',
        'X-Title': 'Universify Slack Bot',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[DuplicateChecker] OpenRouter API error ${response.status}: ${errText}`);
      return { isDuplicate: false };
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { isDuplicate: false };
    }

    const parsed = JSON.parse(content);
    return {
      isDuplicate: !!parsed.isDuplicate,
      matchedEventId: parsed.matchedEventId || undefined,
      matchedEventTitle: parsed.matchedEventTitle || undefined,
      reason: parsed.reason || undefined,
    };
  } catch (err) {
    console.error('[DuplicateChecker] Failed to check for duplicates:', err);
    return { isDuplicate: false };
  }
}
