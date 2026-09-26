// Shared development-preview harness: bundles the generated App.jsx with esbuild,
// serves canonical local modules, maps the module CDN to local files and blocks
// every other origin. Evidence from this preview is not a hosted-release claim.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'scratch/wcag-2026-09-26-preview');
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.wasm':'application/wasm'};
function resolveFile(urlPath){const clean=decodeURIComponent(urlPath).replace(/^\/+/,'')||'index.html';for(const base of [out,root,path.join(root,'desktop/web-app/public')]){const f=path.resolve(base,clean);if(f.startsWith(base+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())return f;}}
async function buildPreview(){
 fs.mkdirSync(out,{recursive:true});
 await require('esbuild').build({entryPoints:[path.join(root,'desktop/web-app/src/index.js')],bundle:true,outfile:path.join(out,'app.js'),platform:'browser',format:'iife',target:'es2020',loader:{'.js':'jsx'},define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},logLevel:'warning'});
 const cssDir=path.join(root,'app/static/css');
 const css=fs.readFileSync(path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\.[a-z0-9]+\.css$/i.test(f))),'utf8');
 fs.writeFileSync(path.join(out,'app.css'),css+'\n'+fs.readFileSync(path.join(root,'desktop/web-app/src/index.css'),'utf8').replace(/^@tailwind .*;\r?\n/gm,''));
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlloFlow accessibility preview</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script defer src="/app.js"></script></body></html>');
}
async function start({viewport={width:1280,height:800},colorScheme='light'}={}){
 const server=http.createServer((req,res)=>{let f;try{f=resolveFile(new URL(req.url,'http://localhost').pathname);}catch{}if(!f){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined});
 const context=await browser.newContext({viewport,colorScheme,serviceWorkers:'block'});
 const blocked=new Set();
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.hostname==='alloflow-cdn.pages.dev'||u.hostname==='raw.githubusercontent.com'||u.hostname==='cdn.jsdelivr.net'&&u.pathname.includes('/Apomera/')){const p=u.pathname.replace(/^\/Apomera\/AlloFlow(@[^/]+)?\//,'/').replace(/^\/gh\/Apomera\/AlloFlow(@[^/]+)?\//,'/').replace(/^\/main\//,'/');const f=resolveFile(p);if(f)return route.fulfill({path:f,contentType:mime[path.extname(f)]||'application/octet-stream'});}if(['data:','blob:'].includes(u.protocol))return route.continue();blocked.add(u.origin);return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function stop(){await context.close();await browser.close();await new Promise(r=>server.close(r));}
 return {origin,browser,context,page,errors,blocked,stop};
}
const TAGS=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa'];
async function axe(page,selector){
 if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
 return page.evaluate(async({selector,TAGS})=>{const ctx=selector?document.querySelector(selector):document;const a=await axe.run(ctx||document,{runOnly:{type:'tag',values:TAGS}});const slim=v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,html:n.html.slice(0,300),summary:n.failureSummary&&n.failureSummary.slice(0,400)}))});return{violations:a.violations.map(slim),incomplete:a.incomplete.map(v=>({id:v.id,count:v.nodes.length})),width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};},{selector,TAGS});
}
async function enterTeacher(page,origin){
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('button').filter({hasText:'Full Platform'}).first().click();
 await page.locator('button[data-help-key="role_teacher"]').click();
 await page.getByRole('button',{name:'Skip',exact:true}).click();
 await page.locator('#tour-input-panel').waitFor({state:'visible',timeout:180000});
}
module.exports={root,out,buildPreview,start,axe,enterTeacher,TAGS};
