const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/allobot-evidence-2026-09-19');
const css=`*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:#f8fafc;color:#1e293b}main{width:min(100%,520px);margin:24px auto;padding:16px;background:white;border:1px solid #cbd5e1;border-radius:16px}h1{font-size:20px}.text-xs{font-size:12px;line-height:1.6}.text-sm{font-size:14px}.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mb-1{margin-bottom:4px}.pt-2{padding-top:8px}.pt-4{padding-top:16px}.p-0{padding:0}.p-2{padding:8px}.px-3{padding-left:12px;padding-right:12px}.border-t{border-top:1px solid #cbd5e1}.border{border:1px solid #cbd5e1}.rounded-lg{border-radius:8px}.text-slate-800{color:#1e293b}.text-slate-900{color:#0f172a}.bg-white{background:white}.w-full{width:100%}.min-w-0{min-width:0}.min-h-6{min-height:24px}.min-h-11{min-height:44px}.block{display:block}.inline-block{display:inline-block}.flex{display:flex}.flex-wrap{flex-wrap:wrap}.items-start{align-items:flex-start}.gap-2{gap:8px}.list-none{list-style:none}.space-y-2>*+*{margin-top:8px}.font-medium{font-weight:500}.font-semibold,.font-bold{font-weight:600}.underline{text-decoration:underline}.break-words{overflow-wrap:break-word}.whitespace-pre-wrap{white-space:pre-wrap}a{color:#4338ca}button,summary{cursor:pointer}button,input{font:inherit}input[type=checkbox]{min-width:24px;min-height:24px}:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}`;
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try{
  for(const width of [1280,320]){
   const context=await browser.newContext({viewport:{width,height:1000}});
   await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Allobot evidence check</title><main><h1>Allobot sources</h1><div id="root"></div></main></html>'}));
   const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://allobot.test/');await page.addStyleTag({content:css});
   for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,f),'utf8')});
   await page.evaluate(()=>{window.AlloModules={};window.AlloIcons={};window.__root=ReactDOM.createRoot(document.getElementById('root'));});
   await page.addScriptTag({content:fs.readFileSync('view_misc_modals_module.js','utf8')});
   await page.evaluate(()=>window.__root.render(React.createElement(window.AlloModules.AllobotEvidenceCard,{tx:(k,f)=>f,renderFormattedText:t=>t,evidence:{status:'sources-found',basis:'search-excerpts',provider:'Serper',query:'site:udlguidelines.cast.org UDL Guidelines 3.0 choice',checkedAt:'2026-09-19T12:00:00Z',sources:[{id:1,url:'https://udlguidelines.cast.org/engagement/',title:'CAST — Design multiple means of engagement',publisher:'udlguidelines.cast.org',excerpt:'Synthetic test excerpt: offer choices that support the learning goal.'}]}})));
   const link=page.getByRole('link',{name:/CAST/});await link.waitFor();await link.focus();
   const popupPromise=page.waitForEvent('popup');await page.keyboard.press('Enter');const popup=await popupPromise;await popup.waitForLoadState();assert.equal(popup.url(),'https://udlguidelines.cast.org/engagement/');await popup.close();
   await page.getByText('Search excerpt',{exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('details').first().getAttribute('open'),'');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.addScriptTag({content:fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
   let violations=await page.evaluate(async()=>(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
   await page.screenshot({path:path.join(out,`sources-${width}.png`),fullPage:true});
   await page.evaluate(()=>window.__root.render(React.createElement(window.AlloModules.AllobotSearchSettings,{t:k=>k})));
   const key=page.getByLabel('Your Serper API key (optional)');await key.fill('synthetic-test-key');await page.getByRole('button',{name:'Save search key',exact:true}).click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_ai_config')).serperApiKey),'synthetic-test-key');
   await page.getByRole('button',{name:'Remove personal key',exact:true}).click();assert.equal(await key.inputValue(),'');
   await page.getByRole('checkbox').uncheck();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow_ai_config')).allobotWebSearch),false);
   violations=await page.evaluate(async()=>(await axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
   await page.screenshot({path:path.join(out,`settings-${width}.png`),fullPage:true});
   // Canvas cold-path bundle must mount settings without MiscModals loaded.
   await page.evaluate(()=>{window.__root.unmount();window.AlloModules={};window.__root=ReactDOM.createRoot(document.getElementById('root'));});
   await page.addScriptTag({content:fs.readFileSync('view_cold_path_surfaces_module.js','utf8')});
   await page.evaluate(()=>window.__root.render(React.createElement(window.AlloModules.AiBackendSettingsView,{t:k=>k,Settings:()=>null,X:()=>null,_isCanvasEnv:true,setShowAIBackendModal:()=>{},aiBackendModalRef:{current:null}})));
   await page.getByLabel('Your Serper API key (optional)').waitFor();
   results.push({width,citationOpened:true,keyboardExcerpt:true,settingsPersist:true,canvasStandalone:true,overflow:false,axeViolations:0,pageErrors:errors});await context.close();
  }
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
