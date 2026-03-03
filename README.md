# Microsoft To Do Assistant Bot 🤖

A Telegram bot that creates tasks in Microsoft To Do using **AI-powered natural language processing**. Simply send messages like "tomorrow at 10AM go to bank, remind me 15 min before" and the bot will create the task with the correct due date and reminder.

## Features ✨

- **AI-Powered NLP**: Uses [OpenRouter](https://openrouter.ai) to call LLMs (default: `openai/gpt-4o-mini`) for intelligent natural language parsing
- **Automatic Task Creation**: Creates tasks directly in your Microsoft To Do default list
- **Due Date Support**: AI extracts and resolves relative and absolute dates/times
- **Reminder Support**: AI understands reminder phrases like "remind me 15 minutes before"
- **Timezone Aware**: All dates resolved in your configured timezone
- **Multiple Commands**: View lists, recent tasks, and get help

## Natural Language Examples 💬

The bot understands a wide range of natural language inputs:

- `tomorrow at 10AM go to bank`
- `next Monday at 3pm call client, remind me 30 minutes before`
- `in 2 hours submit report`
- `Friday buy groceries`
- `on December 25 send Christmas cards`
- `next week review proposal`
- `dentist appointment March 15 at 9am, remind 1 hour before`

## How It Works 🔧

1. **User sends message** via Telegram
2. **OpenRouter AI** parses the natural language and extracts:
   - `title` — the task name (date/time references stripped)
   - `dueDate` — resolved ISO datetime, or null
   - `reminderDate` — calculated reminder datetime, or null
3. **Microsoft Graph API** creates the task in your To Do list
4. **Confirmation** is sent back to the user

## Prerequisites 📋

1. **Node.js** (v18 or higher)
2. **Telegram Bot Token** (from [@BotFather](https://t.me/botfather))
3. **Microsoft Azure AD Application** (for Microsoft Graph API access)
4. **Microsoft To Do account**
5. **OpenRouter API Key** (from [openrouter.ai/keys](https://openrouter.ai/keys))

## Setup Instructions 🚀

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Save the bot token

### 2. Create Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
   - Name: `ToDo Assistant Bot`
   - Supported account types: `Accounts in this organizational directory only`
   - Click **Register**
4. Note down the **Application (client) ID**
5. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated** → `Tasks.ReadWrite`
6. Click **Grant admin consent**

### 3. Get Your OpenRouter API Key

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create an account and generate an API key
3. Add it to your `.env` as `OPENROUTER_API_KEY`

### 4. Get Your To Do List ID

**Option A: Using Microsoft Graph Explorer**
1. Go to [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in and run: `GET https://graph.microsoft.com/v1.0/me/todo/lists`
3. Copy the `id` of the desired list

**Option B: Using the bot's /lists command**
1. Configure the bot and run it
2. Use `/lists` command to see all list IDs

### 5. Install and Configure

```bash
git clone https://github.com/vicxyz1/todo-assistant.git
cd todo-assistant
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Environment Variables ⚙️

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token from BotFather |
| `AZURE_CLIENT_ID` | ✅ | Azure AD app client ID |
| `OAUTH_REDIRECT_URI` | ✅ | OAuth callback URI (default: `http://localhost:3000/auth/callback`) |
| `TODO_LIST_ID` | ✅ | Target Microsoft To Do list ID |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for AI parsing |
| `OPENROUTER_MODEL` | ❌ | AI model to use (default: `openai/gpt-4o-mini`) |
| `AZURE_CLIENT_SECRET` | ❌ | Only needed for Web platform apps |
| `TIMEZONE` | ❌ | Timezone for date resolution (default: `Europe/Bucharest`) |
| `TOKEN_STORE_PATH` | ❌ | Path to store OAuth tokens (default: `./.tokens.json`) |

## Usage 📱

### Commands

- `/start` — Welcome message and introduction
- `/help` — Show help and examples
- `/lists` — Show all your To Do lists
- `/tasks` — Show recent tasks (last 10)

### Creating Tasks

Just send a natural language message:

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
│   ├── aiParser.js       # AI-powered NLP via OpenRouter
│   ├── dateParser.js     # Date formatting utilities
│   └── todoClient.js     # Microsoft Graph API client
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting 🔍

### Bot doesn't respond
- Check if the bot is running (`npm start`)
- Verify your Telegram bot token is correct

### "OPENROUTER_API_KEY is not configured" error
- Add `OPENROUTER_API_KEY` to your `.env` file
- Get a key from [openrouter.ai/keys](https://openrouter.ai/keys)

### "Failed to create task" error
- Verify Azure credentials and `TODO_LIST_ID`
- Check that `Tasks.ReadWrite` permission is granted in Azure

### Dates not parsed correctly
- Check your `TIMEZONE` setting in `.env`
- Try a different AI model via `OPENROUTER_MODEL` (e.g., `openai/gpt-4o`)

## Deployment Options 🌐

### Run with PM2

```bash
npm install -g pm2
pm2 start src/index.js --name todo-assistant
pm2 save && pm2 startup
```

### Run with Docker

```bash
docker build -t todo-assistant .
docker run -d --env-file .env todo-assistant
```

## Contributing 🤝

Contributions are welcome! Feel free to report bugs, suggest features, or submit pull requests.

## License 📄

MIT License

## Author ✍️

Vicentiu Costache ([@vicxyz1](https://github.com/vicxyz1))

## Acknowledgments 🙏

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) — Telegram Bot API wrapper
- [OpenRouter](https://openrouter.ai) — LLM API gateway for AI parsing
- [Microsoft Graph SDK](https://github.com/microsoftgraph/msgraph-sdk-javascript) — Microsoft Graph API client
- [chrono-node](https://github.com/wanasit/chrono) — Date formatting utilities
- [Azure Identity](https://github.com/Azure/azure-sdk-for-js) — Azure authentication

## Support ☕

If you find this project helpful, consider giving it a ⭐ on GitHub!
