import { Client } from '@microsoft/microsoft-graph-client';
import { config } from './config.js';
import { getAccessToken } from './graphAuth.js';

function createGraphClient() {
  return Client.init({
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

  // Handle 24:00:00 edge case (Intl sometimes returns 24 instead of 00)
  const hour = map.hour === '24' ? '00' : map.hour;

  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}`;
}

// In-memory cache for list lookups (cleared on process restart)
let listCache = null;

/**
 * Resolves a list display name to its Microsoft Graph list ID.
 * Uses an in-memory cache to avoid repeated API calls.
 * @param {string} name - The display name of the list (case-insensitive)
 * @returns {Promise<string|null>} The list ID, or null if not found
 */
export async function getListIdByName(name) {
  if (!listCache) {
    listCache = await getTaskLists();
  }
  const found = listCache.find(
    (l) => l.displayName.toLowerCase() === name.toLowerCase()
  );
  return found ? found.id : null;
}

/**
 * Creates a task in Microsoft To Do.
 * @param {object} params
 * @param {string} params.title
 * @param {Date|null} params.dueDate
 * @param {Date|null} params.reminderDate
 * @param {string|null} params.listId - explicit list ID; falls back to config.todo.listId
 */
export async function createTask({ title, dueDate, reminderDate, listId }) {
  const client = createGraphClient();
  const resolvedListId = listId || config.todo.listId;
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
      .api(`/me/todo/lists/${resolvedListId}/tasks`)
      .post(task);
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

/**
 * Lists all To Do task lists.
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
 * Gets tasks from a specific list.
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
