// serve.cjs - SPIKE. Static server for trying index.html in YOUR browser: node serve.cjs  ->  http://127.0.0.1:8099/
// (WebCodecs needs a secure context; localhost counts, file:// does not reliably.)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.webm': 'video/webm', '.png': 'image/png', '.wav': 'audio/wav', '.mp4': 'video/mp4' };
http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = path.normalize(path.join(__dirname, p === '/' ? 'index.html' : p));
  if (!f.startsWith(__dirname) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(8099, '127.0.0.1', () => console.log('http://127.0.0.1:8099/  (Ctrl+C to stop)'));
