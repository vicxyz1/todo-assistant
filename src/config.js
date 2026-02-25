import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    // clientSecret is OPTIONAL - only needed for 'Web' platform type
    // For 'Mobile and desktop applications', leave it empty
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    // Personal Microsoft accounts MUST use /consumers
    authorizeUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
    tokenUrl:     'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    scopes: 'Tasks.ReadWrite offline_access',
    redirectUri: process.env.OAUTH_REDIRECT_URI,
  },
  todo: {
    listId: process.env.TODO_LIST_ID,
  },
  timezone: process.env.TIMEZONE || 'Europe/Bucharest',
  tokenStorePath: process.env.TOKEN_STORE_PATH || './.tokens.json',
};

export function validateConfig() {
  const required = [
    'TELEGRAM_BOT_TOKEN',
    'AZURE_CLIENT_ID',
    'OAUTH_REDIRECT_URI',
    'TODO_LIST_ID',
  ];
  // Note: AZURE_CLIENT_SECRET is now optional
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in your credentials.'
    );
  }
}
