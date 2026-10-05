'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),sourceFile=path.resolve(root,process.argv[2]||'AlloFlowANTI.txt');
const raw=fs.readFileSync(sourceFile),source=raw.toString().replace(/\r\n/g,'\n');
const a=source.indexOf('  // Mailbox student loop: announce presence'),b=source.indexOf('  // Real-time upgrade: the student offers',a);assert(a>=0&&b>a);
const effect=source.slice(a,b);
const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const box=(values,n=4)=>({docs:[{p:'s'}],b:{down:{n,m:values.map(v=>[n,{v}])}}});
function mount(options={}){
 const timers=new Map(),events={},calls=[],docs=[],applied=[],toasts=[],pending=[],status=[];let nextTimer=1,cleanup,nudge,clock=0,active=0,maxActive=0;
 const refs={mbStudentCursorRef:{current:0},mbStudentConnectedRef:{current:false},mbNicknameRef:{current:'Learner'},mbHandRef:{current:false},mbRtcRef:{current:options.rtc||null},mbAnnounceRef:{current:null},mbPollNowRef:{current:null}};
 const env={...refs,useEffect(fn){cleanup=fn();},mbStudent:{url:'mailbox',uid:'learner',participant:'test',code:'ROOM'},
  Date:{now:()=>clock},ALLO_MB_POLL_MS:1000,setMbStudentStalled(v){status.push(v);},_alloMbStallTracker:()=>({ok:()=>false,fail:()=>true}),
  _alloMailboxCallWithRetry(url,payload){calls.push(payload);return Promise.resolve({ok:true});},
  _alloMailboxCall(url,payload){calls.push(payload);active++;maxActive=Math.max(maxActive,active);const d=deferred();pending.push(d);return d.promise.finally(()=>{active--;});},
  _alloMbRecvDocPs:()=>[{p:'s'}],_alloMbRecvDocsDelivered(v){docs.push(v);},addToast(...args){toasts.push(args);},
  applyMbDownPayload(v){applied.push(v);return options.delivery?.promise||Promise.resolve();},warnLog(){},_alloMbSetNudgeSender(fn){nudge=fn;},_alloNextPollDelay:()=>5000,
  setMbStudent(){},setMbJoinError(){},setMbJoinRetryable(){},
  setTimeout(fn,ms){const id=nextTimer++;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  document:{hidden:false,addEventListener(n,fn){events[n]=fn;},removeEventListener(n){delete events[n];}},
  window:{addEventListener(n,fn){events[n]=fn;},removeEventListener(n){delete events[n];}},
 };
 new Function(...Object.keys(env),effect)(...Object.values(env));
 return{refs,events,calls,docs,applied,toasts,pending,timers,get nudge(){return nudge;},get maxActive(){return maxActive;},clock(v){clock=v;},cleanup(){cleanup();},async runTimer(){const e=[...timers.entries()][0];assert(e);timers.delete(e[0]);e[1].fn();await flush();}};
}
const cases=[],check=(name,run)=>cases.push({name,run});
check('active polling delivers payloads, documents and advances cursor',async()=>{const h=mount();h.pending[0].resolve(box([{kind:'res',rid:'live'}]));await flush();assert.equal(h.refs.mbStudentCursorRef.current,4);assert.equal(h.applied[0].rid,'live');assert.equal(h.docs.length,1);assert.equal(h.toasts.length,1);assert.equal(h.timers.size,1);h.cleanup();});
check('network wake during receive coalesces into one immediate follow-up',async()=>{const h=mount();h.events.online();if(h.timers.size)await h.runTimer();assert.equal(h.maxActive,1);h.pending[0].resolve(box([]));await flush();assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,50);await h.runTimer();assert.equal(h.pending.length,2);h.pending[1].resolve(box([]));await flush();assert.equal([...h.timers.values()][0].ms,5000);h.cleanup();});
check('repeated network, visibility, bfcache and manual wakes create one follow-up',async()=>{const h=mount();for(let i=0;i<5;i++){h.events.online();h.events.visibilitychange();h.events.pageshow({persisted:true});h.refs.mbPollNowRef.current();}if(h.timers.size)await h.runTimer();assert.equal(h.maxActive,1);h.pending[0].resolve(box([]));await flush();assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,50);h.cleanup();});
check('receive finishing after cleanup cannot mutate docs, cursor, presence or resources',async()=>{const h=mount();h.cleanup();h.pending[0].resolve(box([{kind:'res',rid:'obsolete'}]));await flush();assert.equal(h.refs.mbStudentCursorRef.current,0);assert.equal(h.docs.length,0);assert.equal(h.applied.length,0);assert.equal(h.toasts.length,0);assert.equal(h.timers.size,0);});
check('cleanup during last async resource suppresses heartbeat and later scheduling',async()=>{const delivery=deferred(),h=mount({delivery});h.pending[0].resolve(box([{kind:'res',rid:'started'}]));await flush();const before=h.calls.length;h.clock(120000);h.cleanup();delivery.resolve();await flush();assert.equal(h.calls.length,before);assert.equal(h.timers.size,0);});
check('retired nickname announce callback cannot send old-session presence',async()=>{const h=mount();const announce=h.refs.mbAnnounceRef.current;h.cleanup();const before=h.calls.length;announce();await flush();assert.equal(h.calls.length,before);h.pending[0].resolve(box([]));await flush();});
check('retired nudge cannot send on a newly installed data channel',async()=>{const h=mount();const nudge=h.nudge;h.cleanup();const sent=[];h.refs.mbRtcRef.current={dc:{readyState:'open',send:v=>sent.push(v)}};nudge();assert.equal(sent.length,0);h.pending[0].resolve(box([]));await flush();});
check('current nickname announce and bridge nudge still use open RTC',async()=>{const sent=[],h=mount({rtc:{dc:{readyState:'open',send:v=>sent.push(JSON.parse(v))}}});h.refs.mbAnnounceRef.current();h.nudge();await flush();assert.equal(sent.filter(v=>v.kind==='student').length,2);assert.equal(sent.filter(v=>v.kind==='sdocv').length,1);h.cleanup();h.pending[0].resolve(box([]));await flush();});
check('failed receive releases polling latch and allows normal retry',async()=>{const h=mount();h.pending[0].reject(new Error('radio'));await flush();assert.equal(h.timers.size,1);await h.runTimer();assert.equal(h.pending.length,2);assert.equal(h.maxActive,1);h.pending[1].resolve(box([{kind:'res',rid:'retry'}]));await flush();assert.equal(h.applied[0].rid,'retry');h.cleanup();});
check('terminal session failure retires captured wake and announce before React cleanup',async()=>{const h=mount();const wake=h.events.online,announce=h.refs.mbAnnounceRef.current;const error=new Error('session ended');error.code='no-session';h.pending[0].reject(error);await flush();const before=h.calls.length;wake();announce();await flush();assert.equal(h.timers.size,0);assert.equal(h.calls.length,before);h.cleanup();});
const drainStart=source.indexOf('async function _alloDcSendDrained('),drainEnd=source.indexOf('\n}',drainStart)+2;assert(drainStart>=0&&drainEnd>drainStart);
function drain(timer){return new Function('setTimeout',source.slice(drainStart,drainEnd)+';return _alloDcSendDrained;')(timer);}
check('drain stops a buffered transfer once its connection owner is retired',async()=>{const waits=[],sent=[];let current=true;const dc={readyState:'open',bufferedAmount:5e6,send:v=>sent.push(v)};const work=drain(fn=>waits.push(fn))(dc,'old',4*1024*1024,()=>current);await flush();assert.equal(waits.length,1);current=false;dc.bufferedAmount=0;waits[0]();await work;assert.equal(sent.length,0);});
check('drain preserves default caller behavior and active sends',async()=>{const sent=[],dc={readyState:'open',bufferedAmount:0,send:v=>sent.push(v)};await drain(()=>{throw Error('unexpected wait');})(dc,'live');assert.deepEqual(sent,['live']);});
check('drain retains current closed-channel errors',async()=>{await assert.rejects(drain(()=>{} )({readyState:'closed',bufferedAmount:0,send(){throw Error('sent');}},'live'),/channel closed/);});
(async()=>{const results=[];for(const c of cases){try{await c.run();results.push({name:c.name,passed:true});}catch(error){results.push({name:c.name,passed:false,error:error.stack});}}const report={sourceFile,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),completedAt:new Date().toISOString(),actualEffect:true,passed:results.every(v=>v.passed),cases:results};if(process.argv[3])fs.writeFileSync(path.resolve(root,process.argv[3]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,checks:results.length,failed:results.filter(v=>!v.passed).map(v=>v.name)}));if(!report.passed)process.exitCode=1;})();
