const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright');
const root=process.cwd(),out=__dirname;
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const result={generatedAt:new Date().toISOString(),browser:browser.version(),host:'http://127.0.0.1:8792',fixtureLimitations:['Real compiled ExportPreviewView and repository CSS in a controlled synthetic host.','Synthetic Grade7ecosystems reading/table/quiz; only History/print/author starting mode.','Parent host callbacks are stubbed; no provider calls, real project persistence, full-app shell, export or document import validation.','Each viewport uses a fresh isolated browser context with empty storage; CSS pixels, deviceScaleFactor1.'],sourceHashes:{'view_export_preview_module.js':sha('view_export_preview_module.js'),'reports/document-builder-analysis-2026-09-08/ui-server.cjs':sha('reports/document-builder-analysis-2026-09-08/ui-server.cjs')},captures:[],errors:[]};
 async function measure(page,label,requested){
  const m=await page.evaluate(()=>{
   const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'',x:r.x,y:r.y,width:r.width,height:r.height,clientWidth:e.clientWidth,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,overflowX:s.overflowX,overflowY:s.overflowY,display:s.display,flex:s.flex,minHeight:s.minHeight}};
   const dialog=document.querySelector('[role="dialog"]'),frame=window.builderProps.exportPreviewRef.current;
   const ancestors=[];for(let e=frame?.parentElement;e&&ancestors.length<7;e=e.parentElement)ancestors.push(rect(e));
   return {viewport:{innerWidth,innerHeight,devicePixelRatio,visualViewport:visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale}:null},document:rect(document.documentElement),dialog:rect(dialog),iframe:rect(frame),iframeDocument:{title:frame?.contentDocument?.title,bodyScrollHeight:frame?.contentDocument?.body?.scrollHeight,designMode:frame?.contentDocument?.designMode},iframeAncestors:ancestors,focusMode:!!Array.from(document.querySelectorAll('button')).find(e=>e.textContent.trim().includes('Exit focus')),ribbonExpanded:document.querySelector('button[aria-controls^="builder-ribbon-panel-"]')?.getAttribute('aria-expanded')};
  });
  const file=label+'.png';await page.screenshot({path:path.join(out,file),fullPage:false});result.captures.push({label,requestedViewport:requested,screenshot:file,...m});console.log(JSON.stringify({label,viewport:m.viewport,iframe:m.iframe&&{x:m.iframe.x,y:m.iframe.y,width:m.iframe.width,height:m.iframe.height},dialog:m.dialog&&{height:m.dialog.height,scrollHeight:m.dialog.scrollHeight,scrollTop:m.dialog.scrollTop}}));
  fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(result,null,2)+'\n');
 }
 try{
  for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1});
   await context.route('**/*',route=>{const url=route.request().url();return url.startsWith('http://127.0.0.1:8792')||url.startsWith('data:')?route.continue():route.abort()});
   const page=await context.newPage();page.on('pageerror',e=>result.errors.push({viewport,message:e.message}));
   await page.goto('http://127.0.0.1:8792',{waitUntil:'networkidle'});
   await page.locator('#document-builder-title').waitFor();await page.waitForFunction(()=>window.builderProps?.exportPreviewRef.current?.contentDocument?.designMode==='on');
   await page.evaluate(()=>{document.querySelector('[role="dialog"]').scrollTop=0;window.scrollTo(0,0)});
   await measure(page,viewport.width+'x'+viewport.height+'-standard-top',viewport);
   if(viewport.width===390){
    await page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');d.scrollTop=d.scrollHeight});
    await measure(page,'390x844-standard-bottom',viewport);
    await page.getByRole('button',{name:'Focus mode',exact:true}).click();
    await page.evaluate(()=>{document.querySelector('[role="dialog"]').scrollTop=0;window.scrollTo(0,0)});
    await measure(page,'390x844-focus',viewport);
    await page.getByRole('button',{name:'Collapse ribbon',exact:true}).click();
    await page.evaluate(()=>{document.querySelector('[role="dialog"]').scrollTop=0;window.scrollTo(0,0)});
    await measure(page,'390x844-focus-collapsed',viewport);
   }
   await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,'geometry.json'),JSON.stringify(result,null,2)+'\n')}
})().catch(e=>{console.error(e);process.exitCode=1});
