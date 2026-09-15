const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../../..');
const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
function resolveFile(urlPath){
 const clean=decodeURIComponent(urlPath).replace(/^\/+/, '');
 for(const base of [root,path.join(root,'desktop/web-app/public')]){
  for(const rel of [clean,clean.startsWith('app/')?clean.slice(4):clean]){
   let file=path.resolve(base,rel); if(!file.startsWith(base+path.sep)&&file!==base)continue;
   if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   if(fs.existsSync(file)&&fs.statSync(file).isFile())return file;
  }
 }
}
(async()=>{
 const server=http.createServer((req,res)=>{let f;try{f=resolveFile(new URL(req.url,'http://localhost').pathname);}catch{} if(!f){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const results={startedAt:new Date().toISOString(),browser:browser.version(),axe:require('axe-core/package.json').version,origin,method:'Local existing compiled shell and local canonical lazy modules; third-party requests blocked; fresh browser context; no authenticated or generated-content workflows',states:[]};
 const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 const blocked=new Set();
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin||u.protocol==='data:'||u.protocol==='blob:')return route.continue();if(u.hostname==='alloflow-cdn.pages.dev'){const f=resolveFile(u.pathname);if(f)return route.fulfill({path:f,contentType:mime[path.extname(f)]||'application/octet-stream'});}blocked.add(u.origin);return route.abort();});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function audit(name){
  await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
  const result=await page.evaluate(async()=>{
   const axeResult=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
   const compact=v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,tags:v.tags,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary,any:n.any,all:n.all,none:n.none}))});
   const measurements=[...document.querySelectorAll('#studioNextBtn,#startBtn,#demoPlanBtn,#demoPreflightList,header .links a')].map(e=>{const css=getComputedStyle(e),r=e.getBoundingClientRect();return {id:e.id,text:e.innerText,role:e.getAttribute('role'),name:e.getAttribute('aria-label'),color:css.color,background:css.backgroundColor,width:r.width,height:r.height}});return {measurements,title:document.title,url:location.href,viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,bodyText:document.body.innerText.slice(0,2500),violations:axeResult.violations.map(compact),incomplete:axeResult.incomplete.map(compact),passes:axeResult.passes.map(v=>v.id),controls:[...document.querySelectorAll('button,input,select,textarea,a[href]')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,text:(e.innerText||'').slice(0,80),label:e.getAttribute('aria-label')})).slice(0,120)};
  });
  await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});
  results.states.push({name,...result});fs.writeFileSync(path.join(__dirname,'browser-audit.json'),JSON.stringify(results,null,2));console.log(name+': '+result.violations.length+' axe rules; width '+result.scrollWidth+'/'+result.clientWidth);
 }

 try {
  await page.goto(origin+'/video_studio/video_studio.html',{waitUntil:'domcontentloaded'});
  function ratio(color,background){const lum=s=>{const a=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return a[0]*.2126+a[1]*.7152+a[2]*.0722};const a=lum(color),b=lum(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
  for(const id of ['studioNextBtn','startBtn','demoPlanBtn']){
   const button=page.locator('#'+id);
   for(const state of ['default','hover','focus']){
    await page.mouse.move(0,0);
    if(state==='hover')await button.hover();
    if(state==='focus')await button.focus();
    const style=await button.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor,outline:s.outline}});
    const contrast=ratio(style.color,style.background);results.states.push({id,state,...style,contrast,passed:contrast>=4.5});
   }
  }
  results.passed=results.states.length===9&&results.states.every(s=>s.passed);if(!results.passed)process.exitCode=1;
 }catch(e){results.error=e.stack;process.exitCode=1;}
 results.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'control-states.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.states));await browser.close();await new Promise(r=>server.close(r));
})();
