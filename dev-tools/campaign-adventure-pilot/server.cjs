const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {root, build, verifyPreservation} = require('./build.cjs');
function createServer({testing = false} = {}) {
  const mappings = new Map([
    ['/vendor/react.js', path.join(root,'desktop/web-app/node_modules/react/umd/react.production.min.js')],
    ['/original/adventure.js', path.join(root,'adventure_module.js')],
    ['/original/tree.js', path.join(root,'stem_lab/stem_tool_treelab.js')]
  ]);
  if(testing)mappings.set('/vendor/axe.js',require.resolve('axe-core'));
  const allowed = new Set(['index.html','styles.css','standalone.mjs','app.mjs','core.mjs','adapters.mjs','watershed-source.mjs','scene-art.mjs']);
  return http.createServer((req,res)=>{
    if(req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);res.end();return;}
    let pathname;
    try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);} catch {res.writeHead(400);res.end();return;}
    const name=pathname==='/'?'index.html':pathname.slice(1);
    const file=mappings.get(pathname)||(allowed.has(name)?path.join(__dirname,name):null);
    if(!file||!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
    const ext=path.extname(file);
    res.writeHead(200, {
      'Content-Type':ext==='.html'?'text/html; charset=utf-8':ext==='.css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8',
      'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
      'Referrer-Policy':'no-referrer'
    });
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}
if(require.main===module) {
  build(true);verifyPreservation();
  const port=Number(process.env.PILOT_PORT||4387);
  createServer().listen(port,'127.0.0.1',()=>console.log('Campaign pilot: http://127.0.0.1:'+port+'/'));
}
module.exports={createServer};
