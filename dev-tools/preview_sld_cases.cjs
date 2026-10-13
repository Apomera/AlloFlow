'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {
  '/react.js': 'desktop/web-app/node_modules/react/umd/react.production.min.js',
  '/react-dom.js': 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  '/maine.js': 'maine_sld_practice_module.js'
};
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maine SLD Case Lab preview</title><div id="app"></div><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/maine.js"></script><script>ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(window.AlloModules.MaineSldPractice.MaineSldPracticePanel,{isOpen:true,deepLinkBase:location.origin+'/?tool=maine-sld-practice',theme:'light',t:function(){},initialCaseId:new URLSearchParams(location.search).get('case')||'alex',onClose:function(){location.href='/handouts/Choose-a-Case.html'}}));</script></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
  let file = files[url.pathname];
  if (url.pathname.startsWith('/handouts/')) {
    const name = decodeURIComponent(url.pathname.slice('/handouts/'.length));
    if (name && path.basename(name) === name && !name.includes('\\')) file = 'output/sld-case-handouts/' + name;
  }
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  const target = path.join(root, file);
  if (!fs.existsSync(target)) { res.writeHead(404); res.end('Not found'); return; }
  res.setHeader('Content-Type', ({'.js':'text/javascript', '.html':'text/html; charset=utf-8', '.pdf':'application/pdf', '.json':'application/json', '.zip':'application/zip'})[path.extname(target)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(target).pipe(res);
});
let port = 65212;
server.on('error', error => { if (error.code === 'EADDRINUSE' && port < 65230) server.listen(++port, '127.0.0.1'); else throw error; });
server.listen(port, '127.0.0.1', () => {
  fs.mkdirSync(path.join(root, '.tmp'), {recursive:true});
  fs.writeFileSync(path.join(root, '.tmp/sld-case-preview.json'), JSON.stringify({port, pid:process.pid, url:'http://127.0.0.1:'+port}));
});
