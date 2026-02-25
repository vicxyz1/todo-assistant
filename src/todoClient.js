import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { config } from './config.js';

/**
 * Creates and returns authenticated Microsoft Graph client
 */
export function createGraphClient() {
  const credential = new ClientSecretCredential(
    config.azure.tenantId,
    config.azure.clientId,
    config.azure.clientSecret
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  return Client.initWithMiddleware({
    authProvider,
  });
}

/**
 * Creates a task in Microsoft To Do
 * @param {Object} taskData - Task information
 * @param {string} taskData.title - Task title
 * @param {Date} taskData.dueDate - Due date/time
 * @param {Date} taskData.reminderDate - Reminder date/time
 * @returns {Promise<Object>} Created task
 */
export async function createTask({ title, dueDate, reminderDate }) {
  const client = createGraphClient();

  const task = {
    title,
  };

  // Add due date if provided
  if (dueDate) {
    task.dueDateTime = {
      dateTime: dueDate.toISOString().split('.')[0], // Remove milliseconds
      timeZone: config.timezone,
    };
  }

  // Add reminder if provided
  if (reminderDate) {
    task.isReminderOn = true;
    task.reminderDateTime = {
      dateTime: reminderDate.toISOString().split('.')[0],
      timeZone: config.timezone,
    };
  }

  try {
    const createdTask = await client
      .api(`/me/todo/lists/${config.todo.listId}/tasks`)
      .post(task);

    return createdTask;
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

/**
 * Lists all To Do task lists
 * @returns {Promise<Array>} Array of task lists
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
 * @param {string} listId - Task list ID
 * @returns {Promise<Array>} Array of tasks
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
