'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sourceFile = path.resolve(root, process.argv[2] || 'AlloFlowANTI.txt');
const raw = fs.readFileSync(sourceFile), source = raw.toString().replace(/\r\n/g, '\n');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, 'Missing source boundaries: ' + start);
  return source.slice(a, b);
}
const firebaseAnchor = source.indexOf("          const assignmentId = _alloCleanQrAssignmentId(params.get('allo_assignment')");
const firebaseStart = source.lastIndexOf('  useEffect(() => {', firebaseAnchor);
assert(firebaseAnchor >= 0 && firebaseStart >= 0, 'Firebase effect anchor');
const effects = {
  firebase: section(source.slice(firebaseStart, firebaseAnchor), '  // Self-contained homework entry'),
  pack: section('  // Self-contained homework entry', '  // Mailbox live-session student entry'),
  hosted: section('  // Mailbox-hosted homework entry', '  useEffect(() => {\n      if (activeView ==='),
};
const invalidate = section('  const invalidateLocalDataHydration = ', '  const cancelActiveProjectLoad');
const protection = section('    const protectCanvasStudentEntry = () => {', '    if (isCanvasStudentEntry()) {');
const clears = {
  history: section('  const handleClearHistory = () => {', '  const sanitizeSubmissionData'),
  canvas: section('  const clearCanvasWorkspaceState = (options = {}) => {', '  const hasMeaningfulWordSoundsWorkspace'),
};
function deferred() { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; }
async function flush() { for (let n = 0; n < 30; n++) await Promise.resolve(); }
const resource = { id: 'delayed-assignment', type: 'simplified', data: 'Original assignment text' };
const packet = { resources: [resource], title: 'Delayed assignment', currentResourceId: resource.id };
function mount(kind) {
  const gate = deferred(), state = { history: [], generatedContent: null, pendingQrAssignmentResource: null, receivedDeliveryResources: [] }, calls = [], policies = [], toasts = [];
  let cleanup;
  const env = {
    useEffect(fn) { cleanup = fn(); }, URLSearchParams, JSON, Promise, String, Array, Date, Object, Number, Math,
    window: { location: { search: '?allo_assignment=assignment-A' } },
    localDataHydrationGenerationRef: { current: 10 }, studentWorkHydrationGenerationRef: { current: 10 },
    workspaceReplacementGenerationRef: { current: 0 },
    canvasRecoveryRestoreRequestRef: { current: null }, canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryVaultActionRequestRef: { current: null }, canvasRecoveryImportRequestRef: { current: null },
    canvasRecoveryMutationInProgressRef: { current: false },
    studentEntryRecoveryProtectedRef: { current: false }, canvasRecoveryBootCheckedRef: { current: false },
    canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 }, canvasRecoveryStoreRef: { current: { snapshots: [] } }, canvasRecoveryCurrentIdRef: { current: 'old-teacher-workspace' },
    ALLO_WORKSPACE_RECOVERY: { emptyStore: () => ({ snapshots: [] }), newId: () => 'student-entry' },
    receivedDeliveryResources: state.receivedDeliveryResources,
    isStudentWorkLoaded: { current: false }, pendingQrAssignmentOpenRequestRef: { current: null },
    _alloCleanQrAssignmentId: v => v, _alloReadQrFirebaseHandoff: () => ({ appId: 'class-A' }),
    _alloSetQrStudentAiPolicy(...args) { policies.push({ kind: 'pending', args }); },
    _alloApplyAuthoritativeStudentAiPolicy(...args) { policies.push({ kind: 'authoritative', args }); },
    _alloEnsureAuthenticatedUser: async () => ({ uid: 'student-A' }), db: {},
    doc: (...args) => args, getDoc: async () => ({ exists: () => true, data: () => packet }),
    hydrateSessionAssets: () => { calls.push('hydrate-assets'); return gate.promise; },
    _alloReadAlloPackParam: () => 'encoded', _alloDecodeAlloPack: () => { calls.push('decode'); return kind === 'hosted' ? Promise.resolve(JSON.stringify(packet)) : gate.promise; },
    _alloReadMailboxEntryParam: () => ({ u: 'mailbox', id: 'pack-A', k: 'join-only' }),
    _alloFetchMailboxPackParts: () => { calls.push('fetch-pack'); return gate.promise; },
    _alloMailboxCallWithRetry: async () => ({}), _alloAssignmentIsExpired: () => false,
    _alloStudentSafeResources: v => v, _alloNormalizeSharedRatingActivity: v => v,
    ALLO_QR_INCOMPLETE_MESSAGE: 'Incomplete QR', ADVENTURE_INITIAL: {},
    cancelActiveProjectLoad() { calls.push('cancel-project'); }, cancelActiveFileIntakeOperations() { calls.push('cancel-intake'); },
    resetAllMathRuntimeState() {}, resetCanvasWorkspaceSettings() {}, archiveLivePlan() {}, resetGuidedProgress() {}, wsDispatch() {},
    t: v => v, warnLog() {}, addToast(...args) { toasts.push(args); },
  };
  for (const name of new Set((Object.values(effects).join('\n') + Object.values(clears).join('\n') + invalidate + protection).match(/\bset[A-Z]\w+/g))) {
    env[name] = value => {
      const key = name[3].toLowerCase() + name.slice(4);
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      if (name === 'setPendingQrAssignmentResource') env.pendingQrAssignmentOpenRequestRef.current = state[key] ? { resource: state[key] } : null;
    };
  }
  env.invalidateLocalDataHydration = new Function(...Object.keys(env), invalidate + '\nreturn invalidateLocalDataHydration;')(...Object.values(env));
  const clearFns = {};
  for (const [kind, code] of Object.entries(clears)) clearFns[kind] = new Function(...Object.keys(env), code + '\nreturn ' + (kind === 'history' ? 'handleClearHistory' : 'clearCanvasWorkspaceState') + ';')(...Object.values(env));
  env.clearCanvasWorkspaceState = clearFns.canvas;
  const protectBootEntry = new Function(...Object.keys(env), protection + '\nreturn protectCanvasStudentEntry;')(...Object.values(env));
  new Function(...Object.keys(env), effects[kind])(...Object.values(env));
  return {
    state, calls, policies, toasts, env,
    clear(kind) { clearFns[kind](); }, protectBootEntry, cleanup() { cleanup?.(); },
    resolve() { gate.resolve(kind === 'firebase' ? [resource] : kind === 'hosted' ? { assembled: 'encoded' } : JSON.stringify(packet)); },
    reject() { gate.reject(new Error('Temporary assignment network outage')); },
  };
}
const checks = [];
for (const kind of ['firebase', 'pack', 'hosted']) {
  checks.push({ name: kind + ': current assignment succeeds', async run() {
    const h = mount(kind); await flush(); h.resolve(); await flush();
    assert.deepEqual(h.state.history, [resource]); assert.deepEqual(h.state.pendingQrAssignmentResource, resource); h.cleanup();
  }});
  for (const clearKind of ['history', 'canvas']) {
    checks.push({ name: kind + ': ' + clearKind + ' clear retires late successful entry', async run() {
      const h = mount(kind); await flush(); h.clear(clearKind); h.resolve(); await flush();
      assert.deepEqual(h.state.history, []); assert.equal(h.state.pendingQrAssignmentResource, null); assert.deepEqual(h.state.receivedDeliveryResources, []); h.cleanup();
    }});
    checks.push({ name: kind + ': ' + clearKind + ' clear suppresses late error feedback', async run() {
      const h = mount(kind); await flush(); h.clear(clearKind); const before = h.toasts.length; h.reject(); await flush();
      assert.equal(h.toasts.length, before); h.cleanup();
    }});
    checks.push({ name: kind + ': ' + clearKind + ' clear suppresses late authoritative policy update', async run() {
      const h = mount(kind); await flush(); h.clear(clearKind); const before = h.policies.filter(v => v.kind === 'authoritative').length;
      h.resolve(); await flush(); assert.equal(h.policies.filter(v => v.kind === 'authoritative').length, before); h.cleanup();
    }});
  }
  checks.push({ name: kind + ': unmount suppresses late history commit', async run() {
    const h = mount(kind); await flush(); h.cleanup(); h.resolve(); await flush(); assert.deepEqual(h.state.history, []);
  }});
  checks.push({ name: kind + ': unmount suppresses late authoritative policy update', async run() {
    const h = mount(kind); await flush(); h.cleanup(); const before = h.policies.filter(v => v.kind === 'authoritative').length;
    h.resolve(); await flush(); assert.equal(h.policies.filter(v => v.kind === 'authoritative').length, before);
  }});
  checks.push({ name: kind + ': ordinary boot history hydration preserves entry ownership', async run() {
    const h = mount(kind); await flush(); h.env.localDataHydrationGenerationRef.current += 1; h.resolve(); await flush();
    assert.deepEqual(h.state.history, [resource]); assert.deepEqual(h.state.pendingQrAssignmentResource, resource); h.cleanup();
  }});
}
(function appendBootProtectionChecks() {
  for (const kind of ['firebase', 'pack', 'hosted']) checks.push({ name: kind + ': actual delayed Canvas boot protection preserves initial entry', async run() {
    const h = mount(kind); await flush();
    const generation = h.env.workspaceReplacementGenerationRef.current;
    h.protectBootEntry();
    assert.equal(h.env.studentEntryRecoveryProtectedRef.current, true);
    assert.equal(h.env.workspaceReplacementGenerationRef.current, generation);
    assert.equal(h.env.localDataHydrationGenerationRef.current, 11);
    assert.equal(h.env.studentWorkHydrationGenerationRef.current, 11);
    assert.deepEqual(h.state.history, []);
    h.resolve(); await flush();
    assert.deepEqual(h.state.history, [resource]); assert.deepEqual(h.state.pendingQrAssignmentResource, resource); h.cleanup();
  }});
})();
(async () => {
  const cases = [];
  for (const check of checks) { try { await check.run(); cases.push({ name: check.name, passed: true }); } catch (error) { cases.push({ name: check.name, passed: false, error: error.stack }); } }
  const report = { sourceFile, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), completedAt: new Date().toISOString(), actualEffect: true, actualClears: true, passed: cases.every(v => v.passed), cases };
  if (process.argv[3]) fs.writeFileSync(path.resolve(root, process.argv[3]), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: cases.length, failed: cases.filter(v => !v.passed).map(v => v.name) }));
  if (!report.passed) process.exitCode = 1;
})();
