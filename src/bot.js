import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { parseTaskWithAI } from './aiParser.js';
import { formatDate } from './dateParser.js';
import { createTask, getTaskLists, getTasks } from './todoClient.js';

export function createBot() {
  const bot = new TelegramBot(config.telegram.botToken, { polling: true });

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
👋 Welcome to Microsoft To Do Assistant!

I use AI to understand your tasks in natural language. Just send me a message like:

• "tomorrow at 10AM go to bank"
• "next Monday at 3pm call client, remind me 30 minutes before"
• "Friday buy groceries"
• "in 2 hours submit the report"
• "on March 15 dentist appointment at 9am, remind 1 hour before"

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
    const helpMessage = `
📝 How to use:

Just send me any message with a task and optional time:

Examples:
• "tomorrow at 10AM go to bank"
• "remind me 15 minutes before"
• "next Monday at 3pm call client"
• "in 2 hours submit report"
• "Friday buy groceries"
• "on December 25 send Christmas cards"

The bot will:
✓ Use AI to parse the task title
✓ Extract the due date/time
✓ Set reminders if specified
✓ Add it to your Microsoft To Do list

Commands:
/lists - Show your To Do lists
/tasks - Show recent tasks
/help - Show this help
    `.trim();

    bot.sendMessage(chatId, helpMessage);
  });

  // Handle /lists command
  bot.onText(/\/lists/, async (msg) => {
    const chatId = msg.chat.id;

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
      bot.sendMessage(
        chatId,
        '❌ Failed to fetch lists. Please check your configuration.'
      );
    }
  });

  // Handle /tasks command
  bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;

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
          const dueDate = new Date(task.dueDateTime.dateTime);
          message += `   📅 Due: ${formatDate(dueDate)}\n`;
        }
      });

      bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      bot.sendMessage(
        chatId,
        '❌ Failed to fetch tasks. Please check your configuration.'
      );
    }
  });

  // Handle regular messages (task creation)
  bot.on('message', async (msg) => {
    // Skip if it's a command
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.trim() === '') {
      return;
    }

    try {
      // Notify user that AI is processing the message
      await bot.sendMessage(chatId, '🤖 Parsing with AI...');

      // Parse the task from natural language using AI
      const taskData = await parseTaskWithAI(text);

      // Build confirmation message
      let confirmMessage = `📝 Creating task:\n\n`;
      confirmMessage += `Title: ${taskData.title}\n`;

      if (taskData.dueDate) {
        confirmMessage += `📅 Due: ${formatDate(taskData.dueDate)}\n`;
      }

      if (taskData.reminderDate) {
        confirmMessage += `⏰ Reminder: ${formatDate(taskData.reminderDate)}\n`;
      }

      await bot.sendMessage(chatId, confirmMessage);

      // Create the task in Microsoft To Do
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

  // Error handling
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
  });

  return bot;
}
