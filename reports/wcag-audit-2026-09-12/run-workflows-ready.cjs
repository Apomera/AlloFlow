const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'../..');
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
   return {title:document.title,url:location.href,viewport:{width:innerWidth,height:innerHeight},scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,bodyText:document.body.innerText.slice(0,2500),violations:axeResult.violations.map(compact),incomplete:axeResult.incomplete.map(compact),passes:axeResult.passes.map(v=>v.id),controls:[...document.querySelectorAll('button,input,select,textarea,a[href]')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,text:(e.innerText||'').slice(0,80),label:e.getAttribute('aria-label')})).slice(0,120)};
  });
  await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});
  results.states.push({name,...result});fs.writeFileSync(path.join(__dirname,'browser-workflows-ready.json'),JSON.stringify(results,null,2));console.log(name+': '+result.violations.length+' axe rules; width '+result.scrollWidth+'/'+result.clientWidth);
 }
 try{
  for(const route of ['/app/']){
   await page.setViewportSize({width:1280,height:800});await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(4500);
   if(route==='/app/')await page.waitForFunction(()=>{const l=document.querySelector('#alloflow-loader');return document.querySelector('#root')?.children.length>0&&(!l||getComputedStyle(l).display==='none');},{timeout:45000});
   const id=route==='/app/'?'app':route.includes('catalog')?'catalog':'video-studio';
   const initialBackend=page.getByRole('button',{name:'AI Backend Settings',exact:true});
   await initialBackend.focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);await audit('backend-initial-1280');
   results.backendKeyboard=[];
   for(let i=0;i<45;i++){results.backendKeyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,name:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText?.slice(0,70),inDialog:!!document.activeElement.closest('[role=dialog],[role=alertdialog]')})));await page.keyboard.press('Tab');}
   await page.keyboard.press('Escape');await page.waitForTimeout(300);results.backendAfterEscape=await page.evaluate(()=>({dialogCount:document.querySelectorAll('[role=dialog]').length,focus:document.activeElement.getAttribute('aria-label')}));
   await page.locator('button').filter({hasText:'Full Platform'}).first().click();
   await page.getByRole('button',{name:'Teacher',exact:true}).click();
   await page.waitForTimeout(15000);
   await page.getByRole('button',{name:'College',exact:true}).hover();
   await page.waitForTimeout(2000);
   await audit('teacher-workspace-1280');
   const backend=page.getByRole('button',{name:'AI Backend Settings',exact:true});
   if(await backend.count()){
    await backend.focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);await audit('backend-dialog-1280');
    results.dialogKeyboard=[];
    for(let i=0;i<35;i++){results.dialogKeyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,name:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText?.slice(0,100),inDialog:!!document.activeElement.closest('[role=dialog],[role=alertdialog]')})));await page.keyboard.press('Tab');}
    await page.keyboard.press('Escape');await page.waitForTimeout(300);results.dialogAfterEscape=await page.evaluate(()=>({remaining:document.querySelectorAll('[role=dialog]').length,focus:document.activeElement.getAttribute('aria-label')}));
   }
   await audit('teacher-workspace-after-dialog');
   if(route==='/app/'){
    const focus=[];await page.keyboard.press('Tab');for(let i=0;i<20;i++){focus.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:(document.activeElement.innerText||'').slice(0,100),label:document.activeElement.getAttribute('aria-label'),outline:getComputedStyle(document.activeElement).outline})));await page.keyboard.press('Tab');}results.initialKeyboardSample=focus;
   }
   await page.setViewportSize({width:320,height:800});await audit('teacher-workspace-320');
   await page.addStyleTag({content:'* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p {margin-bottom:2em!important}'});await audit('teacher-workspace-320-spacing');
  }
 }catch(e){results.error=e.stack;console.error(e.stack);process.exitCode=1;}
 results.blockedOrigins=[...blocked];results.pageErrors=errors;results.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'browser-workflows-ready.json'),JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));
})();


