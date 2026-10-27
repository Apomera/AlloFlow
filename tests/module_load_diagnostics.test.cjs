// Native Node tests execute the real host diagnostic factory, waiter and Blueprint entry.
// No network, AI, classroom transport, browser profile, or real-time waiting.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const source = readFileSync(resolve(root, hosts[0]), 'utf8');
function slice(text, start, end) {
  const a = text.indexOf(start); assert.notEqual(a, -1, start);
  const b = text.indexOf(end, a); assert.notEqual(b, -1, end);
  return text.slice(a, b);
}
const factory = text => slice(text, 'function _alloCreateModuleLoadDiagnostics(', 'function _alloModuleWatchdogShouldWait(');
const entry = text => slice(text, '  const blueprintCreationRequestRef = useRef(', '  // Stage 5 — rebuild');
const ensure = text => slice(text, '    window.__alloEnsureLazyModule = function(', '    // Shared word presentation');
const waiter = text => slice(text, '  const _alloAwaitModules = ', '  let __alloHostHandlersCache');
const required = { AgentCoreContracts: 'AgentCoreContracts', AgentCoreBlueprintService: 'AgentCoreBlueprintService', GenerationMatrix: 'GenerationMatrix', AgentCoreUIAdapter: 'AgentCoreUIAdapter', PhaseOHandlersModule: 'PhaseOHandlers' };
const plain = value => JSON.parse(JSON.stringify(value));
function harness(options = {}) {
  let now = 0, timerId = 0;
  const timers = new Map(), listeners = new Map(), classes = new Set(), reports = [], executions = [], promotions = [], toasts = [];
  const queued = new Set();
  function on(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); }
  function off(type, fn) { listeners.get(type)?.delete(fn); }
  function fire(type) { for (const fn of [...(listeners.get(type) || [])]) fn(); }
  const document = { hidden: false, body: { classList: { contains: name => classes.has(name) } }, addEventListener: on };
  const window = {
    document, AlloModules: {}, __alloModuleRegistry: {},
    __alloBuildStamp: { hash: '4173754e12', surface: 'canvas', hostLoaderRevision: '2026-10-21-stall-v2' },
    addEventListener: on, removeEventListener: off,
    __alloModuleSnapshot() { const rows = Object.entries(window.__alloModuleRegistry); return { pending: rows.filter(([,v]) => v.status === 'pending').map(([k]) => k), failed: rows.filter(([,v]) => v.status === 'failed').map(([k]) => k), queued: [...queued] }; },
    __alloPromoteModule(name) { promotions.push(name); queued.delete(name); window.__alloModuleRegistry[name] = { status: 'pending' }; return true; },
  };
  if (options.reporter !== false) window.AlloModules.ErrorReporter = { record: (level, message, stack, origin) => reports.push({ level, message, stack, origin }) };
  const plan = { resourcePlan: [{ tool: 'quiz', uiId: 'PRIVATE_STUDENT_CONTENT' }], source: 'PRIVATE_SOURCE_TEXT' };
  const context = vm.createContext({
    window, document, activeBlueprint: plan, gradeLevel: '6', leveledTextLanguage: 'English', outputLanguagePreference: { mode: 'app' }, currentUiLanguage: 'English', selectedLanguages: [], translationMode: 'none', standardsInput: '', studentInterests: [],
    Date: class extends Date { static now() { return now; } },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay, repeat: delay }); return id; },
    useRef: value => ({ current: value }), _alloPhaseOHandlersDeps: () => ({}),
    addToast: (message, level) => toasts.push({ message, level }),
  });
  vm.runInContext(factory(source) + "\nwindow.__alloModuleLoadDiagnostics = _alloCreateModuleLoadDiagnostics(window);", context);
  const diagnostics = window.__alloModuleLoadDiagnostics;
  for (const name of Object.keys(required)) diagnostics.register(name);
  function deliver(name) {
    let value = {};
    if (name === 'AgentCoreUIAdapter') value = { createUIAdapter() { return { prepareExecution: p => ({ ok: true, legacyConfig: p }) }; } };
    if (name === 'PhaseOHandlersModule') value = { handleExecuteBlueprint(deps) { executions.push(deps.activeBlueprint); return options.generate ? options.generate(deps) : { ok: true, status: 'completed' }; } };
    window.AlloModules[required[name]] = value; window.__alloModuleRegistry[name] = { status: 'loaded' }; queued.delete(name); diagnostics.progress(); fire('alloflow:module-registry-changed');
  }
  for (const name of options.ready || []) deliver(name);
  vm.runInContext("var __alloLazyEnsurePromises = {};\n" + ensure(source) + waiter(source) + entry(source) + "\nthis.execute = handleExecuteBlueprint;", context);
  function advance(ms) {
    const end = now + ms;
    let safety = 0;
    while (true) {
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
      if (!next) break;
      if (++safety > 10000) throw new Error('Timer loop');
      const [id,timer] = next; now = timer.at;
      if (timer.repeat) timers.set(id, { ...timer, at: now + timer.repeat }); else timers.delete(id);
      timer.fn();
    }
    now = end;
  }
  return { window, diagnostics, reports, executions, promotions, toasts, timers, queued, classes, plan, deliver, advance,
    run: () => context.execute(), trace: () => plain(window.__alloModuleLoadTrace),
    changePlan(value) { context.activeBlueprint = value; vm.runInContext('blueprintCreationRequestRef.current.blueprint = activeBlueprint;', context); },
    fail(name) { window.__alloModuleRegistry[name] = { status: 'failed' }; diagnostics.progress(); fire('alloflow:module-registry-changed'); },
    hidden(value) { document.hidden = value; fire('visibilitychange'); },
  };
}
const allReadyExceptMatrix = Object.keys(required).filter(n => n !== 'GenerationMatrix');

test('the three real host copies share every diagnostic path and include the host revision', () => {
  for (const p of hosts) {
    const s = readFileSync(resolve(root, p), 'utf8');
    assert.equal(factory(s), factory(source), p); assert.equal(entry(s), entry(source), p); assert.equal(ensure(s), ensure(source), p); assert.equal(waiter(s), waiter(source), p);
    assert.match(s, /hostLoaderRevision: '2026-10-21-stall-v2'/);
    assert.ok(s.includes('if (settledNow && window.__alloModuleLoadDiagnostics) window.__alloModuleLoadDiagnostics.progress()'));
    assert.ok(s.includes('window.__alloModuleLoadDiagnostics.startBackground()'));
  }
});
test('a ready plan has correlated preflight and execution outcomes without a warning or leftover timer', async () => {
  const h = harness({ ready: Object.keys(required) });
  assert.equal((await h.run()).ok, true);
  assert.deepEqual(h.trace().map(e => [e.stage,e.outcome]), [['blueprint-preflight','started'],['blueprint-preflight','ready'],['blueprint-generation','started'],['blueprint-generation','completed']]);
  assert.equal(new Set(h.trace().map(e => e.correlationId)).size, 1); assert.equal(h.reports.length,0); assert.equal(h.timers.size,0);
});
test('all five missing scripts produce one grouped 15-second warning despite repeated clicks', async () => {
  const h = harness(); const first = h.run(); const second = h.run();
  h.advance(14999); assert.equal(h.reports.length,0);
  h.advance(1); assert.equal(h.reports.length,1); assert.equal(h.reports[0].level,'warn');
  h.advance(20000); assert.equal(h.reports.length,1);
  for (const name of Object.keys(required)) h.deliver(name);
  await first; await second;
  assert.equal(h.executions.length,1); assert.equal(h.reports.length,2); assert.equal(h.reports[1].level,'info');
  assert.equal(h.trace().filter(e => e.stage === 'blueprint-preflight' && e.outcome === 'recovered').length,1);
});
test('the real 65-second preflight timeout records one error, preserves the plan and supports a new attempt', async () => {
  const h = harness({ ready: allReadyExceptMatrix }); const first = h.run();
  const rejection = assert.rejects(first, e => e.code === 'allo-lazy-module-timeout');
  h.advance(65000); await rejection;
  assert.equal(h.executions.length,0); assert.equal(h.plan.source,'PRIVATE_SOURCE_TEXT'); assert.equal(h.timers.size,0);
  assert.deepEqual(h.reports.map(x => x.level),['warn','error']);
  const firstId = h.trace().find(e => e.stage === 'blueprint-preflight').attemptId;
  const retry = h.run(); h.deliver('GenerationMatrix'); await retry;
  const starts = h.trace().filter(e => e.stage === 'blueprint-preflight' && e.outcome === 'started');
  assert.notEqual(starts[1].attemptId,firstId); assert.equal(h.executions.length,1);
});
test('a cancelled plan records cancellation and cannot execute stale work', async () => {
  const h = harness({ ready: allReadyExceptMatrix }); const run = h.run(); h.advance(15000); h.changePlan(null); h.deliver('GenerationMatrix');
  assert.equal((await run).status,'cancelled'); assert.equal(h.executions.length,0);
  assert.equal(h.trace().at(-1).outcome,'cancelled'); assert.deepEqual(h.reports.map(x => x.level),['warn','info']);
});
test('a cancelled preflight that times out finishes as cancellation, with no failure badge', async () => {
  const h = harness({ ready: allReadyExceptMatrix }); const run = h.run(); h.changePlan(null); h.advance(65000);
  assert.equal((await run).status,'cancelled'); assert.equal(h.executions.length,0);
  assert.equal(h.trace().at(-1).outcome,'cancelled'); assert.equal(h.reports.filter(x => x.level === 'error').length,0);
});
test('an individual lazy wait warns once and records its own terminal failure', async () => {
  const h = harness(); const waiting = h.window.__alloEnsureLazyModule('GenerationMatrix', () => h.window.__alloPromoteModule('GenerationMatrix'),'GenerationMatrix');
  const rejection = assert.rejects(waiting, e => e.code === 'allo-lazy-module-timeout');
  h.advance(65000); await rejection;
  assert.deepEqual(h.reports.map(x => x.level),['warn','error']); assert.equal(h.trace().at(-1).outcome,'timeout');
});
test('a failed dependency logs safe status before returning the existing retryable error', async () => {
  const h = harness({ ready: allReadyExceptMatrix }); const run = h.run(); const rejection = assert.rejects(run,e=>e.code==='allo-lazy-module-failed'); h.fail('GenerationMatrix'); await rejection;
  assert.equal(h.reports.length,1); assert.equal(h.reports[0].level,'error'); assert.equal(h.executions.length,0);
});
test('unknown stages, fields, module names, build URLs and lesson data never enter diagnostics', async () => {
  const h = harness({ ready: Object.keys(required), generate() { throw new Error('SECRET_PROVIDER_RESPONSE sk-private-key PRIVATE_STUDENT_CONTENT'); } });
  h.window.__alloBuildStamp = { hash: 'https://example.com/?key=SECRET', surface: 'PRIVATE_STUDENT_CONTENT', source: h.plan.source };
  assert.equal(h.diagnostics.start('PRIVATE_SOURCE_TEXT',['GenerationMatrix']),null);
  const diagnostic = h.diagnostics.start('module-wait',['GenerationMatrix','PRIVATE_STUDENT_CONTENT','https://secret']); diagnostic.finish('ready');
  await assert.rejects(h.run(),/SECRET_PROVIDER_RESPONSE/);
  const output = JSON.stringify({ trace:h.trace(), reports:h.reports });
  for (const secret of ['PRIVATE_SOURCE_TEXT','PRIVATE_STUDENT_CONTENT','SECRET_PROVIDER_RESPONSE','sk-private-key','https://']) assert.equal(output.includes(secret),false,secret);
  assert.equal(h.trace().at(-1).build.cdn,'unknown'); assert.equal(h.trace().at(-1).build.surface,'unknown');
});
test('the trace and pre-reporter handoff remain bounded and terminal updates deduplicate', () => {
  const h = harness({ reporter:false });
  for (let i=0;i<50;i++) { const d=h.diagnostics.start('module-wait',['GenerationMatrix']); d.slow(); d.slow(); d.finish('timeout'); d.finish('failed'); }
  assert.equal(h.trace().length,60); assert.equal(h.window.__alloPendingErrorReports.length,20); assert.equal(h.timers.size,0);
  assert.ok(h.window.__alloPendingErrorReports.every(x=>x.source==='module-load-diagnostics' && !x.stack));
});
test('visible background work warns only after 30 seconds without a settlement, once per episode', () => {
  const h=harness(); h.queued.add('GenerationMatrix'); h.diagnostics.startBackground();
  h.advance(25000); h.diagnostics.progress(); h.advance(25000); assert.equal(h.reports.length,0);
  h.advance(5000); assert.equal(h.reports.length,1); assert.equal(h.trace().at(-1).elapsedMs,30000);
  h.advance(60000); assert.equal(h.reports.length,1);
  h.diagnostics.progress(); assert.equal(h.reports.length,2); assert.equal(h.trace().at(-1).outcome,'recovered');
  h.advance(30000); assert.equal(h.reports.length,3);
});
test('hidden tabs and deliberately parked launch/setup queues do not become stalls', () => {
  for (const mode of ['hidden','alloflow-launchpad-active','alloflow-workspace-concealed']) {
    const h=harness(); h.queued.add('GenerationMatrix'); if(mode==='hidden') h.hidden(true); else h.classes.add(mode);
    h.diagnostics.startBackground(); h.advance(120000); assert.equal(h.reports.length,0,mode);
    if(mode==='hidden') h.hidden(false); else h.classes.delete(mode);
    h.advance(30000); assert.equal(h.reports.length,0,mode+' begins a fresh visible clock');
    h.advance(5000); assert.equal(h.reports.length,1,mode);
  }
});
test('cleared work recovers a background episode without another warning', () => {
  const h=harness(); h.queued.add('GenerationMatrix'); h.diagnostics.startBackground(); h.advance(30000); assert.equal(h.reports.length,1);
  h.queued.clear(); h.advance(60000); assert.deepEqual(h.reports.map(x=>x.level),['warn','info']); assert.equal(h.trace().at(-1).outcome,'recovered');
});
test('post-preflight generation is separately traced without a hard timeout or false module-loading error', async () => {
  let finish; const h=harness({ ready:Object.keys(required), generate:()=>new Promise(resolve=>{finish=resolve;}) });
  const run=h.run(); await Promise.resolve(); await Promise.resolve(); h.advance(240000);
  assert.equal(h.reports.length,0); assert.equal(h.trace().at(-1).stage,'blueprint-generation'); assert.equal(h.trace().at(-1).outcome,'started');
  finish({ok:true,status:'completed'}); await run; assert.equal(h.trace().at(-1).outcome,'completed');
});
