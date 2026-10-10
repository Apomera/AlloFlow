const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const scripts = [
  'desktop/web-app/node_modules/react/umd/react.development.js',
  'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
  'text_pipeline_helpers_module.js', 'ai_backend_module.js',
  'stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js',
  'own_sources_module.js', 'content_engine_module.js', 'view_misc_panels_module.js'
];
const cssDir = 'desktop/web-app/public/app/static/css';
const cssName = fs.readdirSync(path.join(root, cssDir)).find(name => /^main\.[^.]+\.css$/.test(name));
const icons = require('esbuild').buildSync({
  stdin: { contents: "import * as Icons from 'lucide-react'; window.AlloIcons = Icons;", resolveDir: path.join(root, 'desktop/web-app') },
  alias: { react: path.join(__dirname, 'react-host.cjs') }, bundle: true, format: 'iife', write: false
}).outputFiles[0].text;
const routes = new Map(scripts.map((file, index) => ['/asset/' + index + '.js', { file: path.join(root, file), type: 'text/javascript' }]));
routes.set('/style.css', { file: path.join(root, cssDir, cssName), type: 'text/css' });
routes.set('/fixture.js', { file: path.join(__dirname, 'fixture.js'), type: 'text/javascript' });
routes.set('/icons.js', { text: icons, type: 'text/javascript' });
routes.set('/strings.js', { text: 'window.fixtureStrings=' + fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8') + ';', type: 'text/javascript' });
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Research quality preview</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div>' + scripts.map((file, index) => '<script src="/asset/' + index + '.js"></script>').join('') + '<script src="/icons.js"></script><script src="/strings.js"></script><script src="/fixture.js"></script></body></html>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); return; }
  const asset = routes.get(pathname);
  if (!asset) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': asset.type + '; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(asset.file ? fs.readFileSync(asset.file) : asset.text);
});
server.listen(Number(process.env.RESEARCH_PREVIEW_PORT || 0), '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port;
  fs.writeFileSync(path.join(__dirname, 'preview.json'), JSON.stringify({ pid: process.pid, url }, null, 2) + '\n');
  console.log(url);
});
