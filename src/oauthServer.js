/**
 * Tiny HTTP server that handles the OAuth2 callback from Microsoft.
 * Run ONCE via `npm run auth`, open the printed URL in your browser,
 * sign in — tokens are saved to disk and reused by the bot forever.
 *
 * IMPORTANT - Correct sequence:
 *   1. ngrok http 3000            (keep running in Terminal 1)
 *   2. npm run auth               (run in Terminal 2, keep it running!)
 *   3. Open the printed URL in browser, sign in
 *   4. Wait for "Authentication successful" in terminal
 *   5. npm start                  (Terminal 2, AFTER auth completes)
 */
import http from 'http';
import { URL } from 'url';
import { config } from './config.js';
import { saveTokens } from './tokenStore.js';

const PORT = 3000;
// Bind to 0.0.0.0 so ngrok can reach it in WSL2 (IPv4 + IPv6)
const HOST = '0.0.0.0';

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id:     config.azure.clientId,
    response_type: 'code',
    redirect_uri:  config.azure.redirectUri,
    response_mode: 'query',
    scope:         config.azure.scopes,
    state,
  });
  return `${config.azure.authorizeUrl}?${params}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id:     config.azure.clientId,
    client_secret: config.azure.clientSecret,
    code,
    redirect_uri:  config.azure.redirectUri,
    grant_type:    'authorization_code',
  });

  const res = await fetch(config.azure.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description}`);
  return data;
}

export async function runAuthFlow() {
  const state = Math.random().toString(36).slice(2);
  const authUrl = buildAuthUrl(state);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      console.log(`→ Incoming request: ${req.method} ${url.pathname}`);

      try {
        // Only handle the /auth/callback path
        if (!url.pathname.startsWith('/auth/callback')) {
          res.writeHead(200);
          res.end('OAuth server running. Waiting for callback...');
          return;
        }

        const code  = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400);
          res.end(`<h2>Auth failed: ${error}</h2><p>${url.searchParams.get('error_description') || ''}</p>`);
          server.close();
          reject(new Error(error));
          return;
        }

        if (!code) {
          res.writeHead(400);
          res.end('<h2>No code received from Microsoft.</h2>');
          server.close();
          reject(new Error('No authorization code in callback'));
          return;
        }

        console.log('\n✓ Callback received! Exchanging code for tokens...');
        const tokenData = await exchangeCode(code);

        const tokens = {
          access_token:  tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at:    Date.now() + tokenData.expires_in * 1000,
        };
        saveTokens(tokens);
        console.log('✓ Tokens saved to disk.');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h2>&#x2705; Authentication successful! You can close this tab and go back to the terminal.</h2>');
        server.close();
        resolve(tokens);
      } catch (err) {
        console.error('Callback error:', err.message);
        res.writeHead(500);
        res.end(`<h2>Error: ${err.message}</h2>`);
        server.close();
        reject(err);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error('   Stop any running processes (npm start, etc.) then retry.\n');
      } else {
        console.error('Server error:', err.message);
      }
      reject(err);
    });

    // Explicitly bind to 0.0.0.0 to work with ngrok on WSL2
    server.listen(PORT, HOST, () => {
      console.log('\n============================================================');
      console.log('🔐  Microsoft OAuth2 - One-time Authentication');
      console.log('============================================================');
      console.log(`✓ Server listening on ${HOST}:${PORT}`);
      console.log(`✓ Redirect URI: ${config.azure.redirectUri}`);
      console.log(`\nOpen this URL in your browser:\n`);
      console.log(`  ${authUrl}\n`);
      console.log('Waiting for Microsoft to redirect back... (keep this terminal open!)\n');
    });
  });
}
