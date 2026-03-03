import { config } from './config.js';

/**
 * Returns the current UTC offset string for the configured timezone.
 * e.g. "+02:00" or "+03:00" — handles DST changes automatically.
 */
function getUtcOffset(timezone) {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diffMs = tzDate - utcDate;
  const sign = diffMs >= 0 ? '+' : '-';
  const totalMins = Math.round(Math.abs(diffMs) / 60000);
  const hours = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mins = String(totalMins % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

/**
 * Builds the system prompt with the live UTC offset baked in.
 *
 * Key logic:
 *   - dueDate  → DATE ONLY (YYYY-MM-DD). MS Todo doesn't support time on due dates.
 *   - reminderDateTime → if a time is mentioned, that IS the reminder.
 *     "Party tomorrow at 7PM"            → reminder: 2026-03-04T19:00:00+02:00
 *     "Party tomorrow at 7PM remind 1h before" → reminder: 2026-03-04T18:00:00+02:00
 */
function buildSystemPrompt(utcOffset) {
  return `You are a task extraction assistant. Extract fields from a natural language message.

IMPORTANT: Microsoft To Do does NOT support time on due dates — store date only.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "title": "task name",
  "dueDate": "2026-03-04",
  "reminderDateTime": "2026-03-04T19:00:00${utcOffset}"
}

Field rules:

title:
  - Task name only; remove all date, time, and reminder phrases.

dueDate:
  - Format: YYYY-MM-DD (date only, NO time, NO offset).
  - Resolve relative dates ("tomorrow", "next Monday", "in 2 hours") from the current date/time provided.
  - Set to null if no date is mentioned.

reminderDateTime:
  - Format: YYYY-MM-DDTHH:mm:ss${utcOffset}  (ALWAYS include the offset "${utcOffset}").
  - Logic (in priority order):
    1. Time mentioned + "remind me X before" phrase:
       → reminder = that time on dueDate MINUS X
       Example: "at 7PM remind me 1h before" → T18:00:00${utcOffset}
    2. Time mentioned, no reminder offset phrase:
       → reminder = that time on dueDate (the event time IS the reminder)
       Example: "at 7 evening" → T19:00:00${utcOffset}
    3. Only "remind me X before", no specific event time:
       → reminder = dueDate at 09:00:00 MINUS X
    4. No time and no reminder phrase → null
  - Set to null if dueDate is null.

Always return all three fields. Use null for missing optional fields.`;
}

/**
 * Parses a natural language message using AI via OpenRouter API.
 * @param {string} text - The input message from Telegram
 * @returns {Promise<{title: string, dueDate: Date|null, reminderDate: Date|null}>}
 */
export async function parseTaskWithAI(text) {
  const apiKey = config.openrouter.apiKey;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured in .env');

  const now = new Date();
  const utcOffset = getUtcOffset(config.timezone);

  const nowStr = now.toLocaleString('en-US', {
    timeZone: config.timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const systemPrompt = buildSystemPrompt(utcOffset);
  const userMessage =
    `Current date/time: ${nowStr}\nTimezone: ${config.timezone} (UTC${utcOffset})\n\nUser message: "${text}"`;

  const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/vicxyz1/todo-assistant',
      'X-Title': 'Todo Assistant Bot',
    },
    body: JSON.stringify({
      model: config.openrouter.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response received from AI');

  let parsed;
  try {
    const jsonStr = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`AI returned non-JSON response: ${content}`);
  }

  // dueDate: AI returns YYYY-MM-DD; parse as midnight in local timezone
  const dueDate = parsed.dueDate
    ? new Date(`${parsed.dueDate}T00:00:00${utcOffset}`)
    : null;

  // reminderDateTime: AI includes the offset, new Date() parses it correctly
  const reminderDate = parsed.reminderDateTime
    ? new Date(parsed.reminderDateTime)
    : null;

  return {
    title: parsed.title?.trim() || 'New Task',
    dueDate,
    reminderDate,
  };
}
