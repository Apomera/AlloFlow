const fs=require('fs'); const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}); const page=await browser.newPage({viewport:{width:1100,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>');
 for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:file});
 await page.evaluate(()=>{window.AlloModules={};window.AlloIcons=new Proxy({},{get:()=>()=>null});window.t=k=>k;window.AlloLanguageContext=React.createContext({t:window.t});window.fisherYatesShuffle=a=>a.slice();});
 for(const file of ['games_module.js','view_renderers_module.js'])await page.addScriptTag({path:file});
 await page.evaluate(()=>{
  window.completed=[];window.closeCount=0;window.fixture={id:'cer-1',type:'outline',data:{main:'Why do plants grow?',structureType:'Claim-Evidence-Reasoning',branches:[{title:'Claim',items:['Plants need light']},{title:'Evidence',items:['Plant A grew','Plant B did not']},{title:'Reasoning',items:['Light provides energy']}]}};
  window.root=ReactDOM.createRoot(document.getElementById('app'));
  window.draw=(extra={})=>window.root.render(window.AlloModules.ViewRenderers.renderOutlineContent({generatedContent:window.fixture,t:window.t,isTeacherMode:false,isInteractiveOutlineSort:true,ErrorBoundary:({children})=>children,closeOutlineSort:()=>{window.closeCount++;},handleGameCompletion:(...args)=>window.completed.push(args),...extra}));window.draw();
 });
 await page.getByRole('heading',{name:'Claim, Evidence, or Reasoning?'}).waitFor();
 const answers=[['Plants need light','Claim'],['Plant A grew','Evidence'],['Plant B did not','Evidence'],['Light provides energy','Reasoning']];
 for(const [text,zone] of answers){const item=page.locator('[data-multi-bucket-item-id]').filter({hasText:text});await item.focus();await page.keyboard.press('Enter');await page.getByRole('dialog',{name:'games.choose_destination_aria'}).getByRole('button',{name:zone,exact:true}).click();}
 const result=await page.evaluate(()=>({completed:window.completed,focused:document.activeElement.textContent}));
 if(result.completed[0]?.[0]!=='outlineSort'||result.completed[0]?.[1]?.itemsSorted!==4)throw Error('CER did not complete');
 await page.keyboard.press('Escape');if(await page.evaluate(()=>window.closeCount)!==1)throw Error('Escape close failed: '+await page.evaluate(()=>window.closeCount));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.draw({isTeacherMode:true,isInteractiveOutlineSort:false}));
 await page.getByRole('button',{name:'Practice CER sorting'}).waitFor();
 // Use the exact production standalone utilities when available.
 const cssCandidates=['app.css','styles.css','desktop/web-app/public/styles.css'];
 for(const candidate of cssCandidates)if(fs.existsSync(candidate))await page.addStyleTag({path:candidate});
 fs.mkdirSync('reports/visual-organizer-review-2026-09-19',{recursive:true});
 fs.writeFileSync('reports/visual-organizer-review-2026-09-19/browser-results.json',JSON.stringify({cerKeyboardCompletion:result,escapeClose:true,phoneActivityButtonVisible:true,pageErrors:errors,scope:'Real Chromium running production renderer/game bundles with deterministic fixtures; no live provider or AI request.'},null,2));
 if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({keyboardCompletion:true,escapeClose:true,phoneActivityButtonVisible:true,pageErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

