// Serve only the standalone evaluation demo and its documented public assets.
// No district repository, Google account, email, or Drive connection is provided.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.EVALUATION_DEMO_PORT || 8768);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid demo port');
const files = new Set([
  'educator-evaluation.html', 'educator_evaluation_standalone.js',
  'educator-evaluation-manual.html',
  ...['Code.gs', 'README.md', 'Index.html', 'appsscript.json'].map(name => 'apps_script/educator_evaluation_share/' + name),
]);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
  if (!['127.0.0.1:' + port, 'localhost:' + port].includes(request.headers.host)) { response.writeHead(403); response.end(); return; }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    let name = new URL(request.url, 'http://127.0.0.1:' + port).pathname.slice(1);
    if (!name || name === 'educator-evaluation') name = 'educator-evaluation.html';
    if (name === 'educator-evaluation-manual') name += '.html';
    const manualImage = /^educator-evaluation-manual-assets\/[A-Za-z0-9_-]+\.(jpg|png)$/.test(name);
    if (!files.has(name) && !manualImage) { response.writeHead(404); response.end(); return; }
    const body = await fs.readFile(path.join(root, name));
    response.writeHead(200, { 'Content-Type': types[path.extname(name)] || 'text/plain; charset=utf-8', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(port, '127.0.0.1', () => console.log('Educator evaluation local demo: http://127.0.0.1:' + port + '/ — choose fictional practice for demonstrations.'));
