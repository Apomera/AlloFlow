// Axe WCAG 2.2 A/AA sweep of standalone product HTML pages at 1280px and 320px.
// Pages are served from the repository; all other origins are blocked.
// Usage: node run-pages.cjs [listFile] [--out name.json]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {TAGS}=require('./lib-preview.cjs');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2);
const listFile=args.find(a=>!a.startsWith('--')&&a.endsWith('.txt'));
const outName=(args[args.indexOf('--out')+1]&&args.includes('--out'))?args[args.indexOf('--out')+1]:'pages.json';
const pages=listFile?fs.readFileSync(listFile,'utf8').trim().split(/\r?\n/):require('./page-list.json');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
(async()=>{
 const server=http.createServer((req,res)=>{let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/,'');}catch{res.writeHead(400).end();return;}let f=path.resolve(root,p);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:fs.existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined});
 const axeSrc=fs.readFileSync(path.join(root,'node_modules/axe-core/axe.min.js'),'utf8');
 const results=[];
 for(const rel of pages){
  for(const width of [1280,320]){
   const ctx=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block',bypassCSP:true});
   await ctx.route('**/*',r=>{const u=new URL(r.request().url());return (u.origin===origin||u.protocol==='data:'||u.protocol==='blob:')?r.continue():r.abort();});
   const page=await ctx.newPage();const entry={page:rel,width};
   try{
    await page.goto(origin+'/'+rel.split('/').map(encodeURIComponent).join('/'),{waitUntil:'load',timeout:30000});
    await page.waitForTimeout(600);
    await page.addScriptTag({content:axeSrc});
    Object.assign(entry,await page.evaluate(async TAGS=>{const a=await axe.run(document,{runOnly:{type:'tag',values:TAGS}});return{violations:a.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target.join(' '),html:n.html.slice(0,240),summary:(n.failureSummary||'').slice(0,300)}))})),incomplete:a.incomplete.map(v=>v.id),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,lang:document.documentElement.lang,title:document.title};},TAGS));
   }catch(e){entry.error=String(e.message).slice(0,300);}
   results.push(entry);await ctx.close();
   const v=(entry.violations||[]).map(x=>x.id+':'+x.nodes.length).join(',');
   if(v||entry.error||(entry.scrollWidth>entry.clientWidth))console.log(width,rel,v,entry.error||'',entry.scrollWidth>entry.clientWidth?'OVERFLOW '+entry.scrollWidth:'');
  }
 }
 fs.writeFileSync(path.join(__dirname,outName),JSON.stringify({generatedAt:new Date().toISOString(),browser:browser.version(),axe:require('axe-core/package.json').version,results},null,1));
 const bad=results.filter(r=>r.error||(r.violations||[]).length||r.scrollWidth>r.clientWidth);
 console.log('pages',pages.length,'states',results.length,'states with findings',bad.length);
 await browser.close();server.close();
})();
