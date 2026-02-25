import * as chrono from 'chrono-node';
import { config } from './config.js';

/**
 * Parses natural language date/time from text
 * @param {string} text - The input text containing date/time information
 * @param {Date} referenceDate - Reference date for parsing (default: now)
 * @returns {Object} Parsed date information including title, dueDate, and reminderDate
 */
export function parseTaskFromText(text, referenceDate = new Date()) {
  // Parse all dates from the text
  const results = chrono.parse(text, referenceDate, {
    timezone: config.timezone,
  });

  if (results.length === 0) {
    return {
      title: text.trim(),
      dueDate: null,
      reminderDate: null,
    };
  }

  // Get the first parsed date as the due date
  const firstResult = results[0];
  const dueDate = firstResult.start.date();

  // Extract the task title by removing the date text
  let title = text
    .substring(0, firstResult.index)
    .trim();
  
  if (text.length > firstResult.index + firstResult.text.length) {
    const afterDate = text.substring(firstResult.index + firstResult.text.length).trim();
    title = title + ' ' + afterDate;
  }
  
  title = title.trim();

  // Parse reminder time from text
  const reminderDate = parseReminder(text, dueDate, firstResult);

  return {
    title: title || 'New Task',
    dueDate,
    reminderDate,
  };
}

/**
 * Parses reminder time from text
 * Looks for patterns like "remind me X minutes/hours before"
 */
function parseReminder(text, dueDate, dateResult) {
  if (!dueDate) return null;

  const lowerText = text.toLowerCase();
  
  // Pattern: "remind me 15 minutes before"
  const reminderPattern = /remind(?:\s+me)?\s+(\d+)\s+(minute|minutes|min|hour|hours|hr|hrs?)\s+before/i;
  const match = lowerText.match(reminderPattern);

  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    const milliseconds = unit.startsWith('hour') || unit.startsWith('hr') 
      ? amount * 60 * 60 * 1000 
      : amount * 60 * 1000;

    return new Date(dueDate.getTime() - milliseconds);
  }

  // Default: no reminder
  return null;
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

/**
 * Examples of supported natural language inputs:
 * - "tomorrow at 10AM go to bank"
 * - "remind me 15 minutes before"
 * - "next Monday at 3pm call client"
 * - "in 2 hours submit report"
 * - "Friday buy groceries"
 * - "on December 25 send Christmas cards"
 */
