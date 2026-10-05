'use strict';
// Execute complete editable/generated factories and actual host hydration/
// invalidation closures. Render values are fixed; refs and setters are stable.
// Only storage, builder unpack/selection, view navigation and setters are controlled.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const repo = path.resolve(__dirname, '../../..');
const inputs = {
  host: path.resolve(process.env.RESTORE_HOST || path.join(repo, 'AlloFlowANTI.txt')),
  source: path.resolve(process.env.RESTORE_HANDLER_SOURCE || path.join(repo, 'host_handlers_source.jsx')),
  runtime: path.resolve(process.env.RESTORE_HANDLER_MODULE || path.join(repo, 'host_handlers_module.js')),
};
const bytes = Object.fromEntries(Object.entries(inputs).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]));
const host = bytes.host.replace(/\r\n/g, '\n');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from && source.indexOf(start, from + start.length) < 0, 'Unique actual source section: ' + start);
  return source.slice(from, to);
}
const recovery = new Function('window', section(host, 'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage') + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const invalidateSource = section(host, '  const invalidateLocalDataHydration =', '  const cancelActiveProjectLoad =');
const unmountSource = section(host, "    cancelActiveProjectLoad({ notifyLifecycle: false });\n    cancelActiveFileIntakeOperations('host-unmount');", '  const [outlineType, setOutlineType]');
const unmountInvalidateCall = unmountSource.match(/^    invalidateLocalDataHydration\([^;\n]*\);$/m)?.[0];
assert.ok(unmountInvalidateCall, 'Actual host unmount invalidation call is present');
const runUnmountInvalidation = new Function('invalidateLocalDataHydration', unmountInvalidateCall);
const hydrateSource = section(host, '  useEffect(() => {\n      if (!lzLoaded || isStorageDisabled || _alloShouldSuppressLearnerDeviceStorage(isTeacherMode, showStudentEntry, activeSessionCode)) return;', '  // Reading Ruler input lifecycle:');
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function scopeFor(values) { return new Proxy(values, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] }); }
function makeInvalidate(values) { return new Function('scope', 'with(scope) {\n' + invalidateSource + '\nreturn invalidateLocalDataHydration;\n}')(scopeFor(values)); }
function factory(name, window, timers) {
  const context = vm.createContext({ window, React: window.React, structuredClone, URLSearchParams, Blob, Buffer, Date,
    console: { log() {}, error() {} }, setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {} });
  vm.runInContext(name === 'source' ? bytes.source + '\nwindow.__factory = createHostHandlers;' : bytes.runtime, context);
  return name === 'source' ? window.__factory : window.AlloModules.HostHandlers;
}
function harness(name) {
  const state = { history: [], studentResponses: {}, inputText: '', activeView: 'input', generatedContent: null,
    canvasRecoverySaveStatus: 'idle', canvasRecoveryBusyId: null, canvasRecoveryError: '', canvasRecoveryRevision: 0,
    lastSaved: null, guidedMode: false, guidedStep: 0, globalPoints: 0, pointHistory: [], studentWorkLoadRevision: 0 };
  const timers = [], events = [], toasts = [], window = { React: {}, AlloModules: {}, __alloBuilderEditedPack: { html: 'preexisting-builder' } };
  const refs = {
    workspaceReplacementGenerationRef: { current: 0 }, localDataHydrationGenerationRef: { current: 0 }, studentWorkHydrationGenerationRef: { current: 0 }, isStudentWorkLoaded: { current: false },
    canvasRecoveryMutationInProgressRef: { current: false }, canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 },
    canvasRecoveryCurrentIdRef: { current: 'initial-workspace' }, canvasRecoveryStoreRef: { current: recovery.emptyStore() },
    canvasRecoveryRestoreRequestRef: { current: null },
    canvasRecoveryImportRequestRef: { current: null },
    canvasRecoveryVaultSyncRequestRef: { current: null },
    canvasRecoveryVaultActionRequestRef: { current: null },
  };
  const setters = {};
  const setterNames = new Set([...bytes.source.matchAll(/__d\.(set[A-Z]\w*)/g), ...hydrateSource.matchAll(/\b(set[A-Z]\w*)/g), ...invalidateSource.matchAll(/\b(set[A-Z]\w*)/g)].map(match => match[1]));
  for (const name of setterNames) {
    setters[name] = value => {
      const key = name.slice(3, 4).toLowerCase() + name.slice(4);
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      events.push({ name, value: state[key] });
    };
  }
  const deps = {
    ...refs, ...setters, ALLO_WORKSPACE_RECOVERY: recovery,
    resetAllMathRuntimeState: () => events.push({ name: 'resetAllMathRuntimeState' }),
    hydrateHistory: history => structuredClone(history),
    normalizeGuidedProgress: () => ({ guidedStep: 0, selectedIds: [], completedSteps: [], skippedSteps: [], createdHistoryIds: [], deliveryEvidence: {}, planBrief: null }),
    _alloNormalizeStudentProjectSettings: value => value || {}, _alloCreateDefaultStudentProjectSettings: () => ({}),
    _alloApplyCanvasSelAuthoringState: value => events.push({ name: 'applySel', value }),
    selectBuilderResources: history => ({ ready: true, ids: history.map(item => item.id) }),
    _getBuilderHistorySignature: () => 'controlled-signature',
    _unpackBuilderProjectDraft: async () => '<article>Restored builder</article>',
    _sanitizeBuilderProjectDraft: html => ({ html, signature: 'controlled-signature' }),
    handleRestoreView: item => { events.push({ name: 'handleRestoreView', id: item.id }); state.generatedContent = item; state.activeView = item.type; },
    setPendingQrAssignmentResource: value => events.push({ name: 'setPendingQrAssignmentResource', value }),
    cancelActiveProjectLoad: options => events.push({ name: 'cancelActiveProjectLoad', options }),
    cancelActiveFileIntakeOperations: reason => events.push({ name: 'cancelActiveFileIntakeOperations', reason }),
    addToast: (...args) => toasts.push(args), warnLog() {}, t: key => key,
  };
  const hydrationValues = {
    ...refs, ...setters, lzLoaded: true, isStorageDisabled: false, isTeacherMode: false, showStudentEntry: false, activeSessionCode: null,
    inputText: '', studentWorkSaveAttempt: 0, _alloShouldSuppressLearnerDeviceStorage: () => false,
    warnLog() {}, addToast: deps.addToast, t: deps.t,
  };
  const invalidate = makeInvalidate(hydrationValues);
  deps.invalidateLocalDataHydration = invalidate;
  const handlers = factory(name, window, timers)(deps);
  const item = { id: 'restored-quiz', type: 'quiz', title: 'Restored quiz', data: [] };
  const snapshot = recovery.normalizeSnapshot({ id: 'snapshot-one', savedAt: new Date().toISOString(), workspace: {
    history: [item], inputText: 'Restored input', sourceTopic: 'Restored topic', activeResourceId: item.id, activeView: 'quiz',
    projectState: { responses: { 'restored-quiz': { answer: 'Restored learner writing' } } },
    builderDraft: { version: 1, resourceIds: [item.id] },
  } });
  assert.ok(snapshot, 'Actual recovery normalizer accepts controlled snapshot');
  const restore = candidate => handlers.restoreCanvasWorkspaceSnapshot(candidate);
  const replace = () => {
    invalidate();
    state.history = [{ id: 'fresh-quiz', type: 'quiz', data: [] }]; state.studentResponses = { 'fresh-quiz': { answer: 'Fresh learner writing' } };
    state.inputText = 'Fresh input'; state.activeView = 'fresh-view'; state.generatedContent = { id: 'fresh-quiz', type: 'quiz', data: [] };
    state.canvasRecoverySaveStatus = 'idle'; state.canvasRecoveryError = 'Fresh status'; state.canvasRecoveryBusyId = null;
    refs.canvasRecoveryCurrentIdRef.current = 'fresh-workspace'; window.__alloBuilderEditedPack = { html: 'Fresh builder' };
  };
  const hydrate = (gates = {}) => {
    const calls = [];
    const values = { ...hydrationValues, storageDB: { get: async key => {
      calls.push(key);
      return Object.hasOwn(gates, key) ? gates[key] : null;
    } } };
    let cleanup;
    values.useEffect = callback => { cleanup = callback(); };
    new Function('scope', 'with(scope) {\n' + hydrateSource + '\n}')(scopeFor(values));
    return { calls, cleanup };
  };
  return { state, refs, deps, events, toasts, timers, window, snapshot, restore, replace, hydrate, invalidate,
    invalidateAtUnmount: () => runUnmountInvalidation(invalidate),
    runTimers() { for (const callback of timers.splice(0)) callback(); } };
}
const cases = [
  ['normal stored workspace restore applies writing, builder and deferred view', async h => {
    h.refs.canvasRecoveryStoreRef.current = recovery.upsert(h.refs.canvasRecoveryStoreRef.current, h.snapshot);
    const result = await h.restore(h.snapshot); assert.equal(result, true); h.runTimers();
    assert.equal(h.state.studentResponses['restored-quiz'].answer, 'Restored learner writing');
    assert.equal(h.window.__alloBuilderEditedPack.html, '<article>Restored builder</article>');
    assert.equal(h.state.generatedContent.id, 'restored-quiz'); assert.equal(h.state.activeView, 'quiz');
    assert.equal(h.state.canvasRecoverySaveStatus, 'saved'); assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false);
  }],
  ['invalid candidate preserves generation and outstanding work owners', async h => {
    const result = await h.restore(null); assert.equal(result, false);
    assert.equal(h.refs.workspaceReplacementGenerationRef.current, 0);
    assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 0);
    assert.equal(h.events.filter(x => ['cancelActiveProjectLoad', 'cancelActiveFileIntakeOperations', 'setPendingQrAssignmentResource'].includes(x.name)).length, 0);
  }],
  ['busy restore preserves existing owner and reports no successful restore', async h => {
    h.refs.canvasRecoveryMutationInProgressRef.current = true;
    const result = await h.restore(h.snapshot); assert.equal(result, false);
    assert.equal(h.refs.workspaceReplacementGenerationRef.current, 0); assert.equal(h.toasts.length, 0);
  }],
  ['accepted restore retires project, intake, pending assignment and hydration owners', async h => {
    await h.restore(h.snapshot);
    assert.ok(h.refs.workspaceReplacementGenerationRef.current > 0); assert.ok(h.refs.studentWorkHydrationGenerationRef.current > 0);
    assert.ok(h.events.some(x => x.name === 'setPendingQrAssignmentResource' && x.value === null));
    assert.ok(h.events.some(x => x.name === 'cancelActiveProjectLoad' && x.options?.notifyLifecycle === false));
    assert.ok(h.events.some(x => x.name === 'cancelActiveFileIntakeOperations'));
  }],
  ['late learner-work hydration cannot merge previous workspace responses after restore', async h => {
    const saved = deferred(); const hydration = h.hydrate({ allo_student_work: saved.promise }); await flush();
    assert.ok(hydration.calls.includes('allo_student_work')); await h.restore(h.snapshot);
    saved.resolve({ 'previous-quiz': { answer: 'Previous private writing' } }); await flush();
    assert.deepEqual(Object.keys(h.state.studentResponses), ['restored-quiz']); assert.equal(h.state.studentWorkLoadRevision, 0);
  }],
  ['late draft hydration cannot overwrite restored source and lesson settings', async h => {
    h.refs.isStudentWorkLoaded.current = true;
    const draft = deferred(); const hydration = h.hydrate({ allo_draft_content: draft.promise }); await flush();
    assert.ok(hydration.calls.includes('allo_draft_content')); await h.restore(h.snapshot);
    draft.resolve({ inputText: 'Previous source', gradeLevel: 'Previous grade' }); await flush();
    assert.equal(h.state.inputText, 'Restored input'); assert.equal(h.state.gradeLevel, '5th Grade');
    assert.ok(!h.toasts.some(args => args[0] === 'toasts.draft_restored'));
  }],
  ['clear or new workspace while builder decodes preserves fresh builder/view/status', async h => {
    const unpack = deferred(); h.deps._unpackBuilderProjectDraft = () => unpack.promise;
    const restoring = h.restore(h.snapshot); await flush(); h.replace();
    unpack.resolve('<article>Old builder completion</article>'); const result = await restoring; h.runTimers();
    assert.equal(result, false); assert.equal(h.window.__alloBuilderEditedPack.html, 'Fresh builder');
    assert.equal(h.state.generatedContent.id, 'fresh-quiz'); assert.equal(h.state.activeView, 'fresh-view');
    assert.equal(h.state.canvasRecoverySaveStatus, 'idle'); assert.equal(h.state.canvasRecoveryError, 'Fresh status');
    assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'fresh-workspace');
    assert.ok(!h.toasts.some(args => args[1] === 'success'));
  }],
  ['older builder rejection cannot reset or announce a replacement workspace', async h => {
    const unpack = deferred(); h.deps._unpackBuilderProjectDraft = () => unpack.promise;
    const restoring = h.restore(h.snapshot); await flush(); h.replace();
    unpack.reject(new Error('Old decode failure')); const result = await restoring; h.runTimers();
    assert.equal(result, false); assert.equal(h.window.__alloBuilderEditedPack.html, 'Fresh builder');
    assert.equal(h.state.canvasRecoverySaveStatus, 'idle'); assert.equal(h.state.canvasRecoveryError, 'Fresh status');
    assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'fresh-workspace'); assert.equal(h.state.activeView, 'fresh-view');
  }],
  ['queued restore view cannot reopen an old resource after authoritative replacement', async h => {
    assert.equal(await h.restore(h.snapshot), true); assert.ok(h.timers.length > 0);
    h.replace(); h.runTimers(); assert.equal(h.state.generatedContent.id, 'fresh-quiz'); assert.equal(h.state.activeView, 'fresh-view');
    assert.equal(h.events.filter(x => x.name === 'handleRestoreView').length, 0);
  }],
  ['hydrate read remains valid without a workspace replacement', async h => {
    const saved = deferred(); h.hydrate({ allo_student_work: saved.promise }); await flush();
    saved.resolve({ 'previous-quiz': { answer: 'Loaded writing' } }); await flush();
    assert.equal(h.state.studentResponses['previous-quiz'].answer, 'Loaded writing'); assert.equal(h.refs.isStudentWorkLoaded.current, true);
    assert.equal(h.state.studentWorkLoadRevision, 1);
  }],
  ['clear during builder decode releases the old restore lock for a new restore', async h => {
    const older = deferred(), newer = deferred(); let unpackCalls = 0;
    h.deps._unpackBuilderProjectDraft = () => (++unpackCalls === 1 ? older.promise : newer.promise);
    const first = h.restore(h.snapshot); await flush(); h.replace();
    assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false, 'Authoritative replacement releases the retired restore lock');
    const secondSnapshot = { ...h.snapshot, id: 'snapshot-two' };
    const second = h.restore(secondSnapshot); await flush();
    assert.equal(unpackCalls, 2, 'A new restore starts while the obsolete decoder remains pending');
    newer.resolve('<article>Newest builder</article>'); assert.equal(await second, true);
    older.resolve('<article>Old builder</article>'); assert.equal(await first, false);
    assert.equal(h.window.__alloBuilderEditedPack.html, '<article>Newest builder</article>');
    assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'snapshot-two');
  }],
  ['retired restore finally cannot release a newer in-progress restore', async h => {
    const older = deferred(), newer = deferred(); let unpackCalls = 0;
    h.deps._unpackBuilderProjectDraft = () => (++unpackCalls === 1 ? older.promise : newer.promise);
    const first = h.restore(h.snapshot); await flush(); h.replace();
    const second = h.restore({ ...h.snapshot, id: 'snapshot-two' }); await flush();
    assert.equal(unpackCalls, 2); assert.equal(h.state.canvasRecoveryBusyId, 'snapshot-two');
    older.resolve('<article>Retired builder</article>'); assert.equal(await first, false);
    assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, true, 'Only the newer request owns the lock');
    assert.equal(h.state.canvasRecoveryBusyId, 'snapshot-two', 'Older finally must not clear newer busy feedback');
    assert.ok(h.refs.canvasRecoveryRestoreRequestRef.current, 'The newer request still owns completion');
    newer.resolve('<article>Current builder</article>'); assert.equal(await second, true);
    assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false); assert.equal(h.state.canvasRecoveryBusyId, null);
  }],
  ['silent unmount invalidation retires restore ownership without lifecycle state writes', async h => {
    h.refs.canvasRecoveryRestoreRequestRef.current = {};
    h.refs.canvasRecoveryMutationInProgressRef.current = true;
    h.state.canvasRecoveryBusyId = 'obsolete-on-unmount';
    const before = h.events.length;
    h.invalidateAtUnmount();
    assert.equal(h.refs.canvasRecoveryRestoreRequestRef.current, null);
    assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false);
    assert.ok(h.refs.workspaceReplacementGenerationRef.current > 0);
    assert.equal(h.events.length, before, 'Unmount retirement operates on refs without publishing lifecycle state');
  }],
];
(async () => {
  const results = [];
  for (const name of ['source', 'runtime']) for (const [title, body] of cases) {
    try { const h = harness(name); await body(h); results.push({ factory: name, name: title, status: 'passed' }); }
    catch (error) { results.push({ factory: name, name: title, status: 'failed', error: error.message, stack: error.stack }); }
  }
  const report = { generatedAt: new Date().toISOString(), runner: 'native-node-actual-factories-and-hydration',
    inputs: Object.fromEntries(Object.entries(inputs).map(([key, file]) => [key, { path: file, sha256: sha(bytes[key]) }])),
    total: results.length, passed: results.filter(x => x.status === 'passed').length, failed: results.filter(x => x.status === 'failed').length, results };
  const destination = process.env.RESTORE_RESULT || path.join(__dirname, 'baseline-results.json');
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ total: report.total, passed: report.passed, failed: report.failed, destination }));
  process.exitCode = report.failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 2; });
