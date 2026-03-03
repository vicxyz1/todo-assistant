import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { parseTaskWithAI } from './aiParser.js';
import { formatDate, formatDateOnly } from './dateParser.js';
import { createTask, getTaskLists, getTasks } from './todoClient.js';

/**
 * Returns true if the message sender is in the allowed list.
 * If ALLOWED_TELEGRAM_IDS is empty, all users are allowed.
 */
function isAuthorized(msg) {
  const allowedIds = config.telegram.allowedIds;
  if (!allowedIds || allowedIds.length === 0) return true;
  return allowedIds.includes(msg.from.id);
}

export function createBot() {
  const bot = new TelegramBot(config.telegram.botToken, { polling: true });

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
      bot.sendMessage(chatId, '🚫 Sorry, you are not authorized to use this bot.');
      return;
    }
    const welcomeMessage = `
👋 Welcome to Microsoft To Do Assistant!

I use AI to understand your tasks. Just send a message like:

• "Party tomorrow at 7PM" → task due tomorrow, reminder at 7PM
• "Dentist March 15 at 9AM, remind me 30 min before" → reminder at 8:30AM
• "Buy groceries Friday"
• "Call client next Monday at 3PM"

Commands:
/help - Show this help message
/lists - Show your To Do lists
/tasks - Show recent tasks
    `.trim();
    bot.sendMessage(chatId, welcomeMessage);
  });

  // Handle /help command
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
      bot.sendMessage(chatId, '🚫 Sorry, you are not authorized to use this bot.');
      return;
    }
    const helpMessage = `
📝 How to use:

Send any message describing your task. The AI will extract:
  📅 Due date (date only — MS Todo doesn't support time on due dates)
  ⏰ Reminder (with time)

Examples:
• "Party tomorrow at 7 evening"
   → Due: tomorrow | Reminder: tomorrow at 7:00 PM

• "Dentist March 15 at 9AM, remind me 30 min before"
   → Due: March 15 | Reminder: March 15 at 8:30 AM

• "Submit report next Monday"
   → Due: next Monday | No reminder

• "Call John in 2 hours"
   → Due: today | Reminder: in 2 hours

Commands:
/lists - Show your To Do lists
/tasks - Show recent tasks (last 10)
/help  - Show this help
    `.trim();
    bot.sendMessage(chatId, helpMessage);
  });

  // Handle /lists command
  bot.onText(/\/lists/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
      bot.sendMessage(chatId, '🚫 Sorry, you are not authorized to use this bot.');
      return;
    }
    try {
      bot.sendMessage(chatId, '🔄 Fetching your To Do lists...');
      const lists = await getTaskLists();
      if (lists.length === 0) {
        bot.sendMessage(chatId, '📋 No lists found.');
        return;
      }
      let message = '📋 Your To Do Lists:\n\n';
      lists.forEach((list, index) => {
        const isDefault = list.id === config.todo.listId ? ' ✓' : '';
        message += `${index + 1}. ${list.displayName}${isDefault}\n`;
      });
      message += '\n✓ = Currently configured list';
      bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error fetching lists:', error);
      bot.sendMessage(chatId, '❌ Failed to fetch lists. Please check your configuration.');
    }
  });

  // Handle /tasks command
  bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;
    if (!isAuthorized(msg)) {
      bot.sendMessage(chatId, '🚫 Sorry, you are not authorized to use this bot.');
      return;
    }
    try {
      bot.sendMessage(chatId, '🔄 Fetching recent tasks...');
      const tasks = await getTasks();
      if (tasks.length === 0) {
        bot.sendMessage(chatId, '✅ No tasks found. Your list is empty!');
        return;
      }
      let message = '📝 Recent Tasks:\n\n';
      tasks.slice(0, 10).forEach((task, index) => {
        const status = task.status === 'completed' ? '✅' : '⏳';
        const title = task.title || 'Untitled';
        message += `${status} ${index + 1}. ${title}\n`;
        if (task.dueDateTime) {
          // dueDateTime from MS Graph has no meaningful time — show date only
          const dueDate = new Date(task.dueDateTime.dateTime);
          message += `   📅 Due: ${formatDateOnly(dueDate)}\n`;
        }
      });
      bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      bot.sendMessage(chatId, '❌ Failed to fetch tasks. Please check your configuration.');
    }
  });

  // Handle regular messages (task creation)
  bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text.trim() === '') return;

    if (!isAuthorized(msg)) {
      bot.sendMessage(chatId, '🚫 Sorry, you are not authorized to use this bot.');
      return;
    }

    try {
      await bot.sendMessage(chatId, '🤖 Parsing with AI...');

      const taskData = await parseTaskWithAI(text);

      // Build confirmation message
      let confirmMessage = `📝 Creating task:\n\n`;
      confirmMessage += `Title: ${taskData.title}\n`;

      if (taskData.dueDate) {
        // Due date: show date only (MS Todo doesn't support time on due dates)
        confirmMessage += `📅 Due: ${formatDateOnly(taskData.dueDate)}\n`;
      }

      if (taskData.reminderDate) {
        // Reminder: show full date + time
        confirmMessage += `⏰ Reminder: ${formatDate(taskData.reminderDate)}\n`;
      }

      await bot.sendMessage(chatId, confirmMessage);

      const createdTask = await createTask(taskData);

      await bot.sendMessage(
        chatId,
        `✅ Task created successfully!\n\nTask ID: ${createdTask.id}`
      );
    } catch (error) {
      console.error('Error processing message:', error);
      bot.sendMessage(
        chatId,
        `❌ Failed to create task: ${error.message}\n\nPlease try again or use /help for examples.`
      );
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
  });

  return bot;
}
