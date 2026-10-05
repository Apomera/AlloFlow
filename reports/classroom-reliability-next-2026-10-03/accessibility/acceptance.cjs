'use strict';

// Focused local acceptance. The production app shell, Canvas device-storage
// bridge, hosted transport, speech intelligibility and screen readers are outside
// this runner. All modifications below affect the harness in memory only.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..', '..', '..');
const upstream = path.join(root, 'dev-tools', 'studio_delivery_e2e.cjs');
let code = fs.readFileSync(upstream, 'utf8').replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  assert.equal(code.split(before).length, 2, 'Missing/ambiguous acceptance anchor: ' + before.slice(0, 100));
  code = code.replace(before, after);
}
function replaceSection(start, end, replacement) {
  assert.equal(code.split(start).length, 2, 'Ambiguous start: ' + start);
  assert.equal(code.split(end).length, 2, 'Ambiguous end: ' + end);
  const first = code.indexOf(start), last = code.indexOf(end, first);
  assert(last > first, 'Invalid section: ' + start);
  code = code.slice(0, first) + replacement + code.slice(last);
}

replaceOnce("const read = p => fs.readFileSync(path.join(root, p), 'utf8');", `
const crypto = require('node:crypto');
const inputs = new Map();
const read = p => {
  const value = fs.readFileSync(path.join(root, p), 'utf8');
  const hash = crypto.createHash('sha256').update(value).digest('hex');
  if (inputs.has(p)) assert.equal(inputs.get(p), hash, 'Input changed during capture: ' + p);
  inputs.set(p, hash); return value;
};
inputs.set('dev-tools/studio_delivery_e2e.cjs', crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'dev-tools/studio_delivery_e2e.cjs'), 'utf8')).digest('hex'));
const requireFromApp = require('node:module').createRequire(path.join(root, 'desktop/web-app/package.json'));
`);
replaceOnce("'_alloCollectResChunk', 'createLiveSessionRetryController'", "'_alloPruneResChunks', '_alloFinishResChunk', '_alloCollectResChunk', 'createLiveSessionRetryController'");
replaceOnce("const helpers = names.map(name => { const n = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); assert(n, name); return anti.slice(n.start, n.end); }).join('\\n');", `
const constantDeclarations = ['ALLO_MB_CHUNK_CHARS'].map(name=>{
 const matches=ast.program.body.filter(node=>node.type==='VariableDeclaration'&&node.declarations.some(entry=>entry.id?.name===name));
 assert.equal(matches.length,1,'Missing/ambiguous canonical transport constant: '+name);
 assert.equal(matches[0].declarations.length,1,'Transport constant must have a standalone declaration: '+name);
 return anti.slice(matches[0].start,matches[0].end);
});
const helpers=[...constantDeclarations,...names.map(name=>{
 const matches=ast.program.body.filter(node=>node.type==='FunctionDeclaration'&&node.id?.name===name);
 assert.equal(matches.length,1,'Missing/ambiguous canonical transport helper: '+name);
 return anti.slice(matches[0].start,matches[0].end);
})].join('\\n');
// Reject future uncaptured closures before launching Chromium. Browser built-ins
// remain native; application bindings must come from the canonical helper graph.
const nativeGlobals=new Set(['window','Object','Array','Date','Set','Map','Number','String','Error','Promise','Uint8Array','TextEncoder','TextDecoder','CompressionStream','DecompressionStream','Blob','Response','btoa','atob','clearTimeout','setTimeout','undefined','Math','JSON']);
const helperAst=require('@babel/parser').parse(helpers,{sourceType:'script'});
require('@babel/traverse').default(helperAst,{ReferencedIdentifier(reference){
 const name=reference.node.name;
 assert(reference.scope.getBinding(name)||nativeGlobals.has(name),'Uncaptured canonical transport dependency: '+name);
}});
`);
replaceOnce("const submissionCode = between('const studioApi = window.AlloModules && window.AlloModules.StudioResponse;', 'const submissionData = {');", `
// Submission now lives in the canonical HostHandlers source, rather than the
// host shell. Extract its actual projection block and pure sanitizer by AST
// offsets; retain __d dependency reads through the supplied current fixture.
const submissionSource = read('host_handlers_source.jsx');
const submissionAst = require('@babel/parser').parse(submissionSource, {sourceType:'unambiguous',plugins:['jsx']});
const uniqueNode = (nodes, label) => { assert.equal(nodes.length,1,'Missing/ambiguous submission AST node: '+label); return nodes[0]; };
const handlerFactory = uniqueNode(submissionAst.program.body.filter(node=>node.type==='FunctionDeclaration'&&node.id?.name==='createHostHandlers'),'createHostHandlers');
const declaration = (body,name) => uniqueNode(body.filter(node=>node.type==='VariableDeclaration'&&node.declarations.some(entry=>entry.id?.name===name)),name);
const submitDeclaration = declaration(handlerFactory.body.body,'handleSubmitAssignment');
const submitFunction = uniqueNode(submitDeclaration.declarations.filter(entry=>entry.id?.name==='handleSubmitAssignment'),'handleSubmitAssignment initializer').init;
const studioDeclaration = declaration(submitFunction.body.body,'studioApi');
const submissionDataDeclaration = declaration(submitFunction.body.body,'submissionData');
assert(submissionDataDeclaration.start>studioDeclaration.end,'Submission projection AST boundaries changed');
const sanitizerDeclaration = declaration(handlerFactory.body.body,'sanitizeSubmissionData');
const submissionCode = submissionSource.slice(sanitizerDeclaration.start,sanitizerDeclaration.end)
 + '\\nconst __d={studentResponses,sanitizeSubmissionData};\\n'
 + submissionSource.slice(studioDeclaration.start,submissionDataDeclaration.start);
`);
replaceOnce('const filteredContent=resources,studentResponses=currentWork.studentResponses;const sanitizeSubmissionData=x=>x;${submissionCode}', 'const filteredContent=resources,studentResponses=currentWork.studentResponses;${submissionCode}');
replaceOnce("const files = ['memory_aid_module.js'", "const files = ['utils_pure_module.js', 'memory_aid_module.js'");
replaceOnce("assets.set('/helpers.js', 'const ALLO_MB_CHUNK_CHARS=60000;\\n' + helpers);", `
assets.set('/helpers.js', helpers);
// Native IndexedDB transactions. Only the idb-keyval adapter is supplied here;
// serialization, acknowledgement and read-back are production UtilsPure code.
assets.set('/native-idb.js', \`
window.__nativeDb = new Promise((resolve,reject) => {
 const request=indexedDB.open('classroom-reliability-synthetic',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('work');
 request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);
});
window.idbKeyval={
 get:async key=>{const db=await __nativeDb;return new Promise((resolve,reject)=>{const request=db.transaction('work').objectStore('work').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});},
 set:async(key,value)=>{const db=await __nativeDb;return new Promise((resolve,reject)=>{const tx=db.transaction('work','readwrite');tx.objectStore('work').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Native transaction aborted'));});}
};
\`);
`);
replaceOnce("const wav = Buffer.alloc(8044, 128);", "const wav = Buffer.alloc(8044, 128); for(let i=0;i<8000;i++) wav[44+i]=128+Math.round(36*Math.sin(2*Math.PI*440*i/8000));");
replaceSection('window.dbReady=new Promise(', 'window.startLearner=async()=>{', 'window.storageDB=AlloModules.UtilsPure.storageDB;\n');
replaceOnce("const html = '<!doctype html><html lang=\"en\"><head><title>Local studio delivery test</title></head>", "const html = '<!doctype html><html lang=\"en\"><head><title>Local classroom reliability acceptance</title><link rel=\"stylesheet\" href=\"/acceptance.css\"></head>");
replaceOnce("['react.js', 'react-dom.js', ...files, 'helpers.js', 'harness.js']", "['react.js', 'react-dom.js', 'native-idb.js', ...files, 'helpers.js', 'harness.js']");
replaceOnce(" server = http.createServer(async (req, res) => {", `
 // Capture the real desktop app baseline and config. Only content discovery is
 // scoped to the modules and HTML mounted here; preflight/theme/plugins remain
 // exactly those from the app rather than a custom harness reset.
 read('desktop/web-app/tailwind.config.js');
 const appTailwindConfig=requireFromApp('./tailwind.config.js');
 const indexCss=read('desktop/web-app/src/index.css');
 const css=await requireFromApp('postcss')([requireFromApp('tailwindcss')({
  ...appTailwindConfig,
  content:[...files.map(file=>({raw:assets.get('/'+file),extension:'jsx'})),
   {raw:assets.get('/harness.js'),extension:'js'},{raw:html,extension:'html'}],
 })]).process(indexCss,{from:path.join(root,'desktop/web-app/src/index.css')});
 assets.set('/acceptance.css',css.css);
 server = http.createServer(async (req, res) => {
`);
replaceOnce("if(assets.has(req.url)) {res.setHeader('Content-Type','application/javascript; charset=utf-8');", "if(assets.has(req.url)) {res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8');");
replaceOnce(" const teacher=await teacherContext.newPage(),student=await studentContext.newPage();await teacher.goto(origin);await student.goto(origin);", `
 let teacher=await teacherContext.newPage();const student=await studentContext.newPage();await teacher.goto(origin);await student.goto(origin);
 const teacherSave=await teacher.evaluate(async()=>{
  for(const resource of fixtures)await makeBridge(resource,true).prepare(AlloModules.ResourceReadAloud.enumerate(resource));
  const receipt=await AlloModules.UtilsPure.writeVerifiedStorageSnapshot(storageDB,'acceptance-teacher-history',fixtures);
  return {status:receipt.status,verified:receipt.verified,ids:receipt.snapshot.map(r=>r.id)};
 });
 assert.equal(teacherSave.status,'saved');assert.equal(teacherSave.verified,true);
 await teacher.close();teacher=await teacherContext.newPage();await teacher.goto(origin);
 const reopened=await teacher.evaluate(async()=>{
  const saved=await storageDB.get('acceptance-teacher-history',{throwOnError:true,localOnly:true});
  if(!Array.isArray(saved)||saved.length!==2)throw Error('Teacher history did not survive tab reopen');
  window.fixtures=saved;return {ids:saved.map(r=>r.id),hasAudio:saved.every(r=>!!r.karaokeAudio)};
 });
 assert.deepEqual(reopened.ids,teacherSave.ids);assert.equal(reopened.hasAudio,true);
`);
replaceOnce("const api=AlloModules.ResourceReadAloud;for(const resource of fixtures){const bridge=makeBridge(resource,true);await bridge.prepare(api.enumerate(resource));}", "const api=AlloModules.ResourceReadAloud;");
replaceOnce("for(const chunk of await (await fetch('/chunks')).json()){const joined=_alloCollectResChunk(store,chunk);if(joined)resources.push(JSON.parse(await _alloDecodeAlloPack(joined)));}", `for(const chunk of await (await fetch('/chunks')).json()){
   const joined=_alloCollectResChunk(store,chunk);
   if(joined){
    try{resources.push(JSON.parse(await _alloDecodeAlloPack(joined)));_alloFinishResChunk(store,chunk.rid,true);}
    catch(error){_alloFinishResChunk(store,chunk.rid,false);throw error;}
   }
  }
  if(Object.keys(store.pending||{}).length||store.applied.size!==resources.length)throw Error('Received chunk lifecycle did not commit successful decoding');`);
replaceOnce(" await student.reload();await student.locator('textarea[id$=\"-draft\"]').fill('Pull together — my gravity cue.');", `
 const uiNavigation=[];
 async function openMemoryDraft(page){
  const make=page.locator('nav.memory-aid-no-print').getByRole('button',{name:'Make it mine',exact:true});
  await make.waitFor({state:'visible'});await make.focus();await make.press('Enter');
  const draft=page.locator('textarea[id$="-draft"]');await draft.waitFor({state:'visible'});
  uiNavigation.push({resource:'delivery-memory',control:'Make it mine',activatedWith:'Enter',writingPaneVisible:true});
  return draft;
 }
 async function openAppliedResponse(page){
  const build=page.locator('nav.aps-stage-nav').getByRole('button',{name:'3. Build',exact:true});
  await build.waitFor({state:'visible'});await build.focus();await build.press('Enter');
  const response=page.locator('#applied-workspace-response');await response.waitFor({state:'visible'});
  uiNavigation.push({resource:'delivery-applied',control:'3. Build',activatedWith:'Enter',writingPaneVisible:true});
  return response;
 }
 await student.reload();await (await openMemoryDraft(student)).fill('Pull together — my gravity cue.');
`);
replaceOnce(" await student.getByLabel('Resource',{exact:true}).selectOption('delivery-applied');await student.getByRole('button',{name:'Show all steps',exact:true}).click();", " await student.getByLabel('Resource',{exact:true}).selectOption('delivery-applied');await openAppliedResponse(student);");
replaceOnce(" await student.reload();assert.equal(await student.locator('textarea[id$=\"-draft\"]').inputValue(),'Pull together — my gravity cue.');", " await student.reload();assert.equal(await (await openMemoryDraft(student)).inputValue(),'Pull together — my gravity cue.');");
replaceSection(" const playback=[];for(const id of ['delivery-memory','delivery-applied']){", " assert.equal(await student.locator('#applied-workspace-response').inputValue()", `
 const playback=[];for(const id of ['delivery-memory','delivery-applied']){
  await student.getByLabel('Resource',{exact:true}).selectOption(id);
  if(id==='delivery-applied'){
   const options=student.locator('details.aps-reading-options');
   const summary=options.locator('summary').first();await summary.waitFor({state:'visible'});
   if(await options.getAttribute('open')===null){await summary.focus();await summary.press('Enter');}
   await options.getByRole('button',{name:'Read reference aloud',exact:true}).waitFor({state:'visible'});
   uiNavigation.push({resource:id,control:'Read or listen',activatedWith:'Enter',readingPaneVisible:true});
  }
  await student.evaluate(()=>{
   window.nativePlayback=[];
   if(!window.originalPlay)window.originalPlay=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){
    const audio=this;
    const row={duration:0,maxTime:0,ended:false,error:null};window.nativePlayback.push(row);
    audio.addEventListener('loadedmetadata',()=>row.duration=audio.duration,{once:true});
    audio.addEventListener('timeupdate',()=>row.maxTime=Math.max(row.maxTime,audio.currentTime));
    audio.addEventListener('ended',()=>{row.ended=true;row.duration=audio.duration;row.maxTime=Math.max(row.maxTime,audio.currentTime);},{once:true});
    audio.addEventListener('error',()=>row.error=audio.error?.code||'native-media-error',{once:true});
    return window.originalPlay.call(audio).catch(error=>{row.error=String(error);throw error;});
   };
  });
  const read=student.getByRole('button',{name:'Read reference aloud',exact:true});
  await read.focus();assert(await read.evaluate(node=>node===document.activeElement));
  await read.press('Enter');
  const required=await student.evaluate(()=>AlloModules.ResourceReadAloud.enumerate(resources.find(r=>r.id===activeResourceId)).length);
  await student.waitForFunction(expected=>nativePlayback.filter(r=>r.ended).length===expected,required,{timeout:60000});
  await read.waitFor({state:'visible'});
  const result=await student.evaluate(()=>({clips:nativePlayback,synthesisCalls:window.synthesisCalls||0}));
  assert.equal(result.clips.length,required);assert.equal(result.synthesisCalls,0);
  assert(result.clips.every(row=>row.ended&&Number.isFinite(row.duration)&&row.duration>0&&row.maxTime>=row.duration*.9&&!row.error));
  playback.push({id,required,...result});
 }
 // Native keyboard cancellation; stopped audio must not be promoted to completion.
 const readAgain=student.getByRole('button',{name:'Read reference aloud',exact:true});
 await readAgain.focus();await readAgain.press('Enter');
 const stop=student.getByRole('button',{name:'Stop reading',exact:true});
 await stop.waitFor({state:'visible'});await stop.focus();await stop.press('Enter');
 await readAgain.waitFor({state:'visible'});
 const keyboardCancellation={activatedWith:'Enter',stoppedWith:'Enter',returnedToIdle:true};
 const baseline=await student.evaluate(()=>({dpr:devicePixelRatio,width:innerWidth}));
 await student.keyboard.press('Control+0');
 for(let i=0;i<4;i++)await student.keyboard.press('Control+Equal');
 const measured=await student.evaluate(()=>({dpr:devicePixelRatio,width:innerWidth}));
 const nativeZoom={status:measured.dpr>=baseline.dpr*1.8&&measured.width<=baseline.width*.6?'observed':'blocked',baseline,measured,
  limitation:'Chrome shortcuts are browser-dependent in automation; unchanged metrics are blocked, never a native-zoom pass.'};
 await student.keyboard.press('Control+0');
 const reflow=[];
 for(const width of [1280,320]){
  await student.setViewportSize({width,height:900});
  const bounds=await student.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  reflow.push({...bounds,passed:bounds.scrollWidth<=bounds.width+2});
  if(bounds.scrollWidth>bounds.width+2){
   const layout=await student.evaluate(()=>{
    const describe=node=>{
     const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
     return {tag:node.tagName.toLowerCase(),id:node.id,class:node.getAttribute('class')||'',ariaLabel:node.getAttribute('aria-label'),
      textSnippet:(node.innerText||node.textContent||'').replace(/\\s+/g,' ').trim().slice(0,180),
      rect:{x:rect.x,y:rect.y,left:rect.left,right:rect.right,width:rect.width,height:rect.height},
      clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,offsetWidth:node.offsetWidth,
      computed:{display:style.display,width:style.width,minWidth:style.minWidth,maxWidth:style.maxWidth,boxSizing:style.boxSizing,
       paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,marginLeft:style.marginLeft,marginRight:style.marginRight,
       overflowX:style.overflowX,whiteSpace:style.whiteSpace,position:style.position,flexShrink:style.flexShrink}};
    };
    const rows=[...document.querySelectorAll('body *')].filter(node=>{
     const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
     return rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none'
      &&(rect.right>innerWidth+2||rect.left<-2||node.scrollWidth>node.clientWidth+2);
    });
    return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollX,scrollY},activeResourceId:window.activeResourceId,
     focusedElement:document.activeElement?describe(document.activeElement):null,
     roots:[document.documentElement,document.body,document.getElementById('root'),document.querySelector('main')].filter(Boolean).map(describe),
     overflowingElementCount:rows.length,overflowingElements:rows.slice(0,160).map(describe),truncated:rows.length>160};
   });
   const out=path.join(root,'reports/classroom-reliability-next-2026-10-03/accessibility');fs.mkdirSync(out,{recursive:true});
   const screenshot=path.join(out,'reflow-failure-'+width+'.png');
   const diagnostic={passed:false,failedAt:new Date().toISOString(),failure:'Horizontal overflow at '+width+' CSS pixels',bounds,layout,
    partialAcceptance:{teacherSave,reopened,delivery,receipt,playback,uiNavigation,keyboardCancellation,nativeZoom,reflow,pageErrors:[...errors]},
    inputs:Object.fromEntries(inputs),screenshot,
    scope:'Failure evidence from the isolated synthetic learner harness. Completed checks are partial evidence, not final acceptance; production layout causation remains to be determined.'};
   try{await student.screenshot({path:screenshot,fullPage:true});}catch(error){diagnostic.screenshotError=String(error);}
   fs.writeFileSync(path.join(out,'reflow-failure-'+width+'.json'),JSON.stringify(diagnostic,null,2));
  }
  assert(bounds.scrollWidth<=bounds.width+2,'Horizontal overflow at '+width+' CSS pixels');
 }
 await openAppliedResponse(student);
`);
replaceOnce("assert(playback.every(p=>p.played>0&&p.synthesisCalls===0));", "assert(playback.every(p=>p.clips.length===p.required&&p.clips.every(clip=>clip.ended)&&p.synthesisCalls===0));");
replaceOnce(" const review=await teacher.evaluate(async()=>{const submission=", `
 const review=await teacher.evaluate(async()=>{
  const teacherStorageReadMiss=await storageDB.get('allo_student_work',{throwOnError:true,localOnly:true});
  const teacherDb=await window.__nativeDb;
  const teacherNativeStudentWorkRecordCount=await new Promise((resolve,reject)=>{
   const transaction=teacherDb.transaction('work','readonly');
   const request=transaction.objectStore('work').count('allo_student_work');
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   transaction.onabort=()=>reject(transaction.error||new Error('Teacher isolation read transaction aborted'));
  });
  const submission=
`);
replaceOnce("isolatedStorage:(await storageDB.get('allo_student_work'))===undefined", "teacherStorageReadMiss,teacherNativeStudentWorkRecordCount,isolatedStorage:teacherStorageReadMiss===null&&teacherNativeStudentWorkRecordCount===0");
replaceOnce("assert(review.isolatedStorage);", "assert.equal(review.teacherStorageReadMiss,null);assert.equal(review.teacherNativeStudentWorkRecordCount,0);assert(review.isolatedStorage);");
replaceOnce(" const report={passed:true,delivery,receipt,playback,", " const report={passed:true,completedAt:new Date().toISOString(),teacherSave,reopened,delivery,receipt,playback,uiNavigation,keyboardCancellation,nativeZoom,reflow,");
replaceOnce("teacherStorageIsolated:review.isolatedStorage,", "teacherStorageIsolated:review.isolatedStorage,teacherStorageIsolation:{productionReadMiss:review.teacherStorageReadMiss,nativeStudentWorkRecordCount:review.teacherNativeStudentWorkRecordCount},");
replaceOnce("scope:'Local loopback transport; real studio views and host autosave/codec/submission helpers. Synthetic silent WAV clips. Hosted services and manual assistive technology excluded.'", "scope:'Real studio views, production UtilsPure writer/read-back, native IndexedDB and media ended events, host autosave/codec/submission helpers. Supplied IDB adapter and loopback mailbox; synthetic non-silent 440Hz WAV clips. Not complete App shell, Canvas bridge, hosted services, semantic narration, physical speaker output, or manual assistive technology.'");
replaceOnce(" const out=path.join(root,'.tmp/studio-delivery-e2e');", `
 for(const [file,hash]of inputs)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file),'utf8')).digest('hex'),hash,'Input changed during acceptance: '+file);
 report.inputs=Object.fromEntries(inputs);
 const out=path.join(root,'reports/classroom-reliability-next-2026-10-03/accessibility');
`);


// Use actual initial hydration and current save effects. The predecessor runner
// preloaded work and forced readiness; neither bypass is used in this follow-up.
replaceSection("const saveCode = between(", "\n// Submission now lives in the canonical HostHandlers source,", `
const hostEffects=[];
require('@babel/traverse').default(ast,{CallExpression(p){
 if(p.node.callee.type==='Identifier'&&p.node.callee.name==='useEffect'&&p.parentPath.isExpressionStatement())hostEffects.push(anti.slice(p.parentPath.node.start,p.parentPath.node.end));
}});
const uniqueEffect=(list,label)=>{assert.equal(list.length,1,label);return list[0];};
const studentSave=uniqueEffect(hostEffects.filter(s=>s.includes('allo_student_work')&&s.includes('setStudentWorkStatus')&&!s.includes('initLocalData')),'actual learner autosave');
const studentHydrate=uniqueEffect(hostEffects.filter(s=>s.includes('allo_student_work')&&s.includes('initLocalData')),'actual learner hydration');
const studentRegion=between('  const [studentResponses, setStudentResponses] =','  const generationViewOwnerRef =');
const stateAst=require('@babel/parser').parse(studentRegion,{sourceType:'script'});
const studentState=stateAst.program.body.filter(n=>n.type==='VariableDeclaration').map(n=>studentRegion.slice(n.start,n.end)).join('\\n');
const saveCode=studentState+'\\nconst localDataHydrationGenerationRef=useRef(0);\\n'+studentSave+'\\n'+studentHydrate;
const gateNodes=ast.program.body.filter(n=>n.type==='FunctionDeclaration'&&n.id?.name==='_alloShouldSuppressLearnerDeviceStorage');
assert.equal(gateNodes.length,1,'canonical learner storage gate');
const storageGateCode=anti.slice(gateNodes[0].start,gateNodes[0].end);
`);
replaceOnce('window.preloaded=await storageDB.get(\'allo_student_work\');','');
replaceOnce('const isTeacherMode=false,showStudentEntry=false;const _alloShouldSuppressLearnerDeviceStorage=()=>false;',
 'const isTeacherMode=false,showStudentEntry=false,activeSessionCode=null,lzLoaded=true,isStorageDisabled=false;const inputText="Synthetic learner fixture";const _alloHasAnyStudentEntry=()=>false,_alloMbBridgeActive=()=>false;const setGlobalPoints=()=>{},setPointHistory=()=>{},setHasSavedAdventure=()=>{},addToast=()=>{},t=k=>k;${storageGateCode}');
replaceOnce(' const review=await teacher.evaluate(async()=>{', `
 await student.waitForFunction(()=>window.currentWork?.studentWorkStatus==='saved');
 const learnerPersistence=await student.evaluate(async()=>{
  const restored=await storageDB.get('allo_student_work',{throwOnError:true,localOnly:true});
  return {status:currentWork.studentWorkStatus,strictNativeReadbackMatches:JSON.stringify(restored)===JSON.stringify(currentWork.studentResponses),resourceCount:Object.keys(restored||{}).length,hydration:'actual production effect, no preload or forced readiness'};
 });
 assert.equal(learnerPersistence.status,'saved');assert(learnerPersistence.strictNativeReadbackMatches);assert.equal(learnerPersistence.resourceCount,2);
 const review=await teacher.evaluate(async()=>{
`);
replaceOnce(' const report={passed:true,completedAt:new Date().toISOString(),teacherSave,',' const report={passed:true,completedAt:new Date().toISOString(),teacherSave,learnerPersistence,');
replaceOnce('const html =', "new (require('node:vm').Script)(assets.get('/harness.js'),{filename:'actual-learner-harness.js'});\nconst html =");
replaceOnce(' server = http.createServer(async (req, res) => {', " if(process.argv.includes('--preflight')){console.log('Actual learner harness syntax and source extraction passed');return;}\n server = http.createServer(async (req, res) => {");

// Compile as the original module so relative resolution and __dirname remain
// correct. Exact anchors fail closed if the upstream harness changes.
const entry = new Module(upstream, module);
entry.filename = upstream;
entry.paths = Module._nodeModulePaths(path.dirname(upstream));
entry._compile(code, upstream);
