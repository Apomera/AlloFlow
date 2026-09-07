// Runs the real AlloFlow React entry with local public modules. Loopback only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module');
const {root}=require('./build.cjs');
const web=path.join(root,'desktop/web-app'),out=path.join(__dirname,'local-app');
async function buildPreview(){
  fs.mkdirSync(out,{recursive:true});
  await require('esbuild').build({
    entryPoints:[path.join(web,'src/index.js')],bundle:true,outfile:path.join(out,'app.js'),
    platform:'browser',format:'iife',target:'es2020',loader:{'.js':'jsx'},
    define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},
    logLevel:'warning'
  });
  // Use the app's existing compiled Tailwind sheet; the pilot bundles its own
  // scoped CSS. Avoid rescanning every unrelated vendored plugin for a preview.
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'app/asset-manifest.json'),'utf8'));
  const compiledCss=path.join(root,'app',manifest.files['main.css'].replace(/^\//,''));
  const currentCss=fs.readFileSync(path.join(web,'src/index.css'),'utf8').replace(/^@tailwind .*;\r?\n/gm,'');
  fs.writeFileSync(path.join(out,'app.css'),fs.readFileSync(compiledCss,'utf8')+'\n'+currentCss);
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlloFlow · Local app preview</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script defer src="/app.js"></script></body></html>');
  console.log('Real AlloFlow app compiled from desktop/web-app/src/index.js.');
}
function createAppServer(){
  const publicRoot=path.join(web,'public');
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.wasm':'application/wasm'};
  return http.createServer((req,res)=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);res.end();return;}
    const base=['index.html','app.js','app.css'].includes(name)?out:publicRoot;
    const file=path.resolve(base,name);
    if(!file.startsWith(base+path.sep)||name.split(/[\\/]/).some(p=>p.startsWith('.'))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}
if(require.main===module)(async()=>{
  if(!process.argv.includes('--serve-only'))await buildPreview();
  if(!process.argv.includes('--build-only'))createAppServer().listen(3000,'127.0.0.1',()=>console.log('AlloFlow app: http://127.0.0.1:3000/'));
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={buildPreview,createAppServer};
