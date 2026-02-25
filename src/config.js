import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
  },
  todo: {
    listId: process.env.TODO_LIST_ID,
  },
  timezone: process.env.TIMEZONE || 'Europe/Bucharest',
};

export function validateConfig() {
  const required = [
    'TELEGRAM_BOT_TOKEN',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID',
    'TODO_LIST_ID',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please copy .env.example to .env and fill in your credentials.'
    );
  }
}
