'use strict';
// Source-extracted regression proposal. Root runs this serially.
// This exercises production clear/fresh/snapshot logic; React setters are controlled.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const sourcePath = path.resolve(root, process.env.ALLO_RECOVERY_AUDIT_SOURCE || 'AlloFlowANTI.txt');
const source = fs.readFileSync(sourcePath, 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a && source.split(start).length === 2, 'Unique production anchors');
  return source.slice(a, b);
}
const recovery = new Function('window', section('const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage') + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const clearSource = section('  const clearCanvasWorkspaceState =', '  const hasMeaningfulWordSoundsWorkspace =');
const buildSource = section('  const buildCanvasWorkspaceSnapshot =', '  const restoreCanvasWorkspaceSnapshot =');
const freshSource = section('  const startFreshCanvasWorkspace =', '  const refreshStorageManagerInventory =');
const originalAnswers = { 'prior-resource': { reflection: 'Private previous workspace writing' } };
function createHarness() {
  const state = {
    window: {}, ALLO_WORKSPACE_RECOVERY: recovery,
    history: [{ id: 'prior-resource', type: 'quiz', title: 'Previous quiz', data: { questions: [] } }],
    studentResponses: structuredClone(originalAnswers), inputText: 'Previous lesson', sourceTopic: 'Previous topic',
    units: [], profiles: [], studentInterests: [], studentProgressLog: [], stickers: [],
    guidedSelectedIds: [], guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [], guidedDeliveryEvidence: {},
    wordSoundsHistory: [], wordSoundsFamilies: {}, wordSoundsAudioLibrary: {}, wordSoundsBadges: [], phonemeMastery: {},
    wordSoundsDailyProgress: { date: '2026-10-03', completed: 0, goalMet: false }, wordSoundsConfusionPatterns: {}, wordSoundsScore: { correct: 0, total: 0, streak: 0 },
    canvasRecoveryStoreRef: { current: { snapshots: [] } }, canvasRecoveryCurrentIdRef: { current: 'prior-workspace' },
    canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 },
    studentWorkHydrationGenerationRef: { current: 0 }, localDataHydrationGenerationRef: { current: 0 }, isStudentWorkLoaded: { current: true },
    ADVENTURE_INITIAL: {},
    _alloCaptureCanvasSelAuthoringState: () => ({}), _alloNormalizeResearchSettings: value => value,
    _alloNormalizeStudentProjectSettings: value => value || {},
    cancelActiveProjectLoad() {}, cancelActiveFileIntakeOperations() {}, resetAllMathRuntimeState() {},
    archiveLivePlan() {}, resetCanvasWorkspaceSettings() {}, resetGuidedProgress() {}, safeRemoveItem() {}, addToast() {},
    wsDispatch() {},
    invalidateLocalDataHydration() { state.localDataHydrationGenerationRef.current++; state.studentWorkHydrationGenerationRef.current++; state.isStudentWorkLoaded.current = true; }
  };
  const globalNames = new Set(['Date', 'String', 'Number', 'Boolean', 'Object', 'Array', 'JSON', 'Math', 'Promise', 'undefined']);
  const deps = new Proxy(state, {
    has(_target, key) { return !globalNames.has(key); },
    get(target, key) {
      if (key === Symbol.unscopables) return undefined;
      if (Object.prototype.hasOwnProperty.call(target, key)) return target[key];
      if (typeof key === 'string' && key.startsWith('set')) return value => {
        const name = key[3].toLowerCase() + key.slice(4);
        target[name] = typeof value === 'function' ? value(target[name]) : value;
      };
      return null;
    }
  });
  const api = new Function('deps', 'with(deps){' + clearSource + '\n' + buildSource + '\n' + freshSource + '\nreturn {clearCanvasWorkspaceState, buildCanvasWorkspaceSnapshot, startFreshCanvasWorkspace};}')(deps);
  return { state, ...api };
}
const results = [];
async function check(name, run) {
  try { await run(); results.push({ name, passed: true }); }
  catch (error) { results.push({ name, passed: false, error: String(error.message) }); }
}
(async () => {
  await check('Existing saved snapshot stays exact when fresh workspace starts', async () => {
    const harness = createHarness();
    const snapshot = await harness.buildCanvasWorkspaceSnapshot();
    assert.deepEqual(snapshot.workspace.projectState.responses, originalAnswers);
    const before = JSON.stringify(snapshot);
    harness.state.canvasRecoveryStoreRef.current.snapshots.push(snapshot);
    harness.startFreshCanvasWorkspace();
    assert.equal(JSON.stringify(snapshot), before);
    assert.deepEqual(snapshot.workspace.projectState.responses, originalAnswers);
    assert.equal(harness.state.canvasRecoveryStoreRef.current.snapshots[0], snapshot);
  });
  await check('Fresh workspace retires previous answers alongside previous resources', async () => {
    const harness = createHarness();
    harness.startFreshCanvasWorkspace();
    assert.deepEqual(harness.state.history, []);
    assert.equal(harness.state.inputText, '');
    assert.equal(harness.state.sourceTopic, '');
    assert.deepEqual(harness.state.studentResponses, {});
    assert.equal(harness.state.studentWorkHydrationGenerationRef.current, 1);
  });
  await check('New workspace snapshot cannot carry prior answers', async () => {
    const harness = createHarness();
    harness.startFreshCanvasWorkspace();
    harness.state.inputText = 'New lesson draft';
    const snapshot = await harness.buildCanvasWorkspaceSnapshot();
    assert.deepEqual(snapshot.workspace.projectState.responses, {});
    assert.equal(snapshot.workspace.inputText, 'New lesson draft');
    assert.notEqual(snapshot.id, 'prior-workspace');
  });
  const report = { completedAt: new Date().toISOString(), sourcePath, passed: results.every(item => item.passed), cases: results,
    scope: 'Actual production clear/fresh/snapshot functions and embedded recovery module; synchronous React setter boundaries. No full app, storage, encryption or browser assertion.' };
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.passed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
