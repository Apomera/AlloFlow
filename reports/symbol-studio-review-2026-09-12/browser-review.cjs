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
 function html(tab) {return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Symbol Studio review</title><style>html,body{margin:0;font-family:Arial,sans-serif;}button,input,select,textarea{font-family:inherit;}*{box-sizing:border-box}</style></head><body><main id="main-content"><button id="background-control">Background control</button></main><div id="root"></div><script>window.__reviewToasts=[];window.__closeCount=0;window.AlloModules={};window.AlloIcons={};window.AlloStudent=null;window.AlloFlowVoice=null;for(const [k,v] of Object.entries('+JSON.stringify(fixture)+')){localStorage.setItem(k,JSON.stringify(v));}window.__alloT=(k,f)=>f||k;</script><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/audio.js"></script><script src="/studio.js"></script><script>const noop=()=>{};window.__reviewRoot=ReactDOM.createRoot(document.getElementById("root"));window.__reviewRoot.render(React.createElement(AlloModules.SymbolStudio,{isOpen:true,initialTab:'+JSON.stringify(tab)+',onClose:()=>{window.__closeCount++},onCallImagen:async()=>null,onCallGeminiImageEdit:async()=>null,onCallGemini:async()=>"",onCallTTS:async()=>null,onCallGeminiVision:async()=>"",selectedVoice:"Kore",onSetVoice:noop,geminiVoices:[],kokoroVoices:[],isCanvasEnv:false,addToast:(...a)=>window.__reviewToasts.push(a),cloudSync:null,liveSession:null,dashboardData:null,setDashboardData:noop,selectedStudentId:null,t:window.__alloT}));</script></body></html>';}
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
  const server=http.createServer((req,res)=>{let p=new URL(req.url,'http://localhost');if(routes[p.pathname]){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(root,routes[p.pathname])))}else{res.setHeader('content-type','text/html');res.end(html(p.searchParams.get('tab')||'symbols'))}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  const results=[];
  try{
  for(const width of widths){for(const tab of tabs){
   const page=await browser.newPage({viewport:{width,height:width===1440?1000:844},deviceScaleFactor:1});
   const errors=[],external=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.route('**/*',route=>{if(route.request().url().startsWith(origin)||route.request().url().startsWith('data:'))return route.continue();external.push(route.request().url());return route.abort();});
   await page.goto(origin+'/?tab='+tab);await page.locator('[role=dialog]').first().waitFor();await page.waitForTimeout(350);
   let state=await page.evaluate(summarize);
   await page.screenshot({path:path.join(output,width+'-'+tab+'.png'),fullPage:true});
   if(width<800){await page.locator('.ss-body').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(output,width+'-'+tab+'-scrolled.png'),fullPage:true});await page.locator('.ss-body').evaluate(el=>el.scrollTop=0);}
   let decision=null;
   if(tab==='symbols'){
     await page.getByRole('button',{name:'Clear all symbols from Symbol Bank',exact:true}).click();
     await page.getByRole('alertdialog').waitFor();
     decision={initialFocus:await page.evaluate(()=>document.activeElement.textContent)};
     await page.keyboard.press('Shift+Tab');
     decision.shiftTabFocus=await page.evaluate(()=>document.activeElement.textContent);
     if(width===320)await page.screenshot({path:path.join(output,'320-confirmation.png'),fullPage:true});
     await page.keyboard.press('Escape');
     decision.dismissed=await page.getByRole('alertdialog').count()===0;
     decision.restoreFocus=await page.evaluate(()=>document.activeElement.getAttribute('aria-label'));
     decision.outerCloseCount=await page.evaluate(()=>window.__closeCount);
   }
   const firstTab=page.getByRole('tab').first();
   let keyboard={decision};
   if(await firstTab.count()){await firstTab.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);keyboard.tabArrowFocus=await page.evaluate(()=>({role:document.activeElement.getAttribute('role'),name:document.activeElement.textContent,selected:document.activeElement.getAttribute('aria-selected')}));}
   if(await page.getByRole('tab').count()){
     await page.keyboard.press('End');await page.waitForTimeout(100);
     keyboard.tabEndFocus=await page.evaluate(()=>({role:document.activeElement.getAttribute('role'),name:document.activeElement.textContent,selected:document.activeElement.getAttribute('aria-selected')}));
     await page.keyboard.press('Home');await page.waitForTimeout(100);
     keyboard.tabHomeFocus=await page.evaluate(()=>({role:document.activeElement.getAttribute('role'),name:document.activeElement.textContent,selected:document.activeElement.getAttribute('aria-selected')}));
   }
   keyboard.background=await page.locator('#background-control').evaluate(el=>({inert:el.closest('[inert]')!==null,ariaHidden:el.closest('[aria-hidden=true]')!==null}));
   results.push({tab,width,...state,keyboard,errors,blockedExternalRequests:external});
   fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(results,null,2));
   if(width===1440&&(tab==='board'||tab==='schedule')){
     await page.goto(origin+'/?tab='+tab);await page.locator('[role=dialog]').first().waitFor();await page.waitForTimeout(350);
     await page.getByRole('button',{name:tab==='board'?'Toggle saved boards gallery':'Toggle saved sequences',exact:true}).click();
     await page.getByRole('button',{name:'Load',exact:true}).click();
     await page.waitForTimeout(100);
     for(const loadedWidth of widths){
       await page.setViewportSize({width:loadedWidth,height:loadedWidth===1440?1000:844});
       const loadedState=await page.evaluate(summarize);
       if(tab==='board'){await page.emulateMedia({media:'print'});loadedState.printGridColumns=await page.locator('#ss-pb>div').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);await page.emulateMedia({media:'screen'});}
       results.push({tab:tab+'-loaded',width:loadedWidth,...loadedState,keyboard:{},errors:[...errors],blockedExternalRequests:[...external]});
       await page.screenshot({path:path.join(output,loadedWidth+'-'+tab+'-loaded.png'),fullPage:true});
       if(loadedWidth<800){await page.locator('.ss-body').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(output,loadedWidth+'-'+tab+'-loaded-scrolled.png'),fullPage:true});await page.locator('.ss-body').evaluate(el=>el.scrollTop=0);}
     }
     fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(results,null,2));
   }
   await page.close();
  }}
  }finally{await browser.close();server.close();}
  const checks={runtimeErrors:results.reduce((n,r)=>n+r.errors.length,0),states:results.length,workspaceOverflow:results.reduce((n,r)=>n+(r.workspaceOverflow||[]).length,0),tabFocus:results.filter(r=>r.keyboard.tabArrowFocus).every(r=>[r.keyboard.tabArrowFocus,r.keyboard.tabEndFocus,r.keyboard.tabHomeFocus].every(f=>f&&f.role==='tab'&&f.selected==='true')),backgroundIsolation:results.filter(r=>r.keyboard.background).every(r=>r.keyboard.background.inert&&r.keyboard.background.ariaHidden),confirmationCancel:results.filter(r=>r.keyboard.decision).every(r=>r.keyboard.decision.dismissed&&r.keyboard.decision.outerCloseCount===0&&r.keyboard.decision.restoreFocus==='Clear all symbols from Symbol Bank'),printColumnsPreserved:results.filter(r=>r.tab==='board-loaded').every(r=>r.printGridColumns===4)};
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(checks,null,2));
  console.log(JSON.stringify(checks,null,2));
  if(checks.runtimeErrors||checks.workspaceOverflow||!checks.tabFocus||!checks.backgroundIsolation||!checks.confirmationCancel||!checks.printColumnsPreserved)process.exitCode=1;
  console.log(JSON.stringify(results.map(r=>({tab:r.tab,width:r.width,overflow:r.overflow.length,smallTargets:r.smallTargets.length,unlabeled:r.unlabeled.length,errors:r.errors,keyboard:r.keyboard})),null,2));
 })().catch(e=>{console.error(e);process.exitCode=1});
 
