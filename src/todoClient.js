import { Client } from '@microsoft/microsoft-graph-client';
import { config } from './config.js';
import { getAccessToken } from './graphAuth.js';

function createGraphClient() {
  return Client.init({
    // Inline authProvider: fetches (and auto-refreshes) token on every call
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (err) {
        done(err, null);
      }
    },
  });
}

/**
 * Formats a Date object to a local ISO string (YYYY-MM-DDThh:mm:ss) 
 * matching the configured timezone, as required by Microsoft Graph API.
 */
function toLocalISOString(date) {
  // Use Intl.DateTimeFormat to get the parts in the correct timezone
  const options = {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(date);
  
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  // Handle 24:00:00 Edge case (Intl sometimes returns 24 instead of 00)
  const hour = map.hour === '24' ? '00' : map.hour;

  // Format: YYYY-MM-DDThh:mm:ss
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`;
}

/**
 * Creates a task in Microsoft To Do
 */
export async function createTask({ title, dueDate, reminderDate }) {
  const client = createGraphClient();
  const task = { title };

  if (dueDate) {
    task.dueDateTime = {
      dateTime: toLocalISOString(dueDate),
      timeZone: config.timezone,
    };
  }

  if (reminderDate) {
    task.isReminderOn = true;
    task.reminderDateTime = {
      dateTime: toLocalISOString(reminderDate),
      timeZone: config.timezone,
    };
  }

  try {
    return await client
      .api(`/me/todo/lists/${config.todo.listId}/tasks`)
      .post(task);
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

/**
 * Lists all To Do task lists
 */
export async function getTaskLists() {
  const client = createGraphClient();
  try {
    const response = await client.api('/me/todo/lists').get();
    return response.value;
  } catch (error) {
    console.error('Error fetching task lists:', error);
    throw new Error(`Failed to fetch task lists: ${error.message}`);
  }
}

/**
 * Gets tasks from a specific list
 */
export async function getTasks(listId = config.todo.listId) {
  const client = createGraphClient();
  try {
    const response = await client
      .api(`/me/todo/lists/${listId}/tasks`)
      .top(20)
      .orderby('createdDateTime desc')
      .get();
    return response.value;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
}
