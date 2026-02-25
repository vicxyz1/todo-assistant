import { validateConfig } from './config.js';
import { createBot } from './bot.js';

function main() {
  console.log('🚀 Starting Microsoft To Do Assistant Bot...');

  try {
    // Validate configuration
    validateConfig();
    console.log('✓ Configuration validated');

    // Create and start the bot
    const bot = createBot();
    console.log('✓ Bot initialized');
    console.log('\n🤖 Bot is running! Send messages to create tasks.');
    console.log('Press Ctrl+C to stop.\n');
  } catch (error) {
    console.error('❌ Error starting bot:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down bot...');
  process.exit(0);
});

main();
