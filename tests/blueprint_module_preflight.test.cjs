// Native Node regression: run with `node --test tests/blueprint_module_preflight.test.cjs`.
// Exercise the actual Canvas host's module waiter and Blueprint entry point with
// controlled script delivery. No network, React mount, AI, or wall-clock waits.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const root = resolve(__dirname, '..');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const source = readFileSync(resolve(root, hosts[0]), 'utf8');
function between(text, start, end) {
  const from = text.indexOf(start);
  assert.notEqual(from, -1, start);
  const to = text.indexOf(end, from);
  assert.notEqual(to, -1, end);
  return text.slice(from, to);
}
const entrySource = text => between(text, '  const blueprintCreationRequestRef = useRef(', '  // Stage 5 — rebuild');
const waiterSource = between(source, '  const _alloAwaitModules = ', '  let __alloHostHandlersCache');
const ensureSource = between(source, '    window.__alloEnsureLazyModule = function(', '    // Shared word presentation');
const required = {
  AgentCoreContracts: 'AgentCoreContracts',
  AgentCoreBlueprintService: 'AgentCoreBlueprintService',
  GenerationMatrix: 'GenerationMatrix',
  AgentCoreUIAdapter: 'AgentCoreUIAdapter',
  PhaseOHandlersModule: 'PhaseOHandlers',
};

function harness(ready = []) {
  const listeners = new Map();
  const timers = new Map();
  const promoted = [];
  const toasts = [];
  const executed = [];
  const prepared = [];
  let timerId = 0;
  const window = {
    AlloModules: {}, __alloModuleRegistry: {},
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    __alloPromoteModule(name) { promoted.push(name); window.__alloModuleRegistry[name] = { status: 'pending' }; return true; },
  };
  const plan = { resourcePlan: [{ tool: 'quiz', uiId: 'discourse-quiz' }] };
  const context = vm.createContext({
    window, activeBlueprint: plan, gradeLevel: '8', leveledTextLanguage: 'English',
    standardsInput: '', studentInterests: [],
    addToast: (message, level) => toasts.push({ message, level }),
    _alloPhaseOHandlersDeps: () => ({}),
    useRef: value => ({ current: value }),
    setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  function notify() { for (const listener of [...(listeners.get('alloflow:module-registry-changed') || [])]) listener(); }
  function deliver(name) {
    let module = {};
    if (name === 'AgentCoreUIAdapter') module = {
      createUIAdapter() {
        // Match the real adapter's runtime dependencies. Its module can register
        // before these arrive, so checking only the adapter is not sufficient.
        assert.ok(window.AlloModules.AgentCoreContracts, 'AgentCoreContracts module is required');
        assert.ok(window.AlloModules.AgentCoreBlueprintService, 'AgentCoreBlueprintService module is required');
        return { prepareExecution(value) { prepared.push(value); return { ok: true, legacyConfig: value }; } };
      },
    };
    if (name === 'PhaseOHandlersModule') module = {
      handleExecuteBlueprint(deps) {
        if (!window.AlloModules.GenerationMatrix) return { ok: false, status: 'waiting' };
        executed.push(deps.activeBlueprint);
        return { ok: true, status: 'completed' };
      },
    };
    window.AlloModules[required[name]] = module;
    window.__alloModuleRegistry[name] = { status: 'loaded' };
    notify();
  }
  for (const name of ready) deliver(name);
  vm.runInContext('var __alloLazyEnsurePromises = {};\n' + ensureSource + waiterSource + entrySource(source) + '\nthis.execute = handleExecuteBlueprint;', context);
  return {
    run: options => context.execute(options), deliver, promoted, toasts, executed, prepared, timers, plan, window,
    pending: () => vm.runInContext('blueprintCreationRequestRef.current.pending', context),
    changePlan(value) { context.activeBlueprint = value; vm.runInContext('blueprintCreationRequestRef.current.blueprint = activeBlueprint;', context); },
    fail(name) { window.__alloModuleRegistry[name].status = 'failed'; notify(); },
    expire() { for (const { fn, delay } of [...timers.values()]) { assert.equal(delay, 65000); fn(); } },
  };
}

test('a ready overview promotes every creation dependency and executes the same click after all arrive', async () => {
  const h = harness(['AgentCoreUIAdapter', 'PhaseOHandlersModule']);
  const run = h.run();
  // Attach a rejection handler immediately so the pre-fix reproduction does
  // not leak an unhandled rejection while asserting the missing preflight.
  run.catch(() => {});
  assert.deepEqual(h.promoted, ['AgentCoreContracts', 'AgentCoreBlueprintService', 'GenerationMatrix']);
  h.deliver('AgentCoreBlueprintService');
  h.deliver('AgentCoreContracts');
  await Promise.resolve();
  assert.equal(h.prepared.length, 0);
  assert.equal(h.executed.length, 0);
  h.deliver('GenerationMatrix');
  assert.equal((await run).ok, true);
  assert.equal(h.executed.length, 1);
  assert.equal(h.executed[0], h.plan);
  assert.equal(h.timers.size, 0);
});

test('cold startup tolerates adapter and executor scripts registering before their dependencies', async () => {
  const h = harness();
  const run = h.run();
  run.catch(() => {});
  assert.deepEqual(h.promoted, Object.keys(required));
  h.deliver('AgentCoreUIAdapter');
  h.deliver('PhaseOHandlersModule');
  h.deliver('GenerationMatrix');
  h.deliver('AgentCoreBlueprintService');
  await Promise.resolve();
  assert.equal(h.prepared.length, 0);
  h.deliver('AgentCoreContracts');
  assert.equal((await run).status, 'completed');
  assert.equal(h.executed.length, 1);
});

test('failed dependency rejects visibly without generation and a later click retries successfully', async () => {
  const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
  const first = h.run();
  const rejection = assert.rejects(first, error => error.code === 'allo-lazy-module-failed');
  h.fail('GenerationMatrix');
  await rejection;
  assert.equal(h.prepared.length, 0);
  assert.equal(h.executed.length, 0);
  assert.match(h.toasts.at(-1).message, /Could not finish loading lesson generation tools/);
  const retry = h.run();
  assert.deepEqual(h.promoted, ['GenerationMatrix', 'GenerationMatrix']);
  h.deliver('GenerationMatrix');
  assert.equal((await retry).ok, true);
  assert.equal(h.executed.length, 1);
});

test('a script that never settles times out, preserves the plan, and permits a later retry', async () => {
  const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
  const first = h.run();
  const rejection = assert.rejects(first, error => error.code === 'allo-lazy-module-timeout');
  h.expire();
  await rejection;
  assert.equal(h.executed.length, 0);
  assert.equal(h.prepared.length, 0);
  assert.equal(h.plan.resourcePlan[0].uiId, 'discourse-quiz');
  assert.equal(h.timers.size, 0);
  const retry = h.run();
  h.deliver('GenerationMatrix');
  assert.equal((await retry).ok, true);
});

test('already ready tools execute without loading prompts or duplicate dispatch', async () => {
  const h = harness(Object.keys(required));
  assert.equal((await h.run()).ok, true);
  assert.deepEqual(h.promoted, []);
  assert.deepEqual(h.toasts, []);
  assert.equal(h.executed.length, 1);
});

test('repeated clicks during loading share one request and generate only once', async () => {
  const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
  const first = h.run();
  const second = h.run();
  assert.deepEqual(h.promoted, ['GenerationMatrix']);
  h.deliver('GenerationMatrix');
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
  assert.equal(h.executed.length, 1);
});

test('cancelling or replacing the reviewed plan during loading cannot start its stale request', async () => {
  for (const replacement of [null, { resourcePlan: [{ tool: 'glossary' }] }]) {
    const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
    const first = h.run();
    h.changePlan(replacement);
    h.deliver('GenerationMatrix');
    const result = await first;
    assert.equal(result.status, 'cancelled');
    assert.equal(result.reasonCode, 'blueprint-changed');
    assert.equal(h.executed.length, 0);
    assert.equal(h.prepared.length, 0);
  }
});

test('Canvas and both desktop host copies use the identical creation preflight', () => {
  for (const path of hosts.slice(1)) assert.equal(entrySource(readFileSync(resolve(root, path), 'utf8')), entrySource(source), path);
});

test('request-bound progress distinguishes tool preparation from generation without lesson content', async () => {
  const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
  h.plan.title = 'PRIVATE LESSON CANARY';
  h.window.__alloModuleLoadDiagnostics = { start: () => ({ id: 'ml-test-1', finish() {} }) };
  const snapshots = [];
  const run = h.run({ onProgress: progress => snapshots.push(progress) });
  assert.deepEqual(snapshots.map(progress => progress.phase), ['preparing-tools']);
  const request = h.pending();
  h.deliver('GenerationMatrix');
  assert.equal((await run).ok, true);
  assert.deepEqual(snapshots.map(progress => progress.phase), ['preparing-tools', 'generating']);
  assert.equal(snapshots[0].diagnosticId, 'ml-test-1');
  assert.equal(snapshots[1].diagnosticId, 'ml-test-1');
  assert.equal(snapshots[0].startedAt, snapshots[1].startedAt);
  assert.ok(snapshots[1].phaseStartedAt >= snapshots[0].phaseStartedAt);
  assert.deepEqual(Object.keys(snapshots[0]).sort(), ['diagnosticId', 'phase', 'phaseStartedAt', 'startedAt']);
  assert.doesNotMatch(JSON.stringify(snapshots), /PRIVATE LESSON CANARY|resourcePlan/);
  assert.equal(request.settled, true);
  assert.equal(request.listeners.size, 0);
});

test('joining the same preflight receives the current phase and shares its single execution', async () => {
  const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
  const firstPhases = [], secondPhases = [];
  const first = h.run({ onProgress: progress => { firstPhases.push(progress.phase); progress.phase = 'MUTATED'; } });
  const second = h.run({ onProgress: progress => secondPhases.push(progress.phase) });
  assert.deepEqual(firstPhases, ['preparing-tools']);
  assert.deepEqual(secondPhases, ['preparing-tools']);
  assert.deepEqual(h.promoted, ['GenerationMatrix']);
  const request = h.pending();
  h.deliver('GenerationMatrix');
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
  assert.deepEqual(secondPhases, ['preparing-tools', 'generating']);
  assert.equal(h.executed.length, 1);
  assert.equal(request.listeners.size, 0);
});

test('a failing progress listener cannot fail lesson execution and is removed on settlement', async () => {
  const h = harness(Object.keys(required));
  const run = h.run({ onProgress() { throw new Error('UI listener failed'); } });
  const request = h.pending();
  assert.equal((await run).ok, true);
  assert.equal(h.executed.length, 1);
  assert.equal(request.listeners.size, 0);
  assert.equal(request.settled, true);
});

test('failed or cancelled preflight clears callbacks and never reports generation', async () => {
  for (const cancel of [false, true]) {
    const h = harness(Object.keys(required).filter(name => name !== 'GenerationMatrix'));
    const snapshots = [];
    const run = h.run({ onProgress: progress => snapshots.push(progress) });
    const request = h.pending();
    if (cancel) {
      h.changePlan(null);
      h.deliver('GenerationMatrix');
      assert.equal((await run).status, 'cancelled');
    } else {
      const rejection = assert.rejects(run, error => error.code === 'allo-lazy-module-failed');
      h.fail('GenerationMatrix');
      await rejection;
    }
    assert.deepEqual(snapshots.map(progress => progress.phase), ['preparing-tools']);
    assert.equal(h.executed.length, 0);
    assert.equal(request.listeners.size, 0);
    assert.equal(request.settled, true);
  }
});

test('only bounded opaque diagnostic identifiers enter command progress', async () => {
  const h = harness(Object.keys(required));
  h.window.__alloModuleLoadDiagnostics = { start: () => ({ id: 'PRIVATE SOURCE CANARY', finish() {} }) };
  const snapshots = [];
  await h.run({ onProgress: progress => snapshots.push(progress) });
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every(progress => !Object.hasOwn(progress, 'diagnosticId')));
  assert.doesNotMatch(JSON.stringify(snapshots), /PRIVATE SOURCE CANARY/);
});
