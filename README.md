# Microsoft To Do Assistant Bot 🤖

A Telegram bot that adds tasks to Microsoft To Do using natural language. Simply send messages like "tomorrow at 10AM go to bank, remind me 15 min before" and the bot will create the task with the correct due date and reminder.

## Features ✨

- **Natural Language Processing**: Uses [chrono-node](https://github.com/wanasit/chrono) to parse dates and times from natural language
- **Automatic Task Creation**: Creates tasks in your Microsoft To Do list
- **Due Date Support**: Automatically extracts and sets due dates
- **Reminder Support**: Parses reminder times (e.g., "remind me 15 minutes before")
- **Multiple Commands**: View lists, recent tasks, and get help

## Natural Language Examples 💬

The bot understands various date/time formats:

- "tomorrow at 10AM go to bank"
- "remind me 15 minutes before"
- "next Monday at 3pm call client"
- "in 2 hours submit report"
- "Friday buy groceries"
- "on December 25 send Christmas cards"
- "next week review proposal"

## Prerequisites 📋

1. **Node.js** (v18 or higher)
2. **Telegram Bot Token** (from [@BotFather](https://t.me/botfather))
3. **Microsoft Azure AD Application** (for Microsoft Graph API access)
4. **Microsoft To Do account**

## Setup Instructions 🚀

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Save the bot token (you'll need it later)

### 2. Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
   - Name: `ToDo Assistant Bot`
   - Supported account types: `Accounts in this organizational directory only`
   - Click **Register**
4. Note down the **Application (client) ID** and **Directory (tenant) ID**
5. Go to **Certificates & secrets**
   - Click **New client secret**
   - Add description and expiration
   - **Copy the secret value immediately** (it won't be shown again)
6. Go to **API permissions**
   - Click **Add a permission**
   - Choose **Microsoft Graph**
   - Select **Application permissions**
   - Add these permissions:
     - `Tasks.ReadWrite`
   - Click **Grant admin consent**

### 3. Get Your To Do List ID

You can find your list ID by:

**Option A: Using Microsoft Graph Explorer**
1. Go to [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in with your Microsoft account
3. Run this query: `GET https://graph.microsoft.com/v1.0/me/todo/lists`
4. Copy the `id` of the list you want to use

**Option B: Using the bot's /lists command**
1. Set up the bot with a temporary list ID (any value)
2. Run the bot and use `/lists` command
3. Copy the correct list ID and update your `.env` file

### 4. Install and Configure

1. Clone the repository:
```bash
git clone https://github.com/vicxyz1/todo-assistant.git
cd todo-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in your credentials:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
AZURE_CLIENT_ID=your_azure_client_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_azure_tenant_id
TODO_LIST_ID=your_todo_list_id
TIMEZONE=Europe/Bucharest
```

5. Run the bot:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage 📱

### Commands

- `/start` - Welcome message and introduction
- `/help` - Show help and examples
- `/lists` - Show all your To Do lists
- `/tasks` - Show recent tasks (last 10)

### Creating Tasks

Just send a message with your task and optional date/time:

**Simple task:**
```
Buy milk
```

**Task with due date:**
```
tomorrow at 10AM go to bank
```

**Task with reminder:**
```
Friday at 2pm dentist appointment, remind me 30 minutes before
```

**Task with relative time:**
```
in 3 hours call John
```

## Project Structure 📁

```
todo-assistant/
├── src/
│   ├── index.js          # Main entry point
│   ├── bot.js            # Telegram bot handlers
│   ├── config.js         # Configuration management
│   ├── dateParser.js     # Natural language date parsing
│   └── todoClient.js     # Microsoft Graph API client
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## How It Works 🔧

1. **User sends message** via Telegram
2. **chrono-node parses** the natural language date/time
3. **Task is created** with:
   - Title (text with dates removed)
   - Due date/time (if found)
   - Reminder (if "remind me X before" pattern found)
4. **Microsoft Graph API** creates the task in your To Do list
5. **Confirmation** is sent back to the user

## Troubleshooting 🔍

### Bot doesn't respond
- Check if the bot is running (`npm start`)
- Verify your Telegram bot token is correct
- Ensure you've started a chat with your bot

### "Failed to create task" error
- Verify Azure credentials are correct
- Check if API permissions are granted (admin consent)
- Ensure the TODO_LIST_ID is correct
- Check if the Azure app has `Tasks.ReadWrite` permission

### Dates not parsing correctly
- Try different date formats (see examples above)
- Check your TIMEZONE setting in `.env`
- The bot uses your configured timezone for parsing

### Getting List ID
- Run the bot with any TODO_LIST_ID
- Use `/lists` command to see all your lists
- Copy the correct ID and update `.env`

## Deployment Options 🌐

### Run on VPS (Contabo, DigitalOcean, etc.)

```bash
# Install PM2 for process management
npm install -g pm2

# Start the bot
pm2 start src/index.js --name todo-assistant

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Run with Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t todo-assistant .
docker run -d --env-file .env todo-assistant
```

## Contributing 🤝

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## License 📄

MIT License - feel free to use this project for personal or commercial purposes.

## Author ✍️

Vicentiu Costache ([@vicxyz1](https://github.com/vicxyz1))

## Acknowledgments 🙏

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram Bot API wrapper
- [chrono-node](https://github.com/wanasit/chrono) - Natural language date parser
- [Microsoft Graph SDK](https://github.com/microsoftgraph/msgraph-sdk-javascript) - Microsoft Graph API client
- [Azure Identity](https://github.com/Azure/azure-sdk-for-js) - Azure authentication

## Support ☕

If you find this project helpful, consider giving it a ⭐ on GitHub!
