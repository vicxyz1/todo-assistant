import * as chrono from 'chrono-node';
import { config } from './config.js';

/**
 * Parses natural language date/time from text
 * @param {string} text - The input text containing date/time information
 * @param {Date} referenceDate - Reference date for parsing (default: now)
 * @returns {Object} Parsed date information including title, dueDate, and reminderDate
 */
export function parseTaskFromText(text, referenceDate = new Date()) {
  // First, let's extract and remove the reminder part so it doesn't confuse chrono or the title
  const { reminderDate, textWithoutReminder } = extractReminder(text);

  // Parse dates from the remaining text
  const results = chrono.parse(textWithoutReminder, referenceDate, {
    timezone: config.timezone,
  });

  if (results.length === 0) {
    return {
      title: textWithoutReminder.trim(),
      dueDate: null,
      reminderDate: null, // Reminder only makes sense if there's a due date
    };
  }

  // Get the first parsed date as the due date
  const firstResult = results[0];
  const dueDate = firstResult.start.date();

  // Extract the task title by removing the date text
  let title = textWithoutReminder
    .substring(0, firstResult.index)
    .trim();
  
  if (textWithoutReminder.length > firstResult.index + firstResult.text.length) {
    const afterDate = textWithoutReminder.substring(firstResult.index + firstResult.text.length).trim();
    title = title + ' ' + afterDate;
  }
  
  // Clean up extra spaces and commas
  title = title.replace(/,\s*$/, '').trim();

  // If we found a reminder offset earlier, apply it to the parsed dueDate
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

/**
 * Extracts reminder offset from text and returns cleaned text
 * Handles: "remind me 1h before", "remind 15m before", "remind me in 30 mins"
 */
function extractReminder(text) {
  const lowerText = text.toLowerCase();
  
  // Pattern matches: "remind me 1h before", "remind 15 min before", "remind me 1 hour before"
  // \s* allows for "1h" or "1 h"
  const reminderPattern = /,?\s*remind(?:\s+me)?\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)\s+before/i;
  
  const match = lowerText.match(reminderPattern);

  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    
    // Check if unit is hours or minutes
    const isHour = unit.startsWith('h');
    const offsetMs = isHour ? amount * 60 * 60 * 1000 : amount * 60 * 1000;

    // Remove the reminder text from the original string
    const textWithoutReminder = text.slice(0, match.index) + text.slice(match.index + match[0].length);

    return {
      reminderDate: { offsetMs },
      textWithoutReminder: textWithoutReminder.trim()
    };
  }

  return {
    reminderDate: null,
    textWithoutReminder: text
  };
}

/**
 * Formats a date for display
 */
export function formatDate(date) {
  if (!date) return 'No date';
  
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: config.timezone,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}
