import { config } from './config.js';

const SYSTEM_PROMPT = `You are a task extraction assistant. Given a natural language message, extract:
1. Task name/title (required)
2. Due date (optional) - in ISO 8601 format (YYYY-MM-DDTHH:mm:ss), or null if not specified
3. Reminder datetime (optional) - in ISO 8601 format (YYYY-MM-DDTHH:mm:ss), or null if not specified

The current date/time in the user's timezone is provided as context. Use it to resolve relative dates.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "title": "task name here",
  "dueDate": "2024-03-15T10:00:00",
  "reminderDate": "2024-03-15T09:45:00"
}

Rules:
- title: extract the actual task name, strip all date/time/reminder references
- dueDate: if no specific time is given, assume end of day (23:59:00); set to null if no date found
- reminderDate: if a reminder is mentioned (e.g., "remind me 15 min before"), calculate the exact datetime based on the due date; set to null if not mentioned
- Resolve relative dates ("tomorrow", "next Monday", "in 2 hours") against the provided current date/time
- Always return all three fields; use null for missing optional fields`;

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

  const userMessage =
    `Current date/time: ${nowStr} (timezone: ${config.timezone})\n\nUser message: "${text}"`;

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
        { role: 'system', content: SYSTEM_PROMPT },
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
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    reminderDate: parsed.reminderDate ? new Date(parsed.reminderDate) : null,
  };
}
