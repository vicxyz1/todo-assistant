/**
 * Tiny HTTP server that handles the OAuth2 callback from Microsoft.
 * Start this ONCE via `npm run auth`, open the printed URL in your browser,
 * sign in — tokens are saved to disk and reused forever.
 */
import http from 'http';
import { URL } from 'url';
import fetch from 'node:http';
import { config } from './config.js';
import { saveTokens } from './tokenStore.js';

const PORT = 3000;

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

  const res = await globalThis.fetch(config.azure.tokenUrl, {
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

  console.log('\n============================================================');
  console.log('🔐  Microsoft OAuth2 - One-time Authentication');
  console.log('============================================================');
  console.log(`\nOpen this URL in your browser:\n\n  ${authUrl}\n`);
  console.log('Waiting for callback on port', PORT, '...');
  console.log('(ngrok must be forwarding to this port)\n');

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (!url.pathname.startsWith('/auth/callback')) {
          res.end('Not found'); return;
        }

        const code  = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.end(`<h2>Auth failed: ${error}</h2>`);
          server.close();
          reject(new Error(error));
          return;
        }

        const tokenData = await exchangeCode(code);
        const tokens = {
          access_token:  tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at:    Date.now() + tokenData.expires_in * 1000,
        };
        saveTokens(tokens);

        res.end('<h2>✅ Authentication successful! You can close this tab.</h2>');
        server.close();
        resolve(tokens);
      } catch (err) {
        res.end(`<h2>Error: ${err.message}</h2>`);
        server.close();
        reject(err);
      }
    });

    server.listen(PORT);
  });
}
