# Detailed Setup Guide for Microsoft To Do Assistant Bot

This guide will walk you through every step needed to get your bot up and running.

## Step 1: Create a Telegram Bot (5 minutes)

1. Open Telegram and search for **@BotFather**
2. Start a chat and send: `/newbot`
3. Choose a name for your bot (e.g., "My ToDo Assistant")
4. Choose a username (must end in 'bot', e.g., "mytodo_assistant_bot")
5. **Save the bot token** - it looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Send `/setcommands` to BotFather
7. Select your bot
8. Paste these commands:
```
start - Start the bot and see welcome message
help - Show help and usage examples
lists - Show all your To Do lists
tasks - Show recent tasks
```

## Step 2: Create Azure AD Application (10 minutes)

### 2.1 Create the Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. In the search bar, type "Azure Active Directory" and select it
4. In the left menu, click **App registrations**
5. Click **+ New registration**
6. Fill in the form:
   - **Name**: `ToDo Assistant Bot`
   - **Supported account types**: Select "Accounts in this organizational directory only"
   - **Redirect URI**: Leave empty
7. Click **Register**
8. **Copy and save**:
   - **Application (client) ID** (e.g., `12345678-1234-1234-1234-123456789abc`)
   - **Directory (tenant) ID** (e.g., `87654321-4321-4321-4321-abcdefghijkl`)

### 2.2 Create a Client Secret

1. In your app, click **Certificates & secrets** in the left menu
2. Under "Client secrets", click **+ New client secret**
3. Add a description: "ToDo Bot Secret"
4. Choose expiration: "24 months" (or your preference)
5. Click **Add**
6. **IMMEDIATELY copy and save the Value** (it looks like a long random string)
   - ⚠️ You can only see this once! If you miss it, you'll need to create a new secret

### 2.3 Add API Permissions

1. Click **API permissions** in the left menu
2. Click **+ Add a permission**
3. Choose **Microsoft Graph**
4. Click **Application permissions**
5. Search for "Tasks" and expand it
6. Check **Tasks.ReadWrite**
7. Click **Add permissions**
8. **Important**: Click **Grant admin consent for [Your Organization]**
9. Click **Yes** to confirm
10. Wait until the status shows green checkmarks

## Step 3: Get Your To Do List ID (5 minutes)

### Method 1: Using Microsoft Graph Explorer (Recommended)

1. Go to [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Click **Sign in** and use your Microsoft account
3. In the query box, paste:
   ```
   https://graph.microsoft.com/v1.0/me/todo/lists
   ```
4. Click **Run query**
5. In the response, find your list (usually called "Tasks")
6. Copy the **id** field (looks like: `AAMkAGI...`)

### Method 2: Using the Bot (After Initial Setup)

1. Set `TODO_LIST_ID` to any value temporarily (e.g., "temp")
2. Start the bot
3. Send `/lists` command
4. Copy the correct list ID from the response
5. Update your `.env` file with the correct ID

## Step 4: Install and Configure the Bot (10 minutes)

### 4.1 Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/vicxyz1/todo-assistant.git
cd todo-assistant
```

### 4.2 Install Node.js Dependencies

```bash
# Install all required packages
npm install
```

### 4.3 Create Environment File

```bash
# Copy the example file
cp .env.example .env
```

### 4.4 Edit the .env File

Open `.env` in your favorite text editor and fill in your values:

```env
# Your Telegram bot token from Step 1
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Azure credentials from Step 2
AZURE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
AZURE_CLIENT_SECRET=your_long_secret_value_here
AZURE_TENANT_ID=87654321-4321-4321-4321-abcdefghijkl

# Your To Do list ID from Step 3
TODO_LIST_ID=AAMkAGI1234567890ABCDEFG...

# Your timezone (optional)
TIMEZONE=Europe/Bucharest
```

### 4.5 Test the Bot

```bash
# Start the bot
npm start
```

You should see:
```
🚀 Starting Microsoft To Do Assistant Bot...
✓ Configuration validated
✓ Bot initialized

🤖 Bot is running! Send messages to create tasks.
Press Ctrl+C to stop.
```

### 4.6 Test in Telegram

1. Open Telegram and find your bot (search for the username you created)
2. Send `/start`
3. Try creating a task: "tomorrow at 10AM buy groceries"
4. Check your Microsoft To Do app - the task should appear!

## Step 5: Deploy to Production (Optional)

### Option A: Run on Your VPS

If you have a VPS (like Contabo), use PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start src/index.js --name todo-assistant

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
# Follow the instructions shown

# View logs
pm2 logs todo-assistant

# Restart the bot
pm2 restart todo-assistant

# Stop the bot
pm2 stop todo-assistant
```

### Option B: Run with Docker

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the bot
docker-compose down

# Restart the bot
docker-compose restart
```

## Troubleshooting Common Issues

### Issue: "Missing required environment variables"

**Solution**: Check that your `.env` file exists and contains all required variables:
- TELEGRAM_BOT_TOKEN
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET
- AZURE_TENANT_ID
- TODO_LIST_ID

### Issue: "Failed to create task: Unauthorized"

**Solutions**:
1. Verify your Azure credentials are correct in `.env`
2. Check that you granted admin consent for API permissions
3. Wait a few minutes after granting consent (can take time to propagate)
4. Make sure Tasks.ReadWrite permission is added

### Issue: "Bot doesn't respond in Telegram"

**Solutions**:
1. Check that the bot is running (`npm start` should show no errors)
2. Verify the Telegram bot token is correct
3. Make sure you've started a conversation with the bot (send `/start`)
4. Check the console for error messages

### Issue: "Task created but with wrong timezone"

**Solution**: Set the correct TIMEZONE in your `.env` file:
```env
TIMEZONE=Europe/Bucharest  # or your timezone
```

Find your timezone: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Issue: "Dates not parsing correctly"

**Solutions**:
1. Try different date formats (see examples in README)
2. Be more specific: "tomorrow at 10AM" instead of "tomorrow morning"
3. Check that your timezone is set correctly

## Updating the Bot

To update to the latest version:

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Restart the bot
# If using PM2:
pm2 restart todo-assistant

# If using Docker:
docker-compose down
docker-compose up -d --build
```

## Security Best Practices

1. **Never commit your `.env` file** to git (it's already in .gitignore)
2. **Keep your bot token secret** - don't share it publicly
3. **Rotate your Azure client secret** periodically
4. **Use a private Telegram bot** - don't share the bot with untrusted users
5. **Run the bot on a secure server** with proper firewall rules

## Getting Help

If you're stuck:

1. Check the [README.md](README.md) for common questions
2. Review the error messages in the console
3. Verify all credentials are correct
4. Create an issue on GitHub with:
   - Error message (remove any sensitive information)
   - Steps you've already tried
   - Your environment (OS, Node.js version)

## Next Steps

Once your bot is running:

1. **Explore commands**: Try `/lists` and `/tasks`
2. **Test natural language**: Try various date formats
3. **Set up reminders**: Use "remind me X before" patterns
4. **Customize**: Modify the code to fit your needs
5. **Share feedback**: Report bugs or suggest features on GitHub

## Success! 🎉

Your Microsoft To Do Assistant Bot is now running! You can create tasks from Telegram using natural language.

Enjoy your productivity boost! 🚀
