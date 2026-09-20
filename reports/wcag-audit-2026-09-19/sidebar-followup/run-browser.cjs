const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'scratch/wcag-sidebar-preview');
const results={startedAt:new Date().toISOString(),method:'Fresh esbuild development preview from generated current App.jsx with existing compiled Tailwind CSS and local canonical lazy modules; SidebarPanels network response held until explicitly released. No deployed release claim.',checks:[],states:[]};
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
function resolveFile(urlPath){const clean=decodeURIComponent(urlPath).replace(/^\/+/, '')||'index.html';for(const base of [out,root,path.join(root,'desktop/web-app/public')]){const f=path.resolve(base,clean);if(f.startsWith(base+path.sep)&&fs.existsSync(f)&&fs.statSync(f).isFile())return f;}}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await require('esbuild').build({entryPoints:[path.join(root,'desktop/web-app/src/index.js')],bundle:true,outfile:path.join(out,'app.js'),platform:'browser',format:'iife',target:'es2020',loader:{'.js':'jsx'},define:{'process.env':'{}','process.env.NODE_ENV':'"development"'},logLevel:'warning'});
 const cssDir=path.join(root,'app/static/css');
 const css=fs.readFileSync(path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\.[a-z0-9]+\.css$/i.test(f))),'utf8');
 fs.writeFileSync(path.join(out,'app.css'),css+'\n'+fs.readFileSync(path.join(root,'desktop/web-app/src/index.css'),'utf8').replace(/^@tailwind .*;\r?\n/gm,''));
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlloFlow accessibility preview</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script defer src="/app.js"></script></body></html>');
 const server=http.createServer((req,res)=>{let f;try{f=resolveFile(new URL(req.url,'http://localhost').pathname);}catch{}if(!f){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});results.browser=browser.version();results.axe=require('axe-core/package.json').version;
 const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
 let release;const held=new Promise(r=>{release=r;});let delayed=0;const blocked=new Set();
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('/view_sidebar_panels_module.js')){delayed++;await held;}if(u.origin===origin)return route.continue();if(u.hostname==='alloflow-cdn.pages.dev'){const f=resolveFile(u.pathname);if(f)return route.fulfill({path:f,contentType:mime[path.extname(f)]||'application/octet-stream'});}if(['data:','blob:'].includes(u.protocol))return route.continue();blocked.add(u.origin);return route.abort();});
 const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function check(name,fn){await fn();results.checks.push({name,passed:true});console.log('PASS '+name);}
 async function relations(name){const state=await page.evaluate(()=>['tab-create','tab-history'].map(id=>{const tab=document.getElementById(id),panel=document.getElementById(tab?.getAttribute('aria-controls'));return{tab:id,text:tab?.textContent.trim(),name:tab?.getAttribute('aria-label'),selected:tab?.getAttribute('aria-selected'),target:panel?.id,role:panel?.getAttribute('role'),labelledby:panel?.getAttribute('aria-labelledby'),hidden:panel?.hidden,visible:!!panel?.getClientRects().length};}));for(const item of state){assert.equal(item.role,'tabpanel');assert.equal(item.labelledby,item.tab);assert.equal(item.visible,item.selected==='true');assert.equal(item.hidden,item.selected!=='true');}results.states.push({name,relationships:state});}
 async function audit(name){if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const audit=await page.evaluate(async()=>{const a=await axe.run(document.getElementById('workspace-sidebar-pane'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return{violations:a.violations,incomplete:a.incomplete,passes:a.passes.map(p=>p.id),width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};});results.states.push({name,...audit});await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});assert.deepEqual(audit.violations,[]);assert.ok(audit.width<=audit.viewport);console.log('PASS '+name+' axe/reflow');}
 try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:90000});
  await page.locator('button').filter({hasText:'Full Platform'}).first().click();
  await page.locator('button[data-help-key="role_teacher"]').click();
  await page.getByRole('button',{name:'Skip',exact:true}).click();
  await page.locator('#tab-create').waitFor({state:'visible'});
  await check('Both tab panels exist while source module is delayed',async()=>{assert.ok(delayed>0);assert.equal(await page.locator('#tour-input-panel').count(),0);await relations('loading-create');});
  await audit('loading-create');
  await check('Manual activation, wraparound and Home/End preserve keyboard focus',async()=>{
   const create=page.locator('#tab-create'),history=page.locator('#tab-history');await create.focus();
   await page.keyboard.press('ArrowLeft');assert.equal(await history.evaluate(e=>e===document.activeElement),true);assert.equal(await create.getAttribute('aria-selected'),'true');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#tab-history')?.getAttribute('aria-selected')==='true');await relations('history-before-source-ready');
   await page.keyboard.press('ArrowRight');assert.equal(await create.evaluate(e=>e===document.activeElement),true);assert.equal(await history.getAttribute('aria-selected'),'true');
   await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('#tab-create')?.getAttribute('aria-selected')==='true');
   await page.keyboard.press('End');assert.equal(await history.evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Home');assert.equal(await create.evaluate(e=>e===document.activeElement),true);
   await page.keyboard.press('ArrowRight');assert.equal(await history.evaluate(e=>e===document.activeElement),true);await page.keyboard.press('ArrowLeft');assert.equal(await create.evaluate(e=>e===document.activeElement),true);
   await page.locator('#sidebar-create-panel').focus();assert.equal(await page.locator('#sidebar-create-panel').evaluate(e=>e===document.activeElement),true);
  });
  release();await page.locator('#tour-input-panel').waitFor({state:'visible',timeout:180000});await relations('ready-create');await audit('ready-create');
  await check('History panel remains correctly labelled after modules load',async()=>{await page.locator('#tab-history').click();await relations('ready-history');});await audit('ready-history');
  await check('History count has sufficient contrast and a named status role',async()=>{
   const badge=page.locator('#tour-history-panel [role="status"][aria-atomic="true"]').first();
   const evidence=await badge.evaluate(e=>({name:e.getAttribute('aria-label'),role:e.getAttribute('role'),color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));
   function luminance(color){const v=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];}
   const a=luminance(evidence.color),b=luminance(evidence.background);evidence.ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);results.historyBadge=evidence;
   assert.equal(evidence.role,'status');assert.ok(evidence.name);assert.ok(evidence.ratio>=4.5);
  });
  await check('History menu owns a live target only when open and restores focus on Escape',async()=>{
   const button=page.locator('#tour-history-panel button[aria-haspopup="menu"]');assert.equal(await button.getAttribute('aria-controls'),null);
   await button.focus();await page.keyboard.press('ArrowDown');await page.locator('#history-more-actions-menu').waitFor({state:'visible'});
   assert.equal(await button.getAttribute('aria-controls'),'history-more-actions-menu');assert.equal(await button.getAttribute('aria-expanded'),'true');
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('role')),'menuitem');
   const audit=await page.evaluate(async()=>axe.run(document.getElementById('tour-history-panel'),{runOnly:{type:'rule',values:['aria-valid-attr-value','aria-prohibited-attr']}}));assert.deepEqual(audit.violations,[]);results.menuAudit={violations:audit.violations,incomplete:audit.incomplete};
   await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-controls'),null);assert.equal(await button.evaluate(e=>e===document.activeElement),true);
  });

  await page.locator('#tab-create').click();await page.setViewportSize({width:320,height:800});await page.locator('#workspace-tab-create').waitFor({state:'visible'});await audit('mobile-create');
  results.mobileCatalogBounds=await page.evaluate(()=>{const section=document.getElementById('tool-catalog-title')?.closest('section');if(!section)return null;return [section,...section.querySelectorAll('button'),...document.querySelectorAll('#sidebar-create-panel,#tour-generator-actions')].map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,text:e.innerText.slice(0,70),left:r.left,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,display:getComputedStyle(e).display,minWidth:getComputedStyle(e).minWidth}});});
  console.log('Mobile catalog bounds',JSON.stringify(results.mobileCatalogBounds));
  await check('Mobile catalog controls fit within the viewport',async()=>{assert.ok(results.mobileCatalogBounds);for(const e of results.mobileCatalogBounds){assert.ok(e.left>=0,e.text+' starts outside viewport');assert.ok(e.right<=320,e.text+' ends outside viewport at '+e.right);}});
  await page.addStyleTag({content:'* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p {margin-bottom:2em!important}'});
  await audit('mobile-create-spacing');
  await check('Mobile catalog controls still fit with enlarged text spacing',async()=>{const bounds=await page.locator('#tour-tool-finder button').evaluateAll(nodes=>nodes.map(e=>({text:e.innerText,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));results.mobileCatalogSpacingBounds=bounds;assert.ok(bounds.length);for(const b of bounds){assert.ok(b.left>=0);assert.ok(b.right<=320,b.text+' ends outside viewport at '+b.right);}});


  await check('Mobile uses its outer workspace tab panel without dangling desktop labels',async()=>{assert.equal(await page.locator('#tab-create').count(),0);assert.equal(await page.locator('#sidebar-create-panel').getAttribute('role'),null);assert.equal(await page.locator('#sidebar-create-panel').getAttribute('aria-labelledby'),null);assert.equal(await page.locator('#workspace-sidebar-pane').getAttribute('aria-labelledby'),'workspace-tab-create');});
 }catch(e){results.error=e.stack;console.error(e.stack);process.exitCode=1;results.failureText=await page.locator('body').innerText().catch(()=>null);await page.screenshot({path:path.join(__dirname,'failure.png'),fullPage:true}).catch(()=>{});}
 finally{release();results.delayedRequests=delayed;results.pageErrors=errors;results.blockedOrigins=[...blocked];results.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2));await context.close();await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
