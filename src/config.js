import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    // Personal Microsoft accounts must use the /consumers endpoint
    // (AZURE_TENANT_ID is not needed for personal accounts)
    tenantId: 'consumers',
  },
  todo: {
    listId: process.env.TODO_LIST_ID,
  },
  timezone: process.env.TIMEZONE || 'Europe/Bucharest',
  tokenCachePath: process.env.TOKEN_CACHE_PATH || './.token-cache.json',
};

export function validateConfig() {
  const required = ['TELEGRAM_BOT_TOKEN', 'AZURE_CLIENT_ID', 'TODO_LIST_ID'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and fill in your credentials.'
    );
  }
}
