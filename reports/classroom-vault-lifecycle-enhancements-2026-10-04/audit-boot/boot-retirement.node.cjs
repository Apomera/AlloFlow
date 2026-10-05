'use strict';
// Exact canonical recovery boot effect. Each render gets fixed values; only the
// browser entry marker and React refs remain shared across effect cleanup/rerun.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..'), label = process.argv[2] || 'current';
const file = path.resolve(process.env.BOOT_HOST || path.join(root, 'AlloFlowANTI.txt'));
const raw = fs.readFileSync(file, 'utf8'), host = raw.replace(/\r\n/g, '\n');
function section(start, end) { const a = host.indexOf(start), b = host.indexOf(end, a); assert(a >= 0 && b > a && host.split(start).length === 2, 'unique section ' + start); return host.slice(a, b); }
const Recovery = new Function('window', section('const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage') + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
let effect = section('  useEffect(() => {\n    if (!lzLoaded) return;\n    // Student entry', '  const offlineHistoryWriteRef =');
if (label === 'candidate') {
  const before = '                canvasRecoveryStoreRef.current = store;\n                if (cancelled) return;\n                if (isCanvasStudentEntry()) { protectCanvasStudentEntry(); return; }';
  const after = '                if (cancelled) return;\n                if (isCanvasStudentEntry()) { protectCanvasStudentEntry(); return; }\n                canvasRecoveryStoreRef.current = store;';
  assert.equal(effect.split(before).length, 2, 'one exact final boot publication'); effect = effect.replace(before, after);
}
const checks = [];
function check(name, actual, expected) { try { assert.deepEqual(actual, expected); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, actual, expected, error: error.message }); } }
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function make(legacyMigrationComplete) {
  const snapshot = { version: 1, id: 'teacher-private', title: 'PRIVATE_TEACHER_RECOVERY', savedAt: '2026-10-04T00:00:00.000Z', workspace: { history: [], inputText: 'private teacher text' } };
  const saved = Recovery.normalizeStore({ version: 1, legacyMigrationComplete, snapshots: [snapshot] });
  const shared = { marker: false, migration: deferred(), migrationCalls: 0, states: {}, events: [], clearCalls: [], stage: 'teacher', storageGets: 0 };
  const refs = { canvasRecoveryBootCheckedRef: { current: false }, studentEntryRecoveryProtectedRef: { current: false }, isStudentWorkLoaded: { current: false }, canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 }, canvasRecoveryStoreRef: { current: Recovery.emptyStore() }, canvasRecoveryCurrentIdRef: { current: 'initial' } };
  const deviceStorage = { async get() { shared.storageGets++; return saved; }, async mutateRecovery() { shared.migrationCalls++; return shared.migration.promise; } };
  function runRender(student = false) {
    let cleanup;
    const values = { ...refs, lzLoaded: true, isCanvas: true, isTeacherMode: !student, activeSessionCode: student ? 'class-session' : null, isStorageDisabled: false, isHistoryLoaded: student, receivedDeliveryResources: [],
      _alloHasAnyStudentEntry: () => shared.marker, _alloMbBridgeActive: () => false, _alloGetCanvasDeviceStorage: async () => deviceStorage, _alloGetRecoveryVaultStack: async () => ({ vault: { isVaultStore: () => false } }),
      ALLO_WORKSPACE_RECOVERY: Recovery, ALLO_WORKSPACE_RECOVERY_NAMESPACE: 'recovery', ALLO_WORKSPACE_RECOVERY_KEY: 'store', warnLog() {},
      clearCanvasWorkspaceState(options) { shared.clearCalls.push(options); },
      useEffect(callback) { cleanup = callback(); },
    };
    for (const setter of new Set([...effect.matchAll(/\b(set[A-Z]\w*)\(/g)].map(match => match[1]))) values[setter] = value => {
      const next = typeof value === 'function' ? value(shared.states[setter]) : value;
      shared.states[setter] = next; shared.events.push({ stage: shared.stage, setter, value: next });
    };
    const scope = new Proxy(values, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
    new Function('scope', 'with(scope) {\n' + effect + '\n}')(scope);
    return cleanup;
  }
  return { shared, refs, saved, runRender };
}
(async () => {
  for (const migrated of [true, false]) {
    const h = make(migrated); h.runRender(); await flush();
    if (!migrated) { check('migration current transaction starts', h.shared.migrationCalls, 1); h.shared.migration.resolve({ store: { ...h.saved, legacyMigrationComplete: true } }); await flush(); }
    const prefix = migrated ? 'supported normal boot' : 'completed migration boot';
    check(prefix + ' publishes saved workspace ref', h.refs.canvasRecoveryStoreRef.current.snapshots.map(row => row.id), ['teacher-private']);
    check(prefix + ' shows recovery choice', h.shared.states.setCanvasRecoveryDialogMode, 'choice');
    check(prefix + ' loads history status', h.shared.states.setIsHistoryLoaded, true);
    check(prefix + ' preserves current saved ID', h.refs.canvasRecoveryCurrentIdRef.current, 'teacher-private');
  }
  {
    const h = make(false), cleanup = h.runRender(); await flush();
    check('student transition waits at actual migration', h.shared.migrationCalls, 1);
    cleanup(); h.shared.stage = 'student'; h.shared.marker = true; h.runRender(true); await flush();
    check('new student effect protects entry', h.refs.studentEntryRecoveryProtectedRef.current, true);
    check('new student effect empties teacher recovery ref', h.refs.canvasRecoveryStoreRef.current.snapshots, []);
    check('new student effect clears workspace with QR preservation', h.shared.clearCalls, [{ preserveStudentEntryLoad: true }]);
    const eventCount = h.shared.events.length;
    h.shared.migration.resolve({ store: { ...h.saved, legacyMigrationComplete: true } }); await flush();
    check('retired migration preserves empty student recovery ref', h.refs.canvasRecoveryStoreRef.current.snapshots, []);
    check('retired migration emits no UI publication', h.shared.events.length, eventCount);
    check('retired migration leaves student recovery decision', h.shared.states.setCanvasRecoveryDecisionMade, true);
    check('retired migration keeps recovery modal closed', h.shared.states.setCanvasRecoveryDialogMode, null);
    check('retired migration keeps student workspace ID', h.refs.canvasRecoveryCurrentIdRef.current === 'teacher-private', false);
  }
  const result = { label, scope: 'Actual whole boot useEffect callback and cleanup/rerun with immutable role/session per render and shared React refs; deferred migration storage result; exact candidate publication reorder only',
    input: { path: file, sha256: crypto.createHash('sha256').update(raw).digest('hex') }, total: checks.length, passed: checks.filter(row => row.passed).length, failed: checks.filter(row => !row.passed).length, checks };
  const out = path.resolve(process.env.BOOT_RESULT || path.join(__dirname, 'boot-retirement-' + label + '.json')); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ report: out, total: result.total, passed: result.passed, failed: result.failed })); if (result.failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 2; });
