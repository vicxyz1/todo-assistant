/**
 * Tiny HTTP server that handles the OAuth2 callback from Microsoft.
 * Run ONCE via `npm run auth`, open the printed URL in your browser,
 * sign in — tokens are saved to disk and reused by the bot forever.
 *
 * Correct sequence:
 *   1. npm run auth               (Terminal 1, keep running)
 *   2. Open printed URL in browser, sign in
 *   3. Wait for "Auth complete!" in terminal
 *   4. Ctrl+C, then: npm start
 */
import http from 'http';
import { URL } from 'url';
import { config } from './config.js';
import { saveTokens } from './tokenStore.js';

const PORT = 3000;
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
    code,
    redirect_uri:  config.azure.redirectUri,
    grant_type:    'authorization_code',
  });

  // Only include client_secret if it exists (Web apps need it, Public clients don't)
  if (config.azure.clientSecret) {
    body.append('client_secret', config.azure.clientSecret);
  }

  console.log('Exchanging code with token URL:', config.azure.tokenUrl);
  console.log('Using redirect_uri:', config.azure.redirectUri);

  const res = await fetch(config.azure.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (data.error) {
    console.error('Token error response:', JSON.stringify(data, null, 2));
    throw new Error(`${data.error}: ${data.error_description}`);
  }
  return data;
}

// Send response and wait for it to fully flush before resolving
function sendAndClose(res, server, statusCode, body, onFlushed) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body, 'utf8', () => {
    server.close(() => onFlushed());
  });
}

export async function runAuthFlow() {
  const state = Math.random().toString(36).slice(2);
  const authUrl = buildAuthUrl(state);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      console.log(`→ Request: ${req.method} ${url.pathname}${url.search ? '?...' : ''}`);

      if (!url.pathname.startsWith('/auth/callback')) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OAuth callback server running...');
        return;
      }

      const code  = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        const desc = url.searchParams.get('error_description') || '';
        console.error(`❌ Microsoft error: ${error} - ${desc}`);
        sendAndClose(res, server, 400,
          `<h2>Auth failed: ${error}</h2><p>${desc}</p>`,
          () => reject(new Error(`${error}: ${desc}`))
        );
        return;
      }

      if (!code) {
        console.error('❌ No code in callback');
        sendAndClose(res, server, 400,
          '<h2>No authorization code received.</h2>',
          () => reject(new Error('No authorization code in callback'))
        );
        return;
      }

      try {
        console.log('✓ Code received! Exchanging for tokens...');
        const tokenData = await exchangeCode(code);

        const tokens = {
          access_token:  tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at:    Date.now() + tokenData.expires_in * 1000,
        };
        saveTokens(tokens);
        console.log('✓ Tokens saved to disk.');
        console.log('✅ Auth complete! You can close the browser tab.');

        sendAndClose(res, server, 200,
          '<h1>&#x2705; Authentication successful!</h1><p>You can close this tab and go back to the terminal.</p>',
          () => resolve(tokens)
        );
      } catch (err) {
        console.error('❌ Token exchange failed:', err.message);
        sendAndClose(res, server, 500,
          `<h2>Token exchange error</h2><pre>${err.message}</pre>`,
          () => reject(err)
        );
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error('Try: kill $(lsof -t -i:3000)\n');
      } else {
        console.error('Server error:', err.message);
      }
      reject(err);
    });

    server.listen(PORT, HOST, () => {
      console.log('\n============================================================');
      console.log('🔐  Microsoft OAuth2 - One-time Authentication');
      console.log('============================================================');
      console.log(`✓ Listening on ${HOST}:${PORT}`);
      console.log(`✓ Redirect URI: ${config.azure.redirectUri}`);
      console.log(`✓ Auth URL built for client: ${config.azure.clientId}`);
      console.log(`\nOpen this URL in your browser:\n`);
      console.log(`  ${authUrl}`);
      console.log(`\nKeep this terminal open and sign in. Waiting for callback...\n`);
    });
  });
}
