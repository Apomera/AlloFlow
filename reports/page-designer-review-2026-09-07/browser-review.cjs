const fs=require('fs');const path=require('path');const {chromium}=require('playwright');
const out=path.resolve('reports/page-designer-review-2026-09-07');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.setDefaultTimeout(8000);console.log('Browser opened');
 page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.route('http://designer.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Page Designer review</title><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div></body></html>'}));
 await page.goto('http://designer.test/');
 for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','studio_module.js'])await page.addScriptTag({path:path.resolve(file)});
 await page.evaluate(()=>{window.toasts=[];window.stRoot=ReactDOM.createRoot(document.getElementById('root'));window.stRoot.render(React.createElement(AlloModules.AlloStudio,{t:()=>'',addToast:(...a)=>toasts.push(a),onClose:()=>stRoot.unmount()}));});
 await page.getByRole('button',{name:/^Use template:/}).first().waitFor();
 await page.screenshot({path:path.join(out,'templates-desktop.png')});
 await page.getByRole('button',{name:/^Use template:/}).first().click();
 const title=page.getByRole('textbox',{name:'Document title',exact:true});await title.waitFor();
 const results={errors};
 for(const [name,width,height] of [['desktop',1280,900],['short-laptop',1280,720],['tablet',1024,768],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.screenshot({path:path.join(out,'editor-'+name+'.png')});
  results[name]=await page.evaluate(()=>{
   const header=document.querySelector('input[aria-label="Document title"]').parentElement;
   const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
   const controls=document.querySelector('[aria-label="Page and canvas controls"]');const canvasViewport=controls?.nextElementSibling;const canvasPage=canvasViewport?.firstElementChild;const snap=[...document.querySelectorAll('button')].find(b=>b.textContent==='Snap');return {canvasViewport:canvasViewport&&rect(canvasViewport),canvasPage:canvasPage&&rect(canvasPage),snap:snap&&{foreground:getComputedStyle(snap).color,background:getComputedStyle(snap).backgroundColor,pressed:snap.getAttribute('aria-pressed')},header:rect(header),clippedHeaderControls:[...header.querySelectorAll('button,input')].map(e=>({name:e.getAttribute('aria-label')||e.textContent,...rect(e)})).filter(e=>e.x<0||e.right>innerWidth),buttons:[...document.querySelectorAll('button')].map(e=>e.textContent).filter(Boolean),canvasCandidates:[...document.querySelectorAll('[aria-label]')].filter(e=>/canvas|page|object/i.test(e.getAttribute('aria-label'))).slice(0,20).map(e=>({name:e.getAttribute('aria-label'),tag:e.tagName,...rect(e)})),smallText:[...document.querySelectorAll('.st-root label,.st-root button,.st-root p')].filter(e=>e.getClientRects().length&&parseFloat(getComputedStyle(e).fontSize)<11).slice(0,12).map(e=>({text:e.textContent.slice(0,85),size:getComputedStyle(e).fontSize}))};
  });
 }
 fs.writeFileSync(path.join(out,'browser-findings.json'),JSON.stringify(results,null,2));console.log('Viewport checks saved');await page.setViewportSize({width:1280,height:900});
 await page.locator('button').filter({hasText:'Your Event Title'}).first().click();await page.screenshot({path:path.join(out,'selected-text-desktop.png')});await page.getByRole('button',{name:/Export$/,exact:false}).click();await page.screenshot({path:path.join(out,'export-desktop.png')});await page.getByRole('button',{name:/Export$/,exact:false}).click();await page.waitForFunction(()=>!!localStorage.getItem('alloStudioAutosave_v1'),{},{timeout:15000});await title.fill('Unsaved final edit');await title.press('Enter');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('alloStudioAutosave_v1')||'null')?.doc?.title||null);
 await page.getByRole('button',{name:'Close AlloStudio',exact:true}).click();
 const after=await page.evaluate(()=>({savedTitle:JSON.parse(localStorage.getItem('alloStudioAutosave_v1')||'null')?.doc?.title||null,toasts}));
 results.immediateClose={before,...after};fs.writeFileSync(path.join(out,'browser-findings.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({errors,immediateClose:results.immediateClose,views:Object.fromEntries(Object.entries(results).filter(([k,v])=>v.canvasViewport).map(([k,v])=>[k,{canvasViewport:v.canvasViewport,canvasPage:v.canvasPage,snap:v.snap}]))},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
