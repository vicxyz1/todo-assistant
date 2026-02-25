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
 * Creates a task in Microsoft To Do
 */
export async function createTask({ title, dueDate, reminderDate }) {
  const client = createGraphClient();
  const task = { title };

  if (dueDate) {
    task.dueDateTime = {
      dateTime: dueDate.toISOString().split('.')[0],
      timeZone: config.timezone,
    };
  }

  if (reminderDate) {
    task.isReminderOn = true;
    task.reminderDateTime = {
      dateTime: reminderDate.toISOString().split('.')[0],
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
