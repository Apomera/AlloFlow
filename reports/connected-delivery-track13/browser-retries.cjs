// Disposable Chromium fixture: generated modules, no server, no live backend.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const dockSource=read('view_live_session_dock_source.jsx');
const names=/const \{([^}]*)\} = props;/.exec(dockSource)[1].split(',').map(s=>s.trim());
const assets={
 '/react.js':read('desktop/web-app/node_modules/react/umd/react.development.js'),
 '/react-dom.js':read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')
};
for(const file of ['live_aac_module.js','view_live_session_dock_module.js'])assets['/'+file]=read(file);
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root"></main>'+Object.keys(assets).map(src=>'<script src="'+src+'"></script>').join('')+'</body></html>';
let browser;const results=[],errors=[];
(async()=>{try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='delivery.test')return route.abort();return route.fulfill({contentType:assets[url.pathname]?'text/javascript':'text/html',body:assets[url.pathname]||html});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('https://delivery.test/');
 await page.evaluate(names=>{
  const api=AlloModules.LiveAac;window.retryCalls=[];window.pending=[];
  const image=n=>'data:image/png;base64,'+'A'.repeat(n);
  const picture={id:'picture',type:'image',title:'A leaf',data:{imageUrl:image(100)}};
  window.fixture={picture,target:{resourceId:'picture',resourceAt:100},prepared:picture};
  const value={t:()=>null,history:[picture],sessionData:{roster:{}},rosterEntries:{student:{uid:'student',name:'Learner',viewingResourceId:'picture'}},activeSignals:[],activeSessionCode:'ABCDE',activeSessionAppId:'fixture',_alloMbBridgeActive:()=>true,_alloStudentSafeResources:h=>h||[],liveDockPanelRef:React.createRef(),getFilteredHistory:()=>[],dockCardStyle:{},dockGroupLabel:{},dockNow:300,recentHavenRecognition:[],liveOrganizerSummary:null,retryableLiveOrganizerUids:[],CLASS_GOAL_TEMPLATES:[],ALLOHAVEN_CLASSROOM_REWARD_REASONS:[],ALLOHAVEN_RECOGNITION_CAPS:[],TEACHER_ONLY_TYPES:[],liveActivitySnapshots:{},livePresenterCuesByResourceId:{},checklistMarks:{},havenRecognitionConfig:{},havenRewardDraftsRef:{current:{}},mailboxImageVersion:23,resolveLiveStudentResourceTarget:()=>fixture.target,getPreparedMailboxResource:()=>fixture.prepared,retryMailboxImagesForStudent:(...args)=>{retryCalls.push(args);return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
  for(const name of names)if(!(name in value))value[name]=/^(normalize|get|handle|set|resolve|classify|evaluate|format|retry|launch|open|broadcast|summarize|update|toggle|clear|signal|build|record|_allo)/.test(name)?()=>[]:undefined;
  window.fixtureProps=value;window.fixtureRoot=ReactDOM.createRoot(document.getElementById('root'));
  window.renderDock=()=>ReactDOM.flushSync(()=>fixtureRoot.render(React.createElement(AlloModules.LiveSessionDockView,fixtureProps)));
  window.resetDock=()=>{ReactDOM.flushSync(()=>fixtureRoot.render(null));fixtureProps.rosterEntries={student:{uid:'student',name:'Learner',viewingResourceId:fixture.target.resourceId}};renderDock();};
  window.finishRetry=async(index,fail)=>{if(fail)pending[index].reject(Error('Fixture send failed'));else pending[index].resolve();await Promise.resolve();};
  window.makeReady=()=>{const manifest=api.mailboxResourceImages(fixture.prepared);fixtureProps.rosterEntries={student:{uid:'student',name:'Learner',imageDelivery:{version:1,resourceId:api.mailboxImageReceiptId(fixture.target.resourceId,manifest.revision),status:'ready',loaded:1,total:1,omitted:0,assignmentAt:fixture.target.resourceAt,at:200}}};renderDock();};
  renderDock();
 },names);
 const button=page.getByRole('button',{name:'Retry images for Learner',exact:true});
 for(const kind of ['resource','revision','assignment','session','school']){
  await page.evaluate(()=>resetDock());const start=await page.evaluate(()=>pending.length);
  await button.focus();await page.keyboard.press('Enter');assert(await button.isDisabled());
  await page.evaluate(kind=>{
   if(kind==='resource'){fixture.picture={...fixture.picture,id:'other-picture'};fixtureProps.history=[fixture.picture];fixture.prepared=fixture.picture;fixture.target={...fixture.target,resourceId:'other-picture'};}
   if(kind==='revision')fixture.prepared={...fixture.prepared,data:{imageUrl:'data:image/png;base64,'+'B'.repeat(200)}};
   if(kind==='assignment')fixture.target={...fixture.target,resourceAt:fixture.target.resourceAt+1};
   if(kind==='session')fixtureProps.activeSessionCode='FGHIJ';
   if(kind==='school')fixtureProps.activeSessionAppId='other-school';
   renderDock();
  },kind);
  assert(await button.isEnabled());await button.click();
  await page.evaluate(i=>finishRetry(i,true),start);assert(await button.isDisabled());assert.equal(await page.getByRole('alert').count(),0);
  await page.evaluate(i=>finishRetry(i,false),start+1);await page.waitForFunction(()=>!document.querySelector('button[aria-label="Retry images for Learner"]').disabled);
  assert((await page.locator('main').textContent()).includes('Images: awaiting device'));
  results.push({case:'keyboard-retry-'+kind+'-change',passed:true});
 }
 await page.evaluate(()=>resetDock());const readyStart=await page.evaluate(()=>pending.length);await button.click();await page.evaluate(()=>makeReady());
 await page.getByText('Images loaded 1/1',{exact:true}).waitFor();await page.evaluate(i=>finishRetry(i,true),readyStart);
 assert.equal(await page.getByRole('alert').count(),0);assert.equal(await button.count(),0);results.push({case:'confirmed-receipt-retires-late-retry-failure',passed:true});
 await page.evaluate(()=>resetDock());const failureStart=await page.evaluate(()=>pending.length);await button.click();await page.evaluate(i=>finishRetry(i,true),failureStart);
 await page.getByRole('alert').filter({hasText:'Could not resend'}).waitFor();assert(await button.isEnabled());
 const size=await button.boundingBox();assert(size.height>=44);await button.focus();await page.keyboard.press('Enter');await page.evaluate(i=>finishRetry(i,false),failureStart+1);
 await page.waitForFunction(()=>!document.querySelector('button[aria-label="Retry images for Learner"]').disabled);assert.equal(await page.getByRole('alert').count(),0);
 assert((await page.locator('main').textContent()).includes('Images: awaiting device'));results.push({case:'failed-resend-keyboard-retry-without-optimistic-delivery',passed:true});
 await page.evaluate(()=>resetDock());const unmountStart=await page.evaluate(()=>pending.length);await button.click();await page.evaluate(()=>resetDock());await page.evaluate(i=>finishRetry(i,true),unmountStart);
 assert(await button.isEnabled());assert.equal(await page.getByRole('alert').count(),0);results.push({case:'reopened-dock-ignores-retired-failure',passed:true});
 assert.deepEqual(errors,[]);await context.close();
 fs.writeFileSync(path.join(__dirname,'retry-browser-results.json'),JSON.stringify({scope:'Isolated intercepted origin; generated LiveAac and LiveSessionDockView; no live backend or saved app state.',results,errors},null,2)+'\n');
 console.log(JSON.stringify({passed:results.length,errors}));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();}})();
