import { Client } from '@microsoft/microsoft-graph-client';
import { DeviceCodeCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { config } from './config.js';

// Singleton credential — persists token in memory across requests.
// On first use it prints a device code URL; afterwards it silently refreshes.
let _credential = null;

function getCredential() {
  if (!_credential) {
    _credential = new DeviceCodeCredential({
      clientId: config.azure.clientId,
      tenantId: config.azure.tenantId, // 'consumers' for personal accounts
      userPromptCallback: (info) => {
        console.log('\n============================================================');
        console.log('🔐 Microsoft Authentication Required (one-time)');
        console.log('============================================================');
        console.log(info.message);
        console.log('============================================================\n');
      },
    });
  }
  return _credential;
}

function createGraphClient() {
  const authProvider = new TokenCredentialAuthenticationProvider(getCredential(), {
    scopes: ['https://graph.microsoft.com/Tasks.ReadWrite'],
  });

  return Client.initWithMiddleware({ authProvider });
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
