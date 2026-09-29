// Local-only preview; serves just the fixture and its two runtime modules.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 3187);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Supply a valid local port.');
const preview = '/reports/universe-flight-2026-09-29/preview.html';
const routes = new Map([
  [preview, 'text/html; charset=utf-8'],
  ['/stem_lab/stem_tool_universe.js', 'text/javascript; charset=utf-8'],
  ['/stem_lab/universe_flight_scene.js', 'text/javascript; charset=utf-8'],
]);
if (!fs.existsSync(path.join(root, preview))) throw new Error('Build the preview first: node dev-tools/universe_flight_browser.cjs');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') {
    response.writeHead(302, { Location: preview + '#universe-flight' });
    response.end();
    return;
  }
  if (!routes.has(pathname) || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404); response.end('Not found'); return;
  }
  fs.readFile(path.join(root, pathname), (error, contents) => {
    if (error) { response.writeHead(404); response.end('Preview file unavailable'); return; }
    response.writeHead(200, { 'Content-Type': routes.get(pathname), 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
});
server.listen(port, '127.0.0.1', () => console.log('Universe preview: http://127.0.0.1:' + port + preview + '#universe-flight'));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
