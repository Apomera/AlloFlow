// Audit-only preview, reusing the existing reviewed local component harness.
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
process.chdir(root);
let source = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
source = source.replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
source += '\nglobalThis.auditHtml = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(source, sandbox);
const server = http.createServer((req, res) => {
  const theme = new URL(req.url, 'http://localhost').searchParams.get('theme') || 'default';
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(sandbox.globalThis.auditHtml({file: 'physics', id: 'physics'}, theme));
});
server.listen(0, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:' + server.address().port));
