import { config } from './config.js';

/**
 * Returns the current UTC offset string for the configured timezone.
 * e.g. "+02:00" or "+03:00" (handles DST automatically).
 */
function getUtcOffset(timezone) {
  const now = new Date();
  // Get local time parts in the target timezone
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  // Get UTC time parts
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diffMs = tzDate - utcDate;
  const sign = diffMs >= 0 ? '+' : '-';
  const totalMins = Math.round(Math.abs(diffMs) / 60000);
  const hours = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mins = String(totalMins % 60).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

/**
 * Builds the system prompt with the current UTC offset baked in,
 * so the AI always returns timezone-aware ISO strings.
 */
function buildSystemPrompt(utcOffset) {
  return `You are a task extraction assistant. Given a natural language message, extract:
1. Task name/title (required)
2. Due date (optional)
3. Reminder datetime (optional)

The current date/time in the user's timezone and the exact UTC offset are provided as context.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "title": "task name here",
  "dueDate": "2026-03-27T23:59:00${utcOffset}",
  "reminderDate": "2026-03-27T08:00:00${utcOffset}"
}

Rules:
- title: extract the actual task name; strip all date/time/reminder text
- dueDate: ALWAYS append the UTC offset "${utcOffset}" to the datetime string; if no time given, default to 09:00:00; set to null if no date found
- reminderDate: ALWAYS append the UTC offset "${utcOffset}" to the datetime string; calculate from reminder phrase (e.g. "remind me at 8AM" → use 08:00:00, "remind me 15 min before" → subtract from dueDate); set to null if not mentioned
- Resolve relative dates ("tomorrow", "next Monday", "in 2 hours") against the provided current date/time
- Always return all three fields; use null for missing optional fields`;
}

/**
 * Parses a natural language message using AI via OpenRouter API.
 * @param {string} text - The input message from Telegram
 * @returns {Promise<{title: string, dueDate: Date|null, reminderDate: Date|null}>}
 */
export async function parseTaskWithAI(text) {
  const apiKey = config.openrouter.apiKey;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in .env');
  }

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

  if (!content) {
    throw new Error('Empty response received from AI');
  }

  let parsed;
  try {
    // Strip markdown code fences if the model wrapped the JSON
    const jsonStr = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`AI returned non-JSON response: ${content}`);
  }

  return {
    title: parsed.title?.trim() || 'New Task',
    // new Date() correctly parses offset-aware strings like "2026-03-27T23:59:00+02:00"
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    reminderDate: parsed.reminderDate ? new Date(parsed.reminderDate) : null,
  };
}
