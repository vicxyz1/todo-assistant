import * as chrono from 'chrono-node';
import { config } from './config.js';

/**
 * Parses natural language date/time from text (legacy, kept for reference)
 */
export function parseTaskFromText(text, referenceDate = new Date()) {
  const { reminderDate, textWithoutReminder } = extractReminder(text);

  const results = chrono.parse(textWithoutReminder, referenceDate, {
    timezone: config.timezone,
  });

  if (results.length === 0) {
    return {
      title: textWithoutReminder.trim(),
      dueDate: null,
      reminderDate: null,
    };
  }

  const firstResult = results[0];
  const dueDate = firstResult.start.date();

  let title = textWithoutReminder.substring(0, firstResult.index).trim();
  if (textWithoutReminder.length > firstResult.index + firstResult.text.length) {
    const afterDate = textWithoutReminder
      .substring(firstResult.index + firstResult.text.length)
      .trim();
    title = title + ' ' + afterDate;
  }
  title = title.replace(/,\s*$/, '').trim();

  let finalReminder = null;
  if (reminderDate && reminderDate.offsetMs) {
    finalReminder = new Date(dueDate.getTime() - reminderDate.offsetMs);
  }

  return {
    title: title || 'New Task',
    dueDate,
    reminderDate: finalReminder,
  };
}

function extractReminder(text) {
  const lowerText = text.toLowerCase();
  const reminderPattern =
    /,?\s*remind(?:\s+me)?\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s+before/i;
  const match = lowerText.match(reminderPattern);

  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    const isHour = unit.startsWith('h');
    const offsetMs = isHour ? amount * 60 * 60 * 1000 : amount * 60 * 1000;
    const textWithoutReminder =
      text.slice(0, match.index) + text.slice(match.index + match[0].length);
    return { reminderDate: { offsetMs }, textWithoutReminder: textWithoutReminder.trim() };
  }

  return { reminderDate: null, textWithoutReminder: text };
}

/**
 * Formats a date with both date and time (used for reminder display)
 */
export function formatDate(date) {
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: config.timezone,
  }).format(date);
}

/**
 * Formats a date with date only — no time (used for due date display,
 * since MS Todo doesn't support time on due dates)
 */
export function formatDateOnly(date) {
  if (!date) return 'No date';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.timezone,
  }).format(date);
}
