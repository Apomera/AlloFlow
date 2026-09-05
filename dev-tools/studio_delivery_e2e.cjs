/** Local delivery regression. Run: node dev-tools/studio_delivery_e2e.cjs
 * Uses real studio, codec, transport, serialization and autosave code against
 * a loopback mailbox and a small IndexedDB adapter. No hosted service or TTS.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const anti = read('AlloFlowANTI.txt');
const ast = require('@babel/parser').parse(anti, { sourceType: 'unambiguous', plugins: ['jsx'] });
const names = ['_alloBase64UrlEncode', '_alloBase64UrlDecode', '_alloBytesToBase64Url', '_alloBase64UrlToBytes', '_alloEncodeAlloPack', '_alloDecodeAlloPack', '_alloSplitPackChunks', '_alloQuickHash', '_alloCollectResChunk', 'createLiveSessionRetryController'];
const helpers = names.map(name => { const n = ast.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === name); assert(n, name); return anti.slice(n.start, n.end); }).join('\n');
function between(start, end) { const a = anti.indexOf(start), b = anti.indexOf(end, a); assert(a >= 0 && b > a, start); return anti.slice(a, b); }
const saveCode = between('  const [studentResponses, setStudentResponses] = useState({});', '  const [generatedContent, _setGeneratedContent] = useState(null);')
  .replace('useState({})', 'useState(window.preloaded || {})').replace('const isStudentWorkLoaded = useRef(false);', 'const isStudentWorkLoaded = useRef(true);');
const submissionCode = between('const studioApi = window.AlloModules && window.AlloModules.StudioResponse;', 'const submissionData = {');
const files = ['memory_aid_module.js', 'applied_challenge_module.js', 'studio_response_module.js', 'resource_read_aloud_module.js', 'karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'live_aac_module.js', 'shared_activity_module.js', 'session_transport_module.js'];
const assets = new Map(files.map(f => ['/' + f, read(f)]));
assets.set('/react.js', read('desktop/web-app/node_modules/react/umd/react.development.js'));
assets.set('/react-dom.js', read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'));
assets.set('/helpers.js', 'const ALLO_MB_CHUNK_CHARS=60000;\n' + helpers);
const fixtures = [
  { id: 'delivery-memory', type: 'memory-aid', title: 'Gravity', data: { authorshipMode: 'teacher-provided', cards: [{ id: 'c1', target: 'Gravity', essentialFacts: ['Objects attract'], factVerified: true, factLocked: true, aiExample: 'Pull together', mapping: 'Pull means attraction', practiceAttempts: [{ answer: 'PRIVATE ATTEMPT' }] }] } },
  { id: 'delivery-applied', type: 'applied-challenge', title: 'Shelter', data: { title: 'Design shelter', scope: 'compact', brief: { drivingQuestion: 'How can it stay dry?', lockedLessonFacts: ['Water flows downhill'], factVerified: true, factLocked: true }, sourceExcerpt: 'PRIVATE SOURCE', supports: { phasePrompts: { response: 'Explain your design' } } } }
];
const wav = Buffer.alloc(8044, 128); wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(8000, 40);
assets.set('/harness.js', `
window.fixtures=${JSON.stringify(fixtures)};
window.strings=${read('ui_strings.js')};
window.warnLog=()=>{};
window.makeBridge=(resource,prepare=false)=>{
 const store=AlloModules.KaraokeAudioStore.createStore(); if(resource.karaokeAudio)store.hydrate(resource.karaokeAudio);
 return AlloModules.createReadAloudLegacyBridge({getResource:()=>resource,getStore:()=>store,getProfile:()=>({voice:'Kore',language:'English',synthesisRate:1,provider:'gemini',voiceResolverVersion:2}),normalize:s=>String(s||'').replace(/\\s+/g,' ').trim(),synthesize:async()=>{window.synthesisCalls=(window.synthesisCalls||0)+1;if(!prepare)throw Error('Unexpected learner synthesis');return {b64:'${wav.toString('base64')}',mime:'audio/wav'};},encode:async a=>a,persist:async({payload})=>resource.karaokeAudio=payload,enumerateResourceSegments:r=>AlloModules.ResourceReadAloud.enumerate(r)});
};
window.dbReady=new Promise((resolve,reject)=>{const req=indexedDB.open('studio-delivery-regression',1);req.onupgradeneeded=()=>req.result.createObjectStore('work');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});
window.storageDB={get:async key=>{const db=await dbReady;return new Promise((resolve,reject)=>{const req=db.transaction('work').objectStore('work').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});},set:async(key,value)=>{const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction('work','readwrite');tx.objectStore('work').put(value,key);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error);});}};
window.startLearner=async()=>{
 window.resources=JSON.parse(localStorage.getItem('resources'));window.preloaded=await storageDB.get('allo_student_work');
 window.bridges=Object.fromEntries(resources.map(r=>[r.id,makeBridge(r)]));window.__alloGetReadAloudAudioBridge=()=>bridges[window.activeResourceId];
 function App(){const {useState,useRef,useEffect,useCallback}=React;const isTeacherMode=false,showStudentEntry=false;const _alloShouldSuppressLearnerDeviceStorage=()=>false;
 ${saveCode}
 const [selected,setSelected]=useState(resources[0].id);const resource=resources.find(r=>r.id===selected);window.activeResourceId=resource.id;
 window.currentWork={studentResponses,studentWorkStatus};
 return React.createElement(React.Fragment,null,React.createElement('select',{'aria-label':'Resource',value:selected,onChange:e=>setSelected(e.target.value)},resources.map(r=>React.createElement('option',{key:r.id,value:r.id},r.title))),React.createElement(AlloModules.StudioResponse.Boundary,{key:resource.id,View:resource.type==='memory-aid'?AlloModules.MemoryAidView:AlloModules.AppliedChallengeView,generatedContent:resource,isTeacherMode:false,allowRuntimeAi:false,studentResponses,studentWorkStatus,onRetrySave:retryStudentWorkSave,t:key=>key.split('.').reduce((o,k)=>o?.[k],strings)||key,onResponseChange:(id,studio)=>setStudentResponses(prev=>({...prev,[id]:{studio}}))}));
 }
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
};
window.buildSubmission=()=>{const filteredContent=resources,studentResponses=currentWork.studentResponses;const sanitizeSubmissionData=x=>x;${submissionCode};return {kind:'alloflow-student-submission',schemaVersion:2,content:cleanContent,responses:submissionResponses};};
if(localStorage.getItem('resources'))startLearner();
`);
const html = '<!doctype html><html lang="en"><head><title>Local studio delivery test</title></head><body><div id="root"></div>' + ['react.js', 'react-dom.js', ...files, 'helpers.js', 'harness.js'].map(f => `<script src="/${f}"></script>`).join('') + '</body></html>';
const mailbox = { chunks: [], assignment: null, submission: null };
let browser, server;
(async () => {
 server = http.createServer(async (req, res) => {
  try {
   if(req.url === '/') { res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return; }
   if(assets.has(req.url)) {res.setHeader('Content-Type','application/javascript; charset=utf-8');res.end(assets.get(req.url));return;}
   const key=req.url.slice(1);if(!Object.hasOwn(mailbox,key)){res.writeHead(404).end();return;}
   if(req.method==='POST'){const parts=[];for await(const p of req)parts.push(p);mailbox[key]=JSON.parse(Buffer.concat(parts).toString());}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify(mailbox[key]));
  }catch(e){res.writeHead(500).end(String(e));}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required','--mute-audio']});
 const teacherContext=await browser.newContext(),studentContext=await browser.newContext();
 teacherContext.setDefaultNavigationTimeout(60000);studentContext.setDefaultNavigationTimeout(60000);
 const errors=[];for(const context of [teacherContext,studentContext]){await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());context.on('page',page=>page.on('pageerror',e=>{errors.push(e.message);console.error('Browser:',e.stack);}));}
 const teacher=await teacherContext.newPage(),student=await studentContext.newPage();await teacher.goto(origin);await student.goto(origin);
 const delivery=await teacher.evaluate(async()=>{
  const api=AlloModules.ResourceReadAloud;for(const resource of fixtures){const bridge=makeBridge(resource,true);await bridge.prepare(api.enumerate(resource));}
  window.canonicalBefore=JSON.stringify(fixtures);
  const serialize=r=>AlloModules.LiveAac.serializeResourceForStudentPack(r,{audioChannel:'qr',sanitizeHistoryForCloud:x=>x,stripUndefined:x=>x});
  const assignment=await AlloModules.SharedActivity.buildAssignmentPackEncoded({resourceIds:fixtures.map(r=>r.id)},{resolveAssignmentResources:()=>fixtures,serializeResourceForStudentPack:serialize,stripUndefined:x=>x,generateUUID:()=>crypto.randomUUID(),encodeAlloPack:_alloEncodeAlloPack,studentAiPolicyForShare:'off'});
  await fetch('/assignment',{method:'POST',body:JSON.stringify(assignment.encoded)});
  const chunks=[];const transport=AlloModules.SessionTransport.createMailboxTransport({seen:{},fingerprint:r=>_alloQuickHash(JSON.stringify(r)),pushItem:async r=>{if(!window.injectedSendFailure){window.injectedSendFailure=true;throw Error('Injected temporary delivery failure');}const parts=_alloSplitPackChunks(await _alloEncodeAlloPack(JSON.stringify(serialize(r))),180);parts.forEach((data,i)=>chunks.push({kind:'res',rid:r.id,part:i+1,of:parts.length,data}));}});
  const attempts=[];
  await new Promise((resolve,reject)=>{const retry=createLiveSessionRetryController({initialDelay:0,retryDelays:[10,20],publish:async()=>{const result=await transport.publishResources(fixtures);attempts.push(result);if(!result.failed){clearTimeout(watchdog);retry.dispose();resolve();}return result;},onError:error=>{clearTimeout(watchdog);retry.dispose();reject(error);}});const watchdog=setTimeout(()=>{retry.dispose();reject(Error('Automatic delivery did not recover within 60 seconds'));},60000);});
  const first=attempts[0],recovered=attempts[attempts.length-1],repeat=await transport.publishResources(fixtures);
  await fetch('/chunks',{method:'POST',body:JSON.stringify([...chunks].reverse().flatMap(c=>[c,c]))});
  return {first,recovered,attempts:attempts.length,repeat,chunks:chunks.length,referenceClips:fixtures.map(r=>api.enumerate(r).length),teacherUnchanged:JSON.stringify(fixtures)===canonicalBefore};
 });
 assert.equal(delivery.first.failed,1);assert.equal(delivery.recovered.failed,0);assert.equal(delivery.attempts,2);assert.equal(delivery.first.pushed+delivery.recovered.pushed,2);assert.equal(delivery.repeat.pushed,0);assert(delivery.teacherUnchanged);assert(delivery.chunks>2);
 const receipt=await student.evaluate(async()=>{
  const encoded=await (await fetch('/assignment')).json();const assignment=JSON.parse(await _alloDecodeAlloPack(encoded));
  const store={parts:{},applied:new Set()},resources=[];for(const chunk of await (await fetch('/chunks')).json()){const joined=_alloCollectResChunk(store,chunk);if(joined)resources.push(JSON.parse(await _alloDecodeAlloPack(joined)));}
  resources.sort((a,b)=>b.type.localeCompare(a.type));localStorage.setItem('resources',JSON.stringify(resources));
  return {resources:resources.length,policy:assignment.aiPolicy.studentAi,privateData:JSON.stringify(resources).includes('PRIVATE'),same:resources.every(r=>JSON.stringify(r)===JSON.stringify(assignment.resources.find(a=>a.id===r.id)))};
 });
 assert.deepEqual(receipt,{resources:2,policy:'off',privateData:false,same:true});
 await student.reload();await student.locator('textarea[id$="-draft"]').fill('Pull together — my gravity cue.');
 await student.waitForFunction(()=>currentWork.studentWorkStatus==='saved'&&currentWork.studentResponses['delivery-memory']?.studio.cards[0].studentDraft.includes('my gravity'));
 await student.getByLabel('Resource',{exact:true}).selectOption('delivery-applied');await student.getByRole('button',{name:'Show all steps',exact:true}).click();
 await student.locator('#applied-workspace-response').fill('Slope the roof so rain flows away.');await student.waitForFunction(()=>currentWork.studentWorkStatus==='saved'&&currentWork.studentResponses['delivery-applied']?.studio.workspace.response.includes('Slope'));
 await student.reload();assert.equal(await student.locator('textarea[id$="-draft"]').inputValue(),'Pull together — my gravity cue.');
 const playback=[];for(const id of ['delivery-memory','delivery-applied']){
  await student.getByLabel('Resource',{exact:true}).selectOption(id);
  await student.evaluate(()=>{window.playCount=0;const original=HTMLMediaElement.prototype.play;if(!window.originalPlay)window.originalPlay=original;HTMLMediaElement.prototype.play=function(){return window.originalPlay.call(this).then(()=>{window.playCount++;},e=>{window.playError=String(e);throw e;});};});
  await student.getByRole('button',{name:'Read reference aloud',exact:true}).click();await student.waitForFunction(()=>playCount>0);await student.getByRole('button',{name:'Stop reading',exact:true}).click();
  playback.push(await student.evaluate(()=>({played:playCount,synthesisCalls:window.synthesisCalls||0})));
 }
 assert.equal(await student.locator('#applied-workspace-response').inputValue(),'Slope the roof so rain flows away.');assert(playback.every(p=>p.played>0&&p.synthesisCalls===0));
 const submission=await student.evaluate(async()=>{const result=buildSubmission();await fetch('/submission',{method:'POST',body:JSON.stringify(result)});return result;});
 assert(!JSON.stringify(submission).includes('PRIVATE'));assert(!JSON.stringify(submission).includes('karaokeAudio'));
 const review=await teacher.evaluate(async()=>{const submission=await(await fetch('/submission')).json();const applied=fixtures.find(r=>r.type==='applied-challenge'),memory=fixtures.find(r=>r.type==='memory-aid');const appliedReview=AlloModules.AppliedChallenge.fromSubmission(applied.data,submission.responses,applied.id);const memoryReview=AlloModules.StudioResponse.project(memory,submission.content.find(r=>r.id===memory.id).data);return {appliedReview:appliedReview.data.workspace.response,memoryReview:memoryReview.data.cards[0].studentDraft,text:JSON.stringify(submission),canonicalUnchanged:JSON.stringify(fixtures)===canonicalBefore,isolatedStorage:(await storageDB.get('allo_student_work'))===undefined};});
 assert.equal(review.appliedReview,'Slope the roof so rain flows away.');assert.equal(review.memoryReview,'Pull together — my gravity cue.');assert(review.text.includes('my gravity cue'));assert(review.text.includes('Slope the roof'));assert(review.canonicalUnchanged);assert(review.isolatedStorage);assert.deepEqual(errors,[]);
 const report={passed:true,delivery,receipt,playback,persistence:'Both responses survive reload in learner IndexedDB',submission:'Both responses reach local teacher mailbox; no reference audio or private source/practice data',teacherStorageIsolated:review.isolatedStorage,pageErrors:errors,scope:'Local loopback transport; real studio views and host autosave/codec/submission helpers. Synthetic silent WAV clips. Hosted services and manual assistive technology excluded.'};
 const out=path.join(root,'.tmp/studio-delivery-e2e');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
