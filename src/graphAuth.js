/**
 * Returns a valid access token, refreshing it automatically when expired.
 * Uses stored tokens from disk; run `npm run auth` once to get the initial token.
 */
import { config } from './config.js';
import { loadTokens, saveTokens, clearTokens } from './tokenStore.js';

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id:     config.azure.clientId,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    scope:         config.azure.scopes,
  });

  // Only include client_secret if it exists (public clients don't use it)
  if (config.azure.clientSecret) {
    body.append('client_secret', config.azure.clientSecret);
  }

  const res = await globalThis.fetch(config.azure.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}: ${data.error_description}`);
  return data;
}

export async function getAccessToken() {
  let tokens = loadTokens();

  if (!tokens) {
    throw new Error(
      'Not authenticated. Run `npm run auth` first to sign in with your Microsoft account.'
    );
  }

  // Refresh if expired (with 60s buffer)
  if (Date.now() >= tokens.expires_at - 60_000) {
    console.log('Access token expired, refreshing...');
    try {
      const newTokenData = await refreshAccessToken(tokens.refresh_token);
      tokens = {
        access_token:  newTokenData.access_token,
        refresh_token: newTokenData.refresh_token ?? tokens.refresh_token,
        expires_at:    Date.now() + newTokenData.expires_in * 1000,
      };
      saveTokens(tokens);
    } catch (err) {
      clearTokens();
      throw new Error(`${err.message}\nPlease re-run \`npm run auth\` to re-authenticate.`);
    }
  }

  return tokens.access_token;
}
