/**
 * Simple file-backed token store.
 * Persists { access_token, refresh_token, expires_at } to disk.
 */
import fs from 'fs';
import { config } from './config.js';

export function saveTokens(tokens) {
  fs.writeFileSync(config.tokenStorePath, JSON.stringify(tokens, null, 2), 'utf8');
}

export function loadTokens() {
  try {
    if (fs.existsSync(config.tokenStorePath)) {
      return JSON.parse(fs.readFileSync(config.tokenStorePath, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read token store:', e.message);
  }
  return null;
}

export function clearTokens() {
  try { fs.unlinkSync(config.tokenStorePath); } catch (_) {}
}
