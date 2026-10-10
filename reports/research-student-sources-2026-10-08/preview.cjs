const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const files = [
  'desktop/web-app/node_modules/react/umd/react.development.js',
  'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
  'desktop/web-app/node_modules/lucide-react/dist/umd/lucide-react.js',
  'text_pipeline_helpers_module.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'view_simplified_module.js'
];
const cssDir = 'desktop/web-app/public/app/static/css';
const cssName = fs.readdirSync(path.join(root, cssDir)).find(name => /^main\.[^.]+\.css$/.test(name));
const routes = new Map(files.map((file, index) => ['/asset/' + index + '.js', { file: path.join(root, file), type: 'text/javascript' }]));
routes.set('/style.css', { file: path.join(root, cssDir, cssName), type: 'text/css' });
routes.set('/fixture.js', { file: path.join(__dirname, 'fixture.js'), type: 'text/javascript' });
const scriptTags = files.map((file, index) => (index === 2 ? '<script>window.react=window.React;</script>' : '') + '<script src="/asset/' + index + '.js"></script>' + (index === 2 ? '<script>window.AlloIcons=window.LucideReact||window.lucideReact;</script>' : '')).join('');
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Student sources preview</title><link rel="stylesheet" href="/style.css"><style>body{margin:0;background:#f8fafc;color:#1e293b;font-family:Arial,sans-serif}#root{max-width:1050px;margin:0 auto;padding:16px}summary{overflow-wrap:anywhere}a,button,select{touch-action:manipulation}*{box-sizing:border-box}</style></head><body><div id="root"></div>' + scriptTags + '<script src="/fixture.js"></script></body></html>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); return; }
  const asset = routes.get(pathname);
  if (!asset) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': asset.type + '; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(asset.file));
});
server.listen(0, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port;
  fs.writeFileSync(path.join(__dirname, 'preview.json'), JSON.stringify({ pid: process.pid, url }, null, 2) + '\n');
  console.log(url);
});
