'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CDN_ORIGIN = 'https://alloflow-cdn.pages.dev';
const SCRIPT_NAME = /^[a-z0-9_-][a-z0-9._-]*\.(?:js|mjs)$/i;

function requestAction(value, targetOrigin) {
  let url;
  try { url = new URL(value); } catch { return { kind: 'abort' }; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return { kind: 'abort' };
  if (url.origin === targetOrigin) return { kind: 'continue' };
  if (url.origin === CDN_ORIGIN) return { kind: 'local', pathname: url.pathname };
  return { kind: 'abort' };
}

function localModule(repoRoot, pathname) {
  let name;
  try { name = path.posix.basename(decodeURIComponent(pathname)); } catch { return null; }
  // Preserve the existing basename lookup and precedence, but only for script
  // assets. A page must never turn the CDN override into an arbitrary file read.
  if (!SCRIPT_NAME.test(name)) return null;
  const root = fs.realpathSync(repoRoot);
  for (const dir of ['stem_lab', '.', 'desktop/web-app/public']) {
    try {
      const parent = fs.realpathSync(path.join(root, dir));
      const relative = path.relative(root, parent);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) continue;
      const file = fs.realpathSync(path.join(parent, name));
      // Resolve links before checking both directory and filename: a .js link
      // must not expose a private file or a dotfile in the same directory.
      if (path.dirname(file) !== parent || !SCRIPT_NAME.test(path.basename(file)) || !fs.statSync(file).isFile()) continue;
      return fs.readFileSync(file);
    } catch { /* Missing/unreadable local assets stay blocked. */ }
  }
  return null;
}

async function handleRequest(req, { targetOrigin, repoRoot }) {
  try {
    if (req.isInterceptResolutionHandled()) return;
    const action = requestAction(req.url(), targetOrigin);
    if (action.kind === 'continue') { await req.continue(); return; }
    if (action.kind === 'local') {
      const body = localModule(repoRoot, action.pathname);
      if (body !== null) {
        await req.respond({ status: 200, contentType: 'text/javascript', body });
        return;
      }
    }
    await req.abort();
  } catch {
    // Interception operations return promises. Handle rejection after page
    // shutdown and fail closed if the request can still be resolved.
    try { if (!req.isInterceptResolutionHandled()) await req.abort(); } catch { /* Page closed. */ }
  }
}

function launchOptions(env = process.env) {
  return { headless: true, args: env.ALLOFLOW_AUDIT_NO_SANDBOX === '1'
    ? ['--no-sandbox', '--disable-setuid-sandbox'] : [] };
}

module.exports = { CDN_ORIGIN, requestAction, localModule, handleRequest, launchOptions };
