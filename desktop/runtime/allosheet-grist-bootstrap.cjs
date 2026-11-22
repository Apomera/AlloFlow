'use strict';

const path = require('node:path');

const AUTH_MESSAGE_TYPE = 'alloflow-allosheet-grist-auth-v1';
const ELECTRON_KEY_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
let capturedKeyForScrub = '';

function fail(message) {
  throw new Error(`AlloSheet Grist bootstrap: ${message}`);
}

function validateServerEntrypoint(raw) {
  const entrypoint = String(raw || '');
  if (!entrypoint || entrypoint.includes('\0')) {
    fail('the pinned server entrypoint is missing.');
  }
  if (!path.isAbsolute(entrypoint)) {
    fail('the pinned server entrypoint must be an absolute path.');
  }
  const normalized = path.normalize(entrypoint);
  if (normalized !== entrypoint || !normalized.toLowerCase().endsWith('.js')) {
    fail('the pinned server entrypoint must be a normalized .js path.');
  }
  const asarMarker = `${path.sep}app.asar${path.sep}`;
  if (!normalized.toLowerCase().includes(asarMarker)) {
    fail('the pinned server entrypoint must reside inside app.asar.');
  }
  return normalized;
}

function validateLoopbackHomeUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ''));
  } catch (_) {
    fail('APP_HOME_URL is missing or invalid.');
  }
  if (parsed.protocol !== 'http:' || parsed.username || parsed.password) {
    fail('APP_HOME_URL must be an unauthenticated loopback http URL.');
  }
  const host = String(parsed.hostname || '').toLowerCase();
  if (host !== '127.0.0.1' && host !== 'localhost') {
    fail('APP_HOME_URL must target loopback.');
  }
  return parsed;
}

function scrubCredentialText(text) {
  let out = String(text || '');
  out = out.replace(/electron_key=[^&\s'"]+/gi, 'electron_key=[REDACTED]');
  if (capturedKeyForScrub && out.includes(capturedKeyForScrub)) {
    out = out.split(capturedKeyForScrub).join('[REDACTED]');
  }
  return out;
}

async function main() {
  const serverEntrypoint = validateServerEntrypoint(process.env.ALLOFLOW_GRIST_SERVER_ENTRYPOINT);
  if (typeof process.send !== 'function') fail('a private parent IPC channel is required.');
  const homeUrl = validateLoopbackHomeUrl(process.env.APP_HOME_URL);

  // This is Grist Desktop's native strict-mode credential. Instantiating the
  // singleton here guarantees that the server and the parent receive the same
  // in-memory key without placing it in argv, an environment variable, a URL,
  // stdout, or a renderer-visible response.
  const { ElectronLoginSystem } = require('app/electron/LoginSystem');
  const loginSystem = ElectronLoginSystem.instance;
  const authenticatedUrl = loginSystem.authenticateURL(homeUrl);
  const electronKey = String(authenticatedUrl.searchParams.get('electron_key') || '');
  if (!ELECTRON_KEY_PATTERN.test(electronKey)) {
    fail('Grist did not provide a valid strict-mode credential.');
  }
  capturedKeyForScrub = electronKey;

  // Install IPC failure handling before sending the secret. The channel stays
  // open for the lifetime of Grist, so a parent crash also closes the child.
  process.once('disconnect', () => process.exit(0));
  process.once('error', () => process.exit(1));
  await new Promise((resolve, reject) => {
    try {
      process.send({
        type: AUTH_MESSAGE_TYPE,
        version: 1,
        electronKey,
      }, (error) => error ? reject(error) : resolve());
    } catch (error) {
      reject(error);
    }
  });

  const server = require(serverEntrypoint);
  if (!server || typeof server.main !== 'function') {
    fail('the pinned server module does not export main().');
  }
  await server.main();
}

main().catch((error) => {
  // The credential is never interpolated into errors or logs.
  const raw = error && error.stack ? error.stack : String(error);
  console.error(scrubCredentialText(raw));
  process.exit(1);
});

