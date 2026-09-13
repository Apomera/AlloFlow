// Local preview of the Kitchen Lab studio and its bundled 3D runtime.
// Run: node dev-tools/kitchen_studio_preview.cjs
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = ['stem_lab/kitchen_studio/', 'vendor/three-r128/'];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, ''); }
  catch { res.writeHead(400).end(); return; }
  if (!pathname) { res.writeHead(302, { Location: '/stem_lab/kitchen_studio/index.html' }).end(); return; }
  const file = path.resolve(root, pathname);
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (!allowed.some(prefix => relative.startsWith(prefix))) { res.writeHead(404).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
});
server.listen(0, '127.0.0.1', () => console.log(`Kitchen Studio preview: http://127.0.0.1:${server.address().port}/stem_lab/kitchen_studio/index.html`));
