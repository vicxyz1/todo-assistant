/**
 * One-time authentication script.
 * Run: npm run auth
 *
 * Prerequisites:
 *   1. ngrok must be running and forwarding to port 3000
 *   2. OAUTH_REDIRECT_URI in .env must match ngrok URL + /auth/callback
 *   3. That redirect URI must be registered in Azure Portal
 *
 * After success, .tokens.json is saved — the bot reuses it automatically.
 */
import { validateConfig } from './config.js';
import { runAuthFlow } from './oauthServer.js';
import { getTaskLists } from './todoClient.js';

validateConfig();

try {
  await runAuthFlow();

  console.log('\n✅ Tokens saved. Testing connection...');
  const lists = await getTaskLists();

  console.log(`\n📋 Found ${lists.length} To Do list(s):`);
  lists.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.displayName}`);
    console.log(`     ID: ${l.id}`);
  });
  console.log('\n👉 Copy the list ID above into TODO_LIST_ID in your .env');
  console.log('   Then run: npm start\n');
} catch (err) {
  console.error('\n❌ Auth failed:', err.message);
  process.exit(1);
}
