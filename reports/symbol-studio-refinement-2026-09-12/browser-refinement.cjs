 const fs = require('fs');
 const path = require('path');
 const http = require('http');
 const { chromium } = require('playwright');
 const root = path.resolve(__dirname, '../..');
 const output = path.join(__dirname, process.argv[2] || 'captures');
 const tabs = process.env.REVIEW_ONLY_BOARD === '1' ? ['board'] : ['symbols', 'board', 'schedule', 'quickboards'];
 const widths = [1440, 390, 320];
 const svg = color => 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="24" fill="'+color+'"/><circle cx="80" cy="64" r="30" fill="white"/><path d="M40 135q40-65 80 0" fill="white"/></svg>').toString('base64');
 const labels = ['Water', 'Help', 'Break', 'Yes', 'No', 'Book', 'Wash hands', 'Snack'];
 const words = labels.map((label, i) => ({id:'fixture-'+i,label,description:'Fictional local review fixture',image:svg(['#4338ca','#15803d','#b45309'][i%3]),category:'other',source:'uploaded',createdAt:1700000000000,reviewStatus:'reviewed'}));
 const fixture = {
   alloStudentProfiles:[{id:'ui-review',name:'Demo Learner',description:'Fictional local UI fixture',image:null,codename:'DEMO-REVIEW'}],
   alloActiveProfileId:'ui-review',
   'alloSymbolGallery__ui-review':words,
   'alloSymbolBoards__ui-review':[{id:'demo-board',title:'My communication board',topic:'Classroom',words,cols:4,profileId:'ui-review',createdAt:1700000000000}],
   'alloSchedules__ui-review':[{id:'demo-schedule',title:'Morning routine',orientation:'horizontal',items:words.slice(5).map(w=>({...w,completed:false})),createdAt:1700000000000}]
 };
 fixture['alloActivitySets__ui-review']=[{id:'demo-pack',title:'Classroom support pack',description:'Fictional reusable supports',boardIds:['demo-board'],scheduleIds:['demo-schedule'],assetIds:['fixture-0','fixture-1'],profileId:'ui-review',createdAt:1700000000000}];
 function html(tab) {return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Symbol Studio review</title><style>html,body{margin:0;font-family:Arial,sans-serif;}button,input,select,textarea{font-family:inherit;}*{box-sizing:border-box}</style></head><body><main id="main-content"><button id="background-control">Background control</button></main><div id="root"></div><script>window.__reviewToasts=[];window.__closeCount=0;window.AlloModules={};window.AlloIcons={};window.AlloStudent=null;window.AlloFlowVoice=null;for(const [k,v] of Object.entries('+JSON.stringify(fixture)+')){localStorage.setItem(k,JSON.stringify(v));}window.__alloT=(k,f)=>f||k;</script><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/audio.js"></script><script src="/studio.js"></script><script>const noop=()=>{};window.__reviewRoot=ReactDOM.createRoot(document.getElementById("root"));window.__reviewRoot.render(React.createElement(AlloModules.SymbolStudio,{isOpen:true,initialTab:'+JSON.stringify(tab)+',onClose:()=>{window.__closeCount++},onCallImagen:async()=>window.__reviewImageMode==="fail"?null:JSON.parse(localStorage.getItem("alloSymbolGallery__ui-review"))[0].image,onCallGeminiImageEdit:async()=>null,onCallGemini:async()=>window.__reviewAIResponse||"",onCallTTS:async()=>null,onCallGeminiVision:async()=>"",selectedVoice:"Kore",onSetVoice:noop,geminiVoices:[],kokoroVoices:[],isCanvasEnv:false,addToast:(...a)=>window.__reviewToasts.push(a),cloudSync:null,liveSession:null,dashboardData:null,setDashboardData:noop,selectedStudentId:null,t:window.__alloT}));</script></body></html>';}
 function summarize() {
   const root = document.querySelector('.ss-modal-root');
   const all = [...root.querySelectorAll('*')];
   const shown = el => {const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
   const describe=el=>{const r=el.getBoundingClientRect();return {tag:el.tagName,role:el.getAttribute('role'),name:(el.getAttribute('aria-label')||el.innerText||el.getAttribute('title')||el.getAttribute('placeholder')||'').trim().slice(0,100),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),class:el.className}};
   const interactive=all.filter(el=>el.matches('button,input,select,textarea,[role=button],[tabindex]')&&shown(el));
   return {viewport:{width:innerWidth,height:innerHeight},page:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},root:describe(root),dialog:describe(document.querySelector('[role=dialog]')),workspaceOverflow:all.filter(el=>!el.closest('.ss-tabs')&&shown(el)&&(el.getBoundingClientRect().right>innerWidth+1||el.getBoundingClientRect().left<-1)).map(describe),overflow:all.filter(el=>shown(el)&&(el.getBoundingClientRect().right>innerWidth+1||el.getBoundingClientRect().left<-1)).map(describe),smallTargets:interactive.filter(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44}).map(describe),unlabeled:interactive.filter(el=>!el.getAttribute('aria-label')&&!el.innerText.trim()&&!el.getAttribute('title')&&!el.getAttribute('placeholder')&&!el.getAttribute('aria-labelledby')&&!(el.labels&&el.labels.length)).map(describe),fields:interactive.filter(el=>el.matches('input,textarea,select')).map(describe),buttons:interactive.filter(el=>el.tagName==='BUTTON').map(describe),focus:describe(document.activeElement),toasts:window.__reviewToasts};
 }

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const routes={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/audio.js':'karaoke_audio_store_module.js','/studio.js':'symbol_studio_module.js'};
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost');if(routes[p.pathname]){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(root,routes[p.pathname])));}else{res.setHeader('content-type','text/html');res.end(html(p.searchParams.get('tab')||'symbols'));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});const results=[],functional={};
 async function start(tab){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.__errors=[];page.__external=[];
  page.on('pageerror',e=>page.__errors.push(e.message));page.on('console',m=>{if(m.type()==='error')page.__errors.push(m.text());});
  await page.route('**/*',route=>{if(route.request().url().startsWith(origin)||route.request().url().startsWith('data:'))return route.continue();page.__external.push(route.request().url());return route.abort();});
  await page.goto(origin+'/?tab='+tab);await page.locator('.ss-main-modal').waitFor();await page.waitForTimeout(350);return page;
 }
 async function capture(page,label){
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1000:844});await page.waitForTimeout(50);
   await page.locator('.ss-body').evaluate(el=>el.scrollTop=0);
   const state=await page.evaluate(summarize);results.push({scenario:label,width,...state,errors:page.__errors,blockedExternal:page.__external});
   await page.screenshot({path:path.join(output,width+'-'+label+'.png'),fullPage:true});
   if(width<800){await page.locator('.ss-body').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(output,width+'-'+label+'-scrolled.png'),fullPage:true});}
  }
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(results,null,2));
 }
 try{
  let page;
  if(!process.env.REVIEW_STORY_ONLY){page=await start('symbols');
  await page.getByRole('button',{name:'Select symbol: Water',exact:true}).click();await capture(page,'symbol-selected');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('textbox',{name:'Search aliases for Water',exact:true}).fill('');
  await page.getByRole('textbox',{name:'Search aliases for Water',exact:true}).pressSequentially('drink, beverage');
  await page.getByRole('textbox',{name:'Search aliases for Water',exact:true}).press('Tab');
  functional.aliasEntry={typed:'drink, beverage',rendered:await page.getByRole('textbox',{name:'Search aliases for Water',exact:true}).inputValue(),persisted:await page.evaluate(()=>JSON.parse(localStorage.getItem('alloSymbolGallery__ui-review')).find(x=>x.id==='fixture-0').aliases)};
  await page.getByRole('textbox',{name:'Search symbols in the Symbol Bank',exact:true}).fill('not-a-real-match');
  functional.filteredSelection={selectedPreviewStillShown:await page.getByRole('heading',{name:'Water',exact:true}).count(),results:await page.locator('[aria-label^="Select symbol:"]').count()};await page.close();
  page=await start('board');await page.getByRole('button',{name:'Toggle saved boards gallery',exact:true}).click();await capture(page,'saved-boards');await page.close();
  page=await start('books');await page.getByRole('button',{name:/Classroom support pack/}).click();await capture(page,'pack-selected');await page.close();
  }
  page=await start('stories');await capture(page,'story-empty');await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('textbox',{name:'Student name for social story',exact:true}).fill('Demo Learner');
  await page.getByRole('textbox',{name:'Social story situation or goal',exact:true}).fill('Waiting for a turn');
  await page.evaluate(()=>window.__reviewAIResponse=JSON.stringify([{text:'We can wait while a friend has a turn. I can ask for help.',imagePrompt:'Fictional child waiting in a classroom'},{text:'My turn comes next. I can enjoy playing with a friend.',imagePrompt:'Fictional child sharing a toy'}]));
  await page.getByRole('button',{name:'Generate social story',exact:true}).click();await page.waitForFunction(()=>!!document.getElementById('ss-py'));await page.waitForFunction(()=>!document.querySelector('[aria-label="Generate social story"]').disabled);
  await capture(page,'story-generated');
  await page.getByRole('button',{name:'Go to story page 2',exact:true}).focus();await page.keyboard.press('Enter');
  functional.storyThumbnailKeyboard=await page.getByRole('button',{name:'Go to story page 2',exact:true}).getAttribute('aria-current')==='page';
  functional.storyHasTextEditor=await page.locator('#ss-py textarea, #ss-py [contenteditable=true]').count();
  if(process.env.REVIEW_TALL_HOST)await page.evaluate(()=>{document.getElementById('main-content').style.height='4000px';document.getElementById('root').style.cssText='height:5000px;overflow:hidden;padding:60px;display:flex';});
  await page.emulateMedia({media:'print'});functional.visiblePrintText=await page.locator('#ss-py').innerText();functional.printAncestry=await page.locator('.ss-story-print-pages').evaluate(el=>{const a=[];while(el){const s=getComputedStyle(el),r=el.getBoundingClientRect();a.push({tag:el.tagName,id:el.id,class:el.className,display:s.display,position:s.position,overflow:s.overflow,height:s.height,maxHeight:s.maxHeight,breakAfter:s.breakAfter,rect:[r.x,r.y,r.width,r.height]});el=el.parentElement;}return a;});const printPdf=await page.pdf({path:path.join(output,'story-print.pdf'),format:'A4',printBackground:true});functional.printedPageCount=(printPdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;await page.screenshot({path:path.join(output,'story-print.png'),fullPage:true});await page.emulateMedia({media:'screen'});
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.__reviewAIResponse='invalid response');
  await page.getByRole('button',{name:'Generate social story',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[aria-label="Generate social story"]').disabled);
  functional.failedReplacement={priorStoryVisible:await page.locator('#ss-py').count(),toasts:await page.evaluate(()=>window.__reviewToasts)};
  await capture(page,'story-failed-replacement');await page.close();
 }finally{await browser.close();server.close();}
 fs.writeFileSync(path.join(output,'functional.json'),JSON.stringify(functional,null,2));
 const checks={states:results.length,runtimeErrors:results.reduce((n,r)=>n+r.errors.length,0),workflowOverflow:results.reduce((n,r)=>n+r.workspaceOverflow.length,0),aliasCommaEntry:functional.aliasEntry ? (functional.aliasEntry.rendered==='drink, beverage'&&JSON.stringify(functional.aliasEntry.persisted)===JSON.stringify(['drink','beverage'])) : null,storyPrintIncludesAllPages:functional.visiblePrintText.includes('We can wait while a friend has a turn.')&&functional.visiblePrintText.includes('My turn comes next.'),storyPrintedAllPages:functional.printedPageCount===2,storyThumbnailKeyboard:functional.storyThumbnailKeyboard,storyFailurePreservesDraft:functional.failedReplacement.priorStoryVisible===1};
 fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
 if(checks.runtimeErrors||checks.workflowOverflow||(!process.env.REVIEW_STORY_ONLY&&!checks.aliasCommaEntry)||!checks.storyPrintIncludesAllPages||!checks.storyPrintedAllPages||!checks.storyThumbnailKeyboard||!checks.storyFailurePreservesDraft)process.exitCode=1;
 console.log(JSON.stringify(checks,null,2));console.log(JSON.stringify(functional,null,2));console.log(JSON.stringify(results.map(r=>({scenario:r.scenario,width:r.width,overflow:r.workspaceOverflow.length,small:r.smallTargets.length,errors:r.errors})),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});