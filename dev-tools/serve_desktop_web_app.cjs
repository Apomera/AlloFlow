#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..', 'desktop', 'web-app', 'public');
const port = Number(process.argv[2] || 8765);
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function insideRoot(candidate) {
  const relative = path.relative(root, candidate);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidates = [];
  if (!decoded || decoded === 'app') candidates.push(path.join(root, 'app', 'index.html'));
  else {
    candidates.push(path.join(root, decoded));
    // The production desktop runtime serves root modules to /app/*.js. A
    // generic static server does not, which silently sends local QA to the
    // remote CDN fallback instead of the files being tested.
    if (decoded.startsWith('app/')) candidates.push(path.join(root, decoded.slice(4)));
  }
  for (let candidate of candidates) {
    if (!insideRoot(candidate)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) candidate = path.join(candidate, 'index.html');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

http.createServer((request, response) => {
  let pathname;
  try { pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname; }
  catch (_) { response.writeHead(400).end('Bad request'); return; }
  const file = resolveRequest(pathname);
  if (!file) { response.writeHead(404).end('Not found'); return; }
  response.writeHead(200, {
    'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Desktop web app: http://127.0.0.1:${port}/app/`);
});
