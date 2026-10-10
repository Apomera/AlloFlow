'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const repo=process.argv[2]||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'word_sounds_setup_source.jsx'),'utf8');
const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert(start>=0&&end>start,'Production section: '+a);return source.slice(start,end);};
const lifecycle=section('        const startRunRef = React.useRef(false);',"        React.useEffect(() => {\n            if (isMinimized || typeof document");
const pack=section('        const packTtsSource = async (src, signal)', '        const compileActivityItems =');
const start=section('        const handleStart = async () => {','        if (isMinimized) {');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const data='data:audio/wav;base64,YQ==';
function fixture(overrides={}){
 const events=[],calls=[],cleanup=[],timers=new Map();let tid=0,compiled=null;
 const original=[{word:'cat',phonemes:['k','a','t'],image:'image:cat',_ttsAssets:{cached:{mime:'audio/wav',base64:'YQ=='}},activityItems:{old:{kept:true}}}];
 const ctx={AbortController,console,Uint8Array,btoa:x=>Buffer.from(x,'binary').toString('base64'),
  React:{useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>{const stop=fn();if(stop)cleanup.push(stop);}},
  setTimeout:(fn,ms)=>{const id=++tid;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  onClose:()=>events.push(['close']),wordPracticeControllerRef:{current:null},
  generationVoiceRef:{current:'af_heart'},previewList:['cat'],selectedIndices:new Set([0]),unsupportedSyllableWords:[],
  sessionType:'practice',prepareScope:'all',includeLessonPlan:false,lessonPlanOrder:[],lessonPlan:{},
  preloadedWords:original,packIsEnglish:false,wordSoundsLanguage:'en',gradeLevel:'K',effectiveImageTheme:'',
  ttsSpeed:1,includeAacImages:false,aacDefaultOn:false,onRequestKokoroOffer:null,
  probeActivitySel:'segmentation',probeStudentTrimmed:'',probeGradeLevel:'K',probeForm:'A',
  instructionalProfile:{},wordSoundsSessionGoal:30,orthoSessionGoal:0,imageVisibilityMode:'smart',
  normalizePackKey:value=>String(value||'').toLowerCase().trim(),isUnverifiedK2Word:()=>false,
  isUnusableAsPhonicsWord:()=>false,derivePackRhyme:()=>'',estimatePackPhonemes:()=>['k','a','t'],
  espeakPackPhonemes:async()=>{events.push(['espeak']);return ['k','a','t'];},
  tf:(key,fallback)=>fallback,warnLog:(...args)=>events.push(['warn',...args]),
  WS_CORE:{profileCheck:()=>({}),manipulationReady:()=>false,syllableReady:()=>false,wordFamilyInstruction:r=>'Words ending in '+r,packAudioProvenance:(profile,kind)=>({profile,kind})},
  setLessonPlanReorderStatus:x=>events.push(['lesson',x]),
  callGemini:async(...args)=>{events.push(['gemini',args]);return JSON.stringify({word:'cat',phonemes:['k','a','t']});},
  callImagen:null,
  compileActivityItems:items=>{compiled=items;items.forEach(item=>{item.activityItems={blending:{options:['cat','bat','hat','mat','sat','rat','vat','flat']}};});},
  callTTS:async(...args)=>{calls.push(args);return data;},
  onStartGame:(...args)=>events.push(['start',...args]),
  fetch:async()=>({ok:true,blob:async()=>({type:'audio/wav',arrayBuffer:async()=>new Uint8Array([97]).buffer})}),
 };
 for(const key of ['setIsProcessing','setGeneratedCount','setPrewarmCount','setPrewarmTotal'])ctx[key]=value=>events.push([key,typeof value==='function'?value(0):value]);
 Object.assign(ctx,overrides);
 vm.runInNewContext(lifecycle+'\n'+pack+'\n'+start+'\nthis.api={handleStart,handleGeneratorClose,cancelGeneration,generationControllerRef,generationEpochRef,startRunRef,generationMountedRef};',ctx,{filename:'production-word-sounds-studio.js'});
 return {ctx,api:ctx.api,events,calls,cleanup,timers,original,get compiled(){return compiled;},unmount(){cleanup.forEach(stop=>stop());}};
}
let passed=0;
async function check(name,body){await body();passed++;console.log('PASS '+name);}
(async()=>{
 await check('cancel aborts three in-flight requests, prevents queued requests, and blocks late progress/assets',async()=>{
  const pending=[],f=fixture({callTTS:(...args)=>{const d=deferred();pending.push({args,...d});return d.promise;}}),original=JSON.stringify(f.original);
  const run=f.api.handleStart();await flush();assert.equal(pending.length,3);assert.equal(JSON.stringify(f.original),original);
  f.api.handleGeneratorClose();await run;const after=f.events.length;
  assert(pending.every(p=>p.args[3].signal.aborted));assert.equal(f.api.generationControllerRef.current,null);
  pending.forEach(p=>p.resolve(data));await flush();assert.equal(pending.length,3);assert.equal(f.events.length,after);assert(!f.events.some(e=>e[0]==='start'));assert.equal(JSON.stringify(f.original),original);
 });
 await check('replacement run stays independent when canceled requests finish late',async()=>{
  const pending=[];let replacement=false;const f=fixture({callTTS:(...args)=>{if(replacement)return Promise.resolve(data);const d=deferred();pending.push({args,...d});return d.promise;}});
  const old=f.api.handleStart();await flush();const oldSignal=pending[0].args[3].signal;f.api.handleGeneratorClose();await old;
  replacement=true;await f.api.handleStart();assert.equal(f.events.filter(e=>e[0]==='start').length,1);const snapshot=JSON.stringify(f.events);
  pending.forEach(p=>{p.args[3].onResolvedProfile({provider:'stale'});p.resolve(data);});await flush();assert.equal(JSON.stringify(f.events),snapshot);assert(oldSignal.aborted);assert.equal(f.api.startRunRef.current,false);
 });
 await check('unmount aborts active generation without post-unmount state updates or restart',async()=>{
  const pending=[],f=fixture({callTTS:(...args)=>{const d=deferred();pending.push({args,...d});return d.promise;}});
  const run=f.api.handleStart();await flush();const count=f.events.length;f.unmount();await run;pending.forEach(p=>p.reject(Error('late error')));await flush();assert.equal(f.events.length,count);assert(pending.every(p=>p.args[3].signal.aborted));await f.api.handleStart();assert.equal(pending.length,3);
 });
 await check('bounded queue continues through all clips and preserves selected provider policy',async()=>{
  const pending=[];let active=0,max=0,finished=0;const f=fixture({callTTS:(...args)=>{const d=deferred();pending.push({args,finish(){active--;finished++;d.resolve(data);}});max=Math.max(max,++active);return d.promise;}});
  const run=f.api.handleStart();await flush();assert.equal(pending.length,3);assert(pending.every(p=>p.args[3].allowProviderFallback===false));
  f.ctx.generationVoiceRef.current='Kore';while(finished<pending.length){pending[finished].finish();await flush();}await run;
  assert.equal(max,3);assert(pending.length>3);assert(pending.slice(3).every(p=>p.args[1]==='Kore'&&p.args[3].allowProviderFallback===true));assert.equal(f.events.filter(e=>e[0]==='start').length,1);assert(f.compiled[0].ttsReady);assert.equal(f.compiled[0]._ttsCoverage.clips,pending.length+1);
 });
 await check('cancel during portable-audio fetch forwards the signal and discards the late blob',async()=>{
  const fetching=[],f=fixture({callTTS:async()=> 'blob:clip',fetch:(url,options)=>{const d=deferred();fetching.push({url,options,...d});return d.promise;}});
  const run=f.api.handleStart();await flush();assert.equal(fetching.length,3);f.api.handleGeneratorClose();await run;const after=f.events.length;assert(fetching.every(x=>x.options.signal.aborted));fetching.forEach(x=>x.resolve({ok:true,blob:async()=>{throw Error('Canceled blobs must not be read');}}));await flush();assert.equal(f.events.length,after);assert(!f.events.some(e=>e[0]==='start'));
 });
 await check('cancel during word analysis aborts Gemini and prevents fallback work',async()=>{
  const d=deferred();let args;const f=fixture({preloadedWords:[],callGemini:(...a)=>{args=a;return d.promise;}}),run=f.api.handleStart();await flush();assert(args[5] instanceof AbortSignal);f.api.handleGeneratorClose();await run;const after=f.events.length;assert(args[5].aborted);d.reject(Error('late analysis failure'));await flush();assert.equal(f.events.length,after);assert(!f.events.some(e=>e[0]==='espeak'||e[0]==='start'));assert.equal(f.calls.length,0);
 });
 await check('cancel during image generation aborts image request without rescue analysis',async()=>{
  const d=deferred();let args;const f=fixture({preloadedWords:[],callImagen:(...a)=>{args=a;return d.promise;}}),run=f.api.handleStart();await flush();assert(args[3].signal instanceof AbortSignal);f.api.handleGeneratorClose();await run;const after=f.events.length;assert(args[3].signal.aborted);d.resolve('image:late');await flush();assert.equal(f.events.length,after);assert(!f.events.some(e=>e[0]==='espeak'||e[0]==='start'));assert.equal(f.calls.length,0);
 });
 await check('cancel interrupts quota cooldown immediately and does not retry',async()=>{
  let calls=0;const f=fixture({callTTS:async()=>{calls++;throw Error('429 Rate Limit');}}),run=f.api.handleStart();await flush();assert([...f.timers.values()].some(x=>x.ms===15000));const before=calls;f.api.handleGeneratorClose();await run;assert.equal(f.timers.size,0);assert.equal(calls,before);assert(!f.events.some(e=>e[0]==='start'));
 });
 await check('ordinary clip failures remain partial results rather than canceling valid clips',async()=>{
  const f=fixture({callTTS:async text=>{if(text==='cat')throw Error('ordinary synthesis failure');return data;}});await f.api.handleStart();assert.equal(f.events.filter(e=>e[0]==='start').length,1);assert.equal(f.compiled[0].ttsReady,false);assert.equal(f.compiled[0]._ttsFailed,true);assert(f.compiled[0]._ttsCoverage.clips>1);assert.equal(f.api.generationControllerRef.current,null);
 });
 await check('duplicate prepare clicks cannot create another generation controller',async()=>{
  const pending=[],f=fixture({callTTS:(...args)=>{const d=deferred();pending.push({args,...d});return d.promise;}});const run=f.api.handleStart();await flush();const controller=f.api.generationControllerRef.current;await f.api.handleStart();assert.equal(f.api.generationControllerRef.current,controller);assert.equal(pending.length,3);f.api.handleGeneratorClose();await run;pending.forEach(p=>p.resolve(data));await flush();
 });
 console.log(`Passed ${passed} Studio cancellation regression groups.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
