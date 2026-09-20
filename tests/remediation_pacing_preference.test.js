import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
const block = source.slice(source.indexOf('var _GEMINI_MAX_CONCURRENT = 3;'), source.indexOf('var _pulsePipelineWatchdog'));
const pulse = source.slice(source.indexOf('var _pulsePipelineWatchdog ='), source.indexOf('// Quota-class errors reach'));
function harness({ pacing = true, canvas = true, local = false, exempt = false } = {}) {
  let now = 1000;
  const state = { pdfExtraRequestPacing: pacing, pdfStormBudgetMinutes: 1 };
  const emitted = [];
  const timers = new Map();
  let timerId = 0;
  const schedule = (fn, ms) => { const id = ++timerId; timers.set(id, { id, fn, ms }); return id; };
  const factory = new Function('warnLog', '_pipelineStats', '_pipeLog', 'setTimeout', 'clearTimeout', 'Date', '_usesLocalTextBackend', '_hostTransportProfile', '_s', 'window', '_activeRemediationProgress', '_emitRemediationProgress', '_rawCallGemini', block + pulse + `
    return { reset:_resetGeminiBreaker, pace:_applyGeminiPacing, acquire:_acquireGeminiSlot, release:_releaseGeminiSlot, pump:_geminiPump,
      info:_geminiThrottleInfo, wait:_geminiSyncWait, budget:_geminiStormBudget, resetBudget:_resetGeminiStormBudget,
      retryAfter:_geminiApplyRetryAfter, fail:_geminiNoteTransientFail, success:_geminiNoteSuccess, pulse:_pulsePipelineWatchdog,
      calm:waitForGeminiCalm, probe:function(fn){_geminiProbe=fn;},
      heldFail:function(){ _geminiLastAuthAttemptMs=60000; _geminiNoteAuthFail({}); },
      state:function(){return {cap:_geminiCap, max:_geminiEffectiveMax, gap:_geminiStaggerMs, window:_geminiRateWindowMs, queued:_geminiWaiters.length,inFlight:_geminiInFlight};}};
  `);
  const api = factory(()=>{}, {}, ()=>{}, schedule, id=>timers.delete(id), {now:()=>now}, ()=>local, ()=>exempt?{kind:'agent-bridge',pacingExempt:true}:null, ()=>state, {_isCanvasEnv:canvas}, {runId:'run',documentEpoch:1}, (id,patch)=>emitted.push(patch), ()=>Promise.resolve("OK"));
  api.reset();
  return {api,state,emitted,advance:ms=>{now+=ms;},
    timers:()=>[...timers.values()],
    fire:timer=>{timers.delete(timer.id);timer.fn();},
  };
}
describe('remediation pacing preference and recovery accounting',()=>{
  it('off removes proactive waiting without bypassing bounded concurrency or Retry-After',()=>{
    const h=harness({pacing:false}); h.api.pace(true);
    expect(h.api.state()).toMatchObject({max:3,gap:0,window:0});
    for(let i=0;i<10;i++){h.api.acquire();h.api.release();}
    expect(h.api.state().queued).toBe(0);
    h.api.retryAfter({retryAfterSec:45},null);h.api.acquire();
    expect(h.api.state()).toMatchObject({inFlight:0,queued:1});
    expect(h.api.wait()).toMatchObject({reason:'recovery',remainingMs:45000});
    h.advance(45000);h.api.pump();expect(h.api.state().inFlight).toBe(1);
    h.api.release();for(let i=0;i<4;i++)h.api.acquire();
    expect(h.api.state()).toMatchObject({inFlight:3,queued:1});
  });
  it('off still trips the error breaker',()=>{
    const h=harness({pacing:false});h.api.pace(true);
    for(let i=0;i<3;i++)h.api.fail({});
    expect(h.api.info().storming).toBe(true);expect(h.api.state().cap).toBe(1);
  });
  it('freezes the preference until the next safe run reset',()=>{
    const h=harness();h.api.pace(true);h.state.pdfExtraRequestPacing=false;h.api.pace(true);
    expect(h.api.state().window).toBe(180000);
    h.api.reset();h.api.pace(true);expect(h.api.state().window).toBe(0);
  });
  it('preserves local serial pacing and the host transport exemption',()=>{
    const local=harness({pacing:false,local:true});local.api.pace(true);
    expect(local.api.state()).toMatchObject({cap:1,max:1,gap:900,window:0});
    const bridge=harness({exempt:true});bridge.api.pace(true);
    expect(bridge.api.state()).toMatchObject({gap:0,window:0});
  });
  it('defaults known direct API hosts off and Canvas on when the preference is absent',()=>{
    for(const canvas of [false,true]){const h=harness({canvas});delete h.state.pdfExtraRequestPacing;h.api.reset();h.api.pace(true);expect(h.api.state().window).toBe(canvas?180000:0);}
  });
  it('clears held-failure state between documents',()=>{
    const h=harness();for(let i=0;i<3;i++){h.api.heldFail();h.advance(400000);}
    expect(h.api.info()).toMatchObject({holdStreak:3,holdGateArmed:true});
    h.api.reset();expect(h.api.info()).toMatchObject({holdStreak:0,holdGateArmed:false,storming:false});
  });
  it('reports preventive pacing separately from provider recovery',()=>{
    const h=harness();h.api.pace(true);
    for(let i=0;i<5;i++){h.api.acquire();h.api.release();h.advance(1000);}
    h.api.acquire();h.advance(120000);
    expect(h.api.wait()).toMatchObject({reason:'pacing',pacingMs:120000,recoveryMs:0});
    expect(h.api.budget().spentMs).toBe(0);
    h.api.pulse({runId:'run'},h.api.wait());
    expect(h.emitted.at(-1)).toMatchObject({status:'running',wait:{reason:'pacing'}});
    expect(h.emitted.at(-1).activity.message).toContain('Spacing out');
  });
  it('does not label capacity queueing as a service rate limit',()=>{
    const h=harness({pacing:false});for(let i=0;i<4;i++)h.api.acquire();
    h.advance(6000);h.api.pulse({runId:'run'},h.api.wait());
    expect(h.emitted.at(-1)).toMatchObject({status:'running',wait:{reason:'queue',queueMs:6000}});
  });
  it('counts elapsed recovery once across concurrent waiters and overlapping brakes',()=>{
    const h=harness();h.api.retryAfter({retryAfterSec:45});for(let i=0;i<3;i++)h.api.acquire();
    expect(h.api.budget().spentMs).toBe(0);
    h.advance(20000);expect(h.api.budget().spentMs).toBe(20000);
    h.api.retryAfter({retryAfterSec:45});h.api.pump();
    h.advance(40000);expect(h.api.budget()).toMatchObject({spentMs:60000,exhausted:true});
    h.api.resetBudget();expect(h.api.budget()).toMatchObject({spentMs:0,exhausted:false});
    h.advance(5000);h.api.pump();expect(h.api.budget().spentMs).toBe(5000);
  });
  it('does not charge idle time or late timer wakeups as recovery',()=>{
    const h=harness();h.api.retryAfter({retryAfterSec:45});h.advance(120000);
    expect(h.api.budget().spentMs).toBe(0);
    h.api.retryAfter({retryAfterSec:45});h.api.acquire();h.advance(120000);h.api.pump();
    expect(h.api.budget().spentMs).toBe(45000);
  });
  it('keeps Retry-After intact through partial and full recovery with pacing off',()=>{
    const h=harness({pacing:false});h.api.pace(true);
    for(let i=0;i<3;i++)h.api.fail({});
    h.api.retryAfter({retryAfterSec:120});h.api.acquire();
    h.api.success();
    expect(h.api.wait()).toMatchObject({reason:'recovery',remainingMs:120000});
    h.api.success();h.api.success();
    expect(h.api.state()).toMatchObject({cap:3,inFlight:0,queued:1});
    h.advance(119999);h.api.pump();
    expect(h.api.state()).toMatchObject({inFlight:0,queued:1});
    h.advance(1);h.api.pump();
    expect(h.api.state()).toMatchObject({inFlight:1,queued:0});
  });
  it('remembers a provider wait initially covered by a longer adaptive cooldown',()=>{
    const h=harness({pacing:false});
    for(let i=0;i<8;i++)h.api.fail({});
    expect(h.api.info().cooldownRemainingMs).toBe(72000);
    expect(h.api.retryAfter({retryAfterSec:45})).toBe(0);
    h.api.acquire();h.api.success();
    expect(h.api.info().cooldownRemainingMs).toBe(45000);
    expect(h.timers().map(t=>t.ms)).toEqual([45015]);
    h.api.success();h.api.success();
    h.advance(44999);h.api.pump();expect(h.api.state().inFlight).toBe(0);
    h.advance(1);h.api.pump();expect(h.api.state().inFlight).toBe(1);
  });
  it('does not replace a longer provider deadline with a later shorter header',()=>{
    const h=harness({pacing:false});for(let i=0;i<3;i++)h.api.fail({});
    h.api.retryAfter({retryAfterSec:120});h.advance(10000);
    h.api.retryAfter({retryAfterSec:15});h.api.success();
    expect(h.api.info().cooldownRemainingMs).toBe(110000);
  });
  it('still clears adaptive cooldowns after success when no provider wait remains',()=>{
    const h=harness({pacing:false});for(let i=0;i<8;i++)h.api.fail({});
    h.api.acquire();h.api.success();
    expect(h.api.info().cooldownRemainingMs).toBe(12000);
    expect(h.timers().map(t=>t.ms)).toEqual([12015]);
    h.api.success();h.api.success();
    expect(h.api.state()).toMatchObject({cap:3,inFlight:1,queued:0});
    expect(h.api.info().cooldownRemainingMs).toBe(0);
  });
  it('charges only the scheduled confirmation sleep when a hidden tab wakes late',async()=>{
    const h=harness({pacing:false});for(let i=0;i<3;i++)h.api.fail({});
    h.advance(12000);h.api.probe(async()=>true);
    const result=h.api.calm({maxWaitMs:240000});await Promise.resolve();
    expect(h.timers().map(t=>t.ms)).toEqual([1000]);
    h.advance(120000);h.fire(h.timers()[0]);
    expect(await result).toMatchObject({calm:true,probed:true});
    expect(h.api.budget()).toMatchObject({spentMs:1000,exhausted:false});
  });
  it('counts overlapping confirmation sleeps once and removes cancelled deadlines',async()=>{
    const h=harness({pacing:false});for(let i=0;i<3;i++)h.api.fail({});
    h.advance(12000);h.api.probe(async()=>true);
    const firstCtrl=new AbortController(),secondCtrl=new AbortController();
    const first=h.api.calm({signal:firstCtrl.signal});await Promise.resolve();
    h.advance(500);
    const second=h.api.calm({signal:secondCtrl.signal});await Promise.resolve();
    h.advance(250);secondCtrl.abort();
    expect(await second).toMatchObject({aborted:true});
    expect(h.api.wait()).toMatchObject({reason:'recovery',remainingMs:250,recoveryMs:750});
    h.advance(250);firstCtrl.abort();
    expect(await first).toMatchObject({aborted:true});
    h.advance(120000);
    expect(h.api.wait()).toMatchObject({reason:null,recoveryMs:1000});
    expect(h.timers()).toHaveLength(0);
  });
  it('unions recovery sleeps with a concurrent queued cooldown',async()=>{
    const h=harness({pacing:false});for(let i=0;i<3;i++)h.api.fail({});
    h.advance(12000);h.api.probe(async()=>true);
    const ctrl=new AbortController();const calm=h.api.calm({signal:ctrl.signal});await Promise.resolve();
    h.api.retryAfter({retryAfterSec:45});h.api.acquire();
    h.advance(500);ctrl.abort();expect(await calm).toMatchObject({aborted:true});
    h.advance(120000);h.api.pump();
    expect(h.api.budget().spentMs).toBe(45000);
    expect(h.api.state()).toMatchObject({queued:0,inFlight:1});
  });
  it('detaches old sleeps at reset and ignores their late callbacks during a new wait',async()=>{
    const h=harness({pacing:false});for(let i=0;i<3;i++)h.api.fail({});
    h.advance(12000);h.api.probe(async()=>true);
    const old=h.api.calm();await Promise.resolve();const staleTimer=h.timers()[0];
    h.advance(500);h.api.reset();
    expect(await old).toMatchObject({aborted:true});
    expect(h.timers()).toHaveLength(0);
    expect(h.api.budget().spentMs).toBe(0);
    for(let i=0;i<3;i++)h.api.fail({});h.advance(12000);
    const ctrl=new AbortController();const current=h.api.calm({signal:ctrl.signal});await Promise.resolve();
    h.advance(500);staleTimer.fn();
    expect(h.api.wait()).toMatchObject({reason:'recovery',remainingMs:500,recoveryMs:500});
    h.advance(250);ctrl.abort();expect(await current).toMatchObject({aborted:true});
    expect(h.api.budget().spentMs).toBe(750);
  });
  it('pins batch preference in persisted settings and both audit/fix invocations',()=>{
    expect(source).toContain('pdfExtraRequestPacing: _run.extraRequestPacing');
    expect(source).toContain("typeof _saved.pdfExtraRequestPacing === 'boolean' ? _saved.pdfExtraRequestPacing : true");
    expect(source.match(/extraRequestPacing: _batchSettings.pdfExtraRequestPacing/g)).toHaveLength(2);
  });
});

describe('host preference persistence and batch snapshot behavior',()=>{
  it('uses transport defaults and persists an explicit override across host remounts',()=>{
    const files=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
    for(const file of files){
      const host=readFileSync(file,'utf8');
      const init=host.split('\n').find(line=>line.includes('const [pdfExtraRequestPacing, setPdfExtraRequestPacing]'));
      const effect=host.split('\n').find(line=>line.includes("localStorage.setItem('alloflow_pdf_extra_pacing'"));
      const values=new Map();const storage={getItem:key=>values.get(key)??null,setItem:(key,val)=>values.set(key,val)};
      const read=new Function('localStorage','_isCanvasEnv','useState',init+'\nreturn pdfExtraRequestPacing;');
      expect(read(storage,true,fn=>[fn(),()=>{}])).toBe(true);
      expect(read(storage,false,fn=>[fn(),()=>{}])).toBe(false);
      new Function('localStorage','React','pdfExtraRequestPacing',effect)(storage,{useEffect:fn=>fn()},false);
      expect(read(storage,true,fn=>[fn(),()=>{}])).toBe(false);
    }
  });
  it('resumes with saved pacing instead of adopting a changed UI preference',()=>{
    const start=source.indexOf('    const _batchSettings = _saved ? {');
    const end=source.indexOf('    if (_saved)',start);
    const snapshot=new Function('_saved','_run','_s',source.slice(start,end)+'\nreturn _batchSettings;');
    expect(snapshot({pdfExtraRequestPacing:false},{extraRequestPacing:true},()=>({})).pdfExtraRequestPacing).toBe(false);
    expect(snapshot({pdfExtraRequestPacing:true},{extraRequestPacing:false},()=>({})).pdfExtraRequestPacing).toBe(true);
    expect(snapshot(null,{extraRequestPacing:false},()=>({})).pdfExtraRequestPacing).toBe(false);
    expect(snapshot({}, {extraRequestPacing:false},()=>({})).pdfExtraRequestPacing).toBe(true);
  });
});
