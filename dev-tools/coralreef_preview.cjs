#!/usr/bin/env node
'use strict';

// Local coral preview: node dev-tools/coralreef_preview.cjs [--port 8767]
// CORALREEF_PREVIEW_PORT also sets the port. Open /?section=explore&theme=dark.
// Refresh after editing: each HTML response hashes the current source files.
// The actual browser delivery policy enforces those hashes on lazy companions.
// Only the coral tool and its explicitly listed browser assets are served.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = fs.realpathSync(path.resolve(__dirname, '..'));
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--port')) {
  console.error('Usage: node dev-tools/coralreef_preview.cjs [--port 8767]');
  process.exit(1);
}
const portText = args[1] || process.env.CORALREEF_PREVIEW_PORT || '8767';
if (!/^[0-9]{1,5}$/.test(portText) || +portText < 1 || +portText > 65535) {
  console.error('The preview port must be an integer from 1 to 65535.');
  process.exit(1);
}
const port = +portText;
const scripts = [
  'desktop/web-app/node_modules/react/umd/react.development.js',
  'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
  'vendor/three-r128/three.min.js',
  'stem_lab/stem_tool_coralreef.js',
  'stem_lab/reef_3d_species.js',
  'stem_lab/reef_3d_explore.js',
  'stem_lab/reef_3d_habitat.js',
  'stem_lab/reef_3d_engine.js'
];
const allowedScripts = new Set(scripts.map(name => '/' + name));
const thumbnail = /^\/stem_lab\/assets\/coralreef\/species\/[a-z0-9_]+\.webp$/;

function sourceFile(name) {
  const file = fs.realpathSync(path.resolve(root, name));
  const relative = path.relative(root, file);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error('Asset is outside the preview workspace.');
  }
  return file;
}

function previewHtml() {
  const assets = Object.fromEntries(scripts.map(name => {
    const bytes = fs.readFileSync(sourceFile(name));
    return [name, { bytes: bytes.length, integrity: 'sha384-' + crypto.createHash('sha384').update(bytes).digest('base64') }];
  }));
  const manifest = {
    schemaVersion: 1,
    releaseId: crypto.createHash('sha256').update(JSON.stringify(assets)).digest('hex'),
    fallbackCommit: null,
    allowDesktopRemoteFallback: false,
    assets
  };
  const policy = fs.readFileSync(sourceFile('browser_delivery_policy.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  const script = name => `<script src="/${name}" integrity="${assets[name].integrity}" crossorigin="anonymous"></script>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Coral Reef Survey Lab | Local preview</title>
<style>body{margin:0;background:#e9f0f0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#root{max-width:1440px;margin:0 auto}button,input,select{font:inherit}*{box-sizing:border-box}</style>
<script>
var _alloBrowserDeliveryManifest = ${JSON.stringify(manifest)};
${policy}
window.__alloConfigureTrustedScript = _alloConfigureBrowserDeliveryScript;
</script>
${script(scripts[0])}
${script(scripts[1])}
${script(scripts[2])}
</head><body><main id="root"></main>
<script>
window.StemLab = {
  _registry: {},
  isRegistered: function(id) { return !!this._registry[id]; },
  registerTool: function(id, config) { this._registry[id] = config; },
  ensureThree: function() { return Promise.resolve(window.THREE); }
};
</script>
${script('stem_lab/stem_tool_coralreef.js')}
<script>
function Shell() {
  var params = new URLSearchParams(location.search);
  var state = React.useState({ coralReef: { section: params.get('section') || 'explore' } });
  window.previewState = state[0]; window.previewSet = state[1];
  return StemLab._registry.coralReef.render({
    React: React, toolData: state[0], setToolData: state[1],
    t: function(key, fallback) { return fallback || key; },
    theme: params.get('theme') === 'dark' ? 'dark' : 'light', embedded: true,
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  });
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Shell));
</script></body></html>`;
}

function respond(req, res, code, type, content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content || '');
  res.writeHead(code, {
    'Content-Type': type,
    'Content-Length': bytes.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(req.method === 'HEAD' ? undefined : bytes);
}

const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    respond(req, res, 405, 'text/plain; charset=utf-8', 'Method not allowed.'); return;
  }
  if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) {
    respond(req, res, 403, 'text/plain; charset=utf-8', 'Local preview only.'); return;
  }
  let pathname;
  try {
    // Validate before URL normalization could erase traversal segments.
    pathname = decodeURIComponent((req.url || '').split(/[?#]/, 1)[0]);
    if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\x00-\x20\x7f]/.test(pathname)
      || pathname.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('Invalid request path.');
  } catch (_) {
    respond(req, res, 400, 'text/plain; charset=utf-8', 'Invalid request path.'); return;
  }
  try {
    if (pathname === '/' || pathname === '/preview') {
      respond(req, res, 200, 'text/html; charset=utf-8', previewHtml()); return;
    }
    if (!allowedScripts.has(pathname) && !thumbnail.test(pathname)) {
      respond(req, res, 404, 'text/plain; charset=utf-8', 'Not found.'); return;
    }
    const bytes = fs.readFileSync(sourceFile(pathname.slice(1)));
    respond(req, res, 200, pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'image/webp', bytes);
  } catch (error) {
    const missing = error && error.code === 'ENOENT';
    respond(req, res, missing ? 404 : 500, 'text/plain; charset=utf-8', missing ? 'Not found.' : 'Preview asset unavailable.');
  }
});
server.on('error', error => { console.error('Coral reef preview could not start: ' + error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Coral reef preview: http://127.0.0.1:${port}/?section=explore`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
