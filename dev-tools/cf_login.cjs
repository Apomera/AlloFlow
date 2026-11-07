// Browser sign-in to Cloudflare, the same OAuth (PKCE) flow `wrangler login` uses,
// for a machine where wrangler cannot start (no win32-arm64 workerd build).
// Writes wrangler's own config file so dev-tools/cf_worker.cjs picks it up.
// Prints no tokens. Backs up the existing file first.
// Usage: node dev-tools/cf_login.cjs   (opens the browser; waits up to 5 minutes)
// Sign in as the Cloudflare user that owns the Worker (Aaron.pomeranz@maine.edu,
// account 37d398da...); a different login reaches a different account and 403s.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CLIENT_ID = '54d11594-84e4-41aa-b438-e81b8fa78ee7'; // wrangler's public OAuth client
const REDIRECT = 'http://localhost:8976/oauth/callback';
const SCOPES = ['account:read', 'user:read', 'workers:write', 'workers_kv:write', 'workers_scripts:write', 'offline_access'];
const FILE = path.join(process.env.APPDATA, 'xdg.config', '.wrangler', 'config', 'default.toml');

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const verifier = b64url(crypto.randomBytes(48));
const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
const state = b64url(crypto.randomBytes(16));
const authUrl = 'https://dash.cloudflare.com/oauth2/auth?' + new URLSearchParams({
  response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT, scope: SCOPES.join(' '),
  state, code_challenge: challenge, code_challenge_method: 'S256',
}).toString();

const timer = setTimeout(() => { console.log('Timed out after 5 minutes; nothing was changed.'); process.exit(2); }, 5 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8976');
  if (url.pathname !== '/oauth/callback') { res.writeHead(404); res.end(); return; }
  const done = (msg, code) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>Cloudflare sign-in</title><p style="font:16px system-ui;margin:40px">' + msg + '</p>');
    server.close(); clearTimeout(timer);
    setTimeout(() => process.exit(code), 200);
  };
  if (url.searchParams.get('state') !== state) return done('Sign-in did not match this request. Nothing was changed.', 1);
  if (url.searchParams.get('error')) return done('Cloudflare said: ' + url.searchParams.get('error') + '. Nothing was changed.', 1);
  try {
    const tokenRes = await fetch('https://dash.cloudflare.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'), client_id: CLIENT_ID, redirect_uri: REDIRECT, code_verifier: verifier }),
    });
    const text = await tokenRes.text();
    if (!tokenRes.ok) { console.log('Token exchange failed (' + tokenRes.status + '): ' + text.slice(0, 200)); return done('Token exchange failed. Nothing was changed.', 1); }
    const json = JSON.parse(text);
    const expires = new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString();
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    if (fs.existsSync(FILE)) fs.copyFileSync(FILE, FILE + '.before-relogin-2026-10-28');
    const toml = 'oauth_token = "' + json.access_token + '"\n' +
      'expiration_time = "' + expires + '"\n' +
      'refresh_token = "' + (json.refresh_token || '') + '"\n' +
      'scopes = [ ' + SCOPES.map((s) => '"' + s + '"').join(', ') + ' ]\n';
    fs.writeFileSync(FILE + '.tmp', toml);
    fs.renameSync(FILE + '.tmp', FILE);
    console.log('Signed in. Saved to ' + FILE + ' (previous copy kept as .before-relogin-2026-10-28).');
    done('Signed in. You can close this tab and return to Claude.', 0);
  } catch (e) {
    console.log('Error: ' + e.message);
    done('Something went wrong. Nothing was changed.', 1);
  }
});
server.on('error', (e) => { console.log('Could not listen on port 8976: ' + e.message); process.exit(1); });
server.listen(8976, '127.0.0.1', () => {
  console.log('Waiting for the browser sign-in (5 minutes)...');
  execFile('powershell', ['-NoProfile', '-Command', 'Start-Process', "'" + authUrl.replace(/'/g, "''") + "'"], () => {});
});
