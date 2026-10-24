const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const source = readFileSync(resolve(root, hosts[0]), 'utf8');
function between(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start);
  return text.slice(a, b);
}
function fragments(text) {
  return {
    factory: between(text, 'function _alloCreateModuleLoadDiagnostics(', 'function _alloModuleWatchdogShouldWait('),
    watchdog: between(text, 'function _alloModuleWatchdogShouldWait(', 'function _alloMbStallTracker('),
    registry: between(text, '    var __alloModuleRegistry = (window.__alloModuleRegistry', '    window.__alloModuleReady = function('),
    loader: between(text, '    const __alloLoadModuleNow = (name, url) => {', '    const loadModule = (name, url) => {'),
    ensure: between(text, '    window.__alloEnsureLazyModule = function(', '    // Shared word presentation'),
    waiter: between(text, '  const _alloAwaitModules = ', '  let __alloHostHandlersCache'),
    entry: between(text, '  const blueprintCreationRequestRef = useRef(', '  // Stage 5 — rebuild'),
  };
}
const actual = fragments(source);
function harness({ hidden = true } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map(), listeners = new Map(), scripts = [], executions = [], reports = [];
  function schedule(fn, delay, ...args) { const id = ++nextId; timers.set(id, { at: now + delay, fn: () => fn(...args) }); return id; }
  const document = { hidden, body: { classList: { contains: () => false } }, createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild: s => scripts.push(s) } };
  const window = {
    document,
    AlloModules: {
      AgentCoreContracts: {}, AgentCoreBlueprintService: {},
      AgentCoreUIAdapter: { createUIAdapter: () => ({ prepareExecution: blueprint => ({ ok: true, legacyConfig: blueprint }) }) },
      PhaseOHandlers: { handleExecuteBlueprint: deps => { executions.push(deps.activeBlueprint); return { ok: true, status: 'completed' }; } },
      ErrorReporter: { record: (level, message) => reports.push({ level, message }) },
    },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { for (const fn of [...(listeners.get(event.type) || [])]) fn(event); },
  };
  const context = vm.createContext({
    window, document, Date: class extends Date { static now() { return now; } }, CustomEvent: class { constructor(type) { this.type = type; } },
    console: { log() {}, error() {} }, setTimeout: schedule, clearTimeout: id => timers.delete(id),
    activeBlueprint: { id: 'original-plan' }, gradeLevel: '6', leveledTextLanguage: 'English', standardsInput: '', studentInterests: [],
    useRef: value => ({ current: value }), _alloPhaseOHandlersDeps: () => ({}), addToast() {},
  });
  vm.runInContext("var __alloDeferredModuleNames={};var __alloLazyEnsurePromises={};var pluginCdnVersion='test';var localizeModuleUrl=u=>u;var moduleFallbackUrl=()=>'/fallback.js';var __alloModuleRegistered=name=>!!window.AlloModules[name];\n" + actual.factory + actual.watchdog + actual.registry + actual.loader + actual.ensure + actual.waiter + actual.entry + '\nthis.load=__alloLoadModuleNow;this.run=handleExecuteBlueprint;window.__alloModuleLoadDiagnostics=_alloCreateModuleLoadDiagnostics(window);', context);
  for (const name of ['GenerationMatrix','AgentCoreContracts','AgentCoreBlueprintService','AgentCoreUIAdapter','PhaseOHandlersModule']) window.__alloModuleLoadDiagnostics.register(name);
  window.__alloPromoteModule = name => { context.load(name, '/primary.js'); return true; };
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
      if (!next) break;
      const [id,t] = next; now = t.at; timers.delete(id); t.fn();
    }
    now = end;
  }
  return {
    window, document, scripts, executions, reports, timers, advance, schedule: (delay, fn) => schedule(fn, delay),
    run: () => context.run(), now: () => now,
    ready() { window.AlloModules.GenerationMatrix = {}; scripts.at(-1).onload(); },
    changePlan(value) { context.activeBlueprint = value; vm.runInContext('blueprintCreationRequestRef.current.blueprint=activeBlueprint;', context); },
    trackedWait(deadline, generation, watchdogGeneration) {
      window.__alloModuleRegistry.GenerationMatrix = { status: 'pending', loadGeneration: generation, watchdogGeneration, watchdogDeadlineAt: deadline };
      return window.__alloEnsureLazyModule('GenerationMatrix', () => true, 'GenerationMatrix');
    },
  };
}
function lateFallback(h) {
  h.advance(30000); h.document.hidden = false; h.advance(29000); h.scripts[0].onerror({});
  assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.watchdogDeadlineAt, 89000);
}

test('all host copies use the same tracked deadline policy and updated diagnostic revision', () => {
  for (const p of hosts) {
    const text = readFileSync(resolve(root,p),'utf8'); const copy = fragments(text);
    for (const key of Object.keys(actual)) assert.equal(copy[key],actual[key],p+':'+key);
    assert.match(text,/hostLoaderRevision: '2026-10-21-stall-v2'/);
  }
});
test('the actual primary/background/fallback path can complete at 80s without premature 65s rejection', async () => {
  const h = harness({hidden:false}); const first = h.run(); const repeated = h.run();
  h.advance(15000); assert.equal(h.reports.filter(r=>r.level==='warn').length,1);
  h.document.hidden=true; h.advance(15000); h.document.hidden=false; h.advance(29000); h.scripts[0].onerror({});
  h.advance(6000); let settled=false; first.then(()=>settled=true,()=>settled=true); await Promise.resolve(); assert.equal(settled,false); assert.equal(h.executions.length,0);
  h.advance(15000); h.ready(); assert.equal((await first).ok,true); await repeated;
  assert.equal(h.executions.length,1); assert.equal(h.reports.filter(r=>r.level==='warn').length,1); assert.equal(h.reports.filter(r=>r.level==='error').length,0);
  assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.watchdogDeadlineAt,0);
});
test('primary and fallback share exactly one background rearm; a failed fallback ends at 89s', async () => {
  const h=harness(); const run=h.run(); const rejected=assert.rejects(run,e=>e.code==='allo-lazy-module-failed');
  lateFallback(h); h.document.hidden=true; h.advance(30000); await rejected;
  assert.equal(h.now(),89000); assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.status,'failed'); assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.watchdogDeadlineAt,0); assert.equal(h.executions.length,0);
});
test('a fallback that receives the shared rearm rather than the primary is also allowed to finish', async () => {
  const h=harness({hidden:false}); const run=h.run(); h.advance(29000); h.scripts[0].onerror({}); h.document.hidden=true; h.advance(30000); h.document.hidden=false;
  assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.watchdogDeadlineAt,89000); h.advance(21000); h.ready(); assert.equal((await run).ok,true);
});
test('an export registered at exactly 65s wins even if its load notification has not arrived', async () => {
  const h=harness(); h.schedule(65000,()=>{h.window.AlloModules.GenerationMatrix={};}); const run=h.run();
  h.advance(30000); h.document.hidden=false; h.advance(5000); h.scripts[0].onerror({}); h.advance(30000);
  assert.equal((await run).ok,true); assert.equal(h.executions.length,1);
});
test('the watchdog failing exactly 65s wins over a generic waiter timeout', async () => {
  const h=harness(); const run=h.run(); const rejected=assert.rejects(run,e=>e.code==='allo-lazy-module-failed');
  h.advance(30000); h.document.hidden=false; h.advance(5000); h.scripts[0].onerror({}); h.advance(30000); await rejected;
  assert.equal(h.executions.length,0); assert.equal(h.window.__alloModuleRegistry.GenerationMatrix.status,'failed');
});
test('untracked or stale-generation waits retain the ordinary 65s limit', async () => {
  for (const [deadline,generation,watchdogGeneration] of [[undefined,1,1],[100000,2,1],[100000,undefined,undefined]]) {
    const h=harness({hidden:false}); const wait=h.trackedWait(deadline,generation,watchdogGeneration); const rejected=assert.rejects(wait,e=>e.code==='allo-lazy-module-timeout'); h.advance(65000); await rejected; assert.equal(h.timers.size,0);
  }
});
test('even a repeatedly moved live deadline cannot extend the wait beyond 95s', async () => {
  const h=harness({hidden:false}); const wait=h.trackedWait(100000,1,1); const rejected=assert.rejects(wait,e=>e.code==='allo-lazy-module-timeout');
  h.advance(65000); h.window.__alloModuleRegistry.GenerationMatrix.watchdogDeadlineAt=200000; h.advance(30000); await rejected;
  assert.equal(h.now(),95000); assert.equal(h.timers.size,0); assert.deepEqual(h.reports.map(r=>r.level),['warn','error']);
});
test('after a true timeout late scripts cannot execute the original plan; only a fresh click can', async () => {
  const h=harness({hidden:false}); h.window.__alloPromoteModule=()=>true; const first=h.run(); const rejected=assert.rejects(first,e=>e.code==='allo-lazy-module-timeout'); h.advance(65000); await rejected;
  h.window.AlloModules.GenerationMatrix={}; h.window.dispatchEvent({type:'alloflow:module-registry-changed'}); await Promise.resolve(); assert.equal(h.executions.length,0);
  assert.equal((await h.run()).ok,true); assert.equal(h.executions.length,1);
});
test('a changed plan cannot execute when an extended fallback eventually becomes ready', async () => {
  const h=harness(); const run=h.run(); lateFallback(h); h.advance(6000); h.changePlan(null); h.advance(15000); h.ready();
  assert.equal((await run).status,'cancelled'); assert.equal(h.executions.length,0);
});
test('a second attempt after timeout gets its own bounded wait rather than reviving the rejected one', async () => {
  const h=harness({hidden:false}); h.window.__alloPromoteModule=()=>true;
  const first=h.run(); const rejected=assert.rejects(first,e=>e.code==='allo-lazy-module-timeout'); h.advance(65000); await rejected;
  const second=h.run(); h.advance(10000); h.window.AlloModules.GenerationMatrix={}; h.window.dispatchEvent({type:'alloflow:module-registry-changed'});
  assert.equal((await second).ok,true); assert.equal(h.executions.length,1);
});
test('actual command context dependency bags pass current workspace history and scope refs', () => {
  for (const p of hosts) {
    const text=readFileSync(resolve(root,p),'utf8'), contextAt=text.indexOf('  const _alloCmdCtx = () => {');
    const start=text.indexOf('    return build({',contextAt)+'    return build('.length, end=text.indexOf('\n    });',start);
    assert.ok(start>contextAt && end>start); const objectSource=text.slice(start,end)+'\n    }';
    const history=[{id:'current-resource'}], canvasRecoveryCurrentIdRef={current:'current-workspace'};
    const scope=new Proxy({history,canvasRecoveryCurrentIdRef},{has:()=>true,get:(target,name)=>name===Symbol.unscopables?undefined:target[name]});
    const deps=new Function('scope','with(scope) { return ('+objectSource+'); }')(scope);
    assert.equal(deps.history,history,p); assert.equal(deps.canvasRecoveryCurrentIdRef,canvasRecoveryCurrentIdRef,p);
  }
});
