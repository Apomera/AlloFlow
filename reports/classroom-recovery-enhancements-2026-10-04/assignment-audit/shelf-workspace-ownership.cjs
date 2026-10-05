'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sourceFile = path.resolve(root, process.argv[2] || 'AlloFlowANTI.txt'), handlersFile = path.resolve(root, process.argv[3] || 'host_handlers_source.jsx');
const raw = fs.readFileSync(sourceFile), handlersRaw = fs.readFileSync(handlersFile), source = raw.toString().replace(/\r\n/g, '\n'), handlers = handlersRaw.toString().replace(/\r\n/g, '\n');
function section(text, start, end) { const a = text.indexOf(start), b = text.indexOf(end, a + start.length); assert(a >= 0 && b > a, start); return text.slice(a, b); }
const shelfHandler = section(handlers, 'const openHomeworkShelf = () => {', 'const connectMailbox = async');
const packEffect = section(source, '  // Self-contained homework entry', '  // Mailbox live-session student entry');
const invalidate = section(source, '  const invalidateLocalDataHydration = ', '  const cancelActiveProjectLoad');
const setter = section(source, '  const setPendingQrAssignmentResource = useCallback(value => {', '  const buildAlloShareUrl = useCallback');
const work = { id: 'current-work', type: 'simplified', data: 'Current work' }, oldQr = { id: 'old-qr', type: 'simplified', data: 'Old QR' };
const lesson = { id: 'shelf-reading', type: 'simplified', data: 'Saved reading' }, directions = { id: 'shelf-directions', type: 'directions', data: { body: 'Saved instructions' } };
const savedShelf = { title: 'Saved homework', resources: [lesson, directions] };
function deferred() { let resolve, reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; }
async function flush() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
function mount(shelf = savedShelf) {
  const state = { history: [work], pending: work, mode: 'current' }, calls = [], toasts = [], gate = deferred(); let cleanup;
  const refs = { workspaceReplacementGenerationRef: { current: 0 }, localDataHydrationGenerationRef: { current: 4 }, studentWorkHydrationGenerationRef: { current: 4 }, isStudentWorkLoaded: { current: false }, pendingQrAssignmentOpenRequestRef: { current: { resource: work } }, hydratedHistoryRef: { current: state.history }, canvasRecoveryRestoreRequestRef: { current: null }, canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryVaultActionRequestRef: { current: null }, canvasRecoveryImportRequestRef: { current: null }, canvasRecoveryMutationInProgressRef: { current: false } };
  const env = {
    ...refs, useCallback: fn => fn,
    setPendingQrAssignmentOpenRequest(value) { state.pending = value?.resource || null; calls.push(['pending', state.pending]); },
    useEffect(fn) { cleanup = fn(); }, JSON, Promise, String, Array, Object, Number, Math, Date,
    _alloReadAlloPackParam: () => 'encoded', _alloDecodeAlloPack: () => gate.promise,
    _alloSetQrStudentAiPolicy() {}, _alloApplyAuthoritativeStudentAiPolicy() {}, _alloAssignmentIsExpired: () => false, _alloStudentSafeResources: v => v,
    warnLog() {}, addToast(...args) { toasts.push(args); }, window: {},
    cancelActiveProjectLoad(options) { calls.push(['cancel-project', options]); },
    cancelActiveFileIntakeOperations(reason) { calls.push(['cancel-intake', reason]); },
    setHistory(value) { state.history = value; calls.push(['history', value]); },
  };
  for (const name of new Set((packEffect + shelfHandler + invalidate).match(/\bset[A-Z]\w+/g))) if (!env[name]) env[name] = value => { calls.push([name, value]); if (name === 'setHasSelectedMode') state.mode = value; };
  const setterEntries = Object.entries(env).filter(([name]) => name !== 'setPendingQrAssignmentResource');
  env.setPendingQrAssignmentResource = new Function(...setterEntries.map(([name]) => name), setter + '\nreturn setPendingQrAssignmentResource;')(...setterEntries.map(([, value]) => value));
  const actualInvalidate = new Function(...Object.keys(env), invalidate + '\nreturn invalidateLocalDataHydration;')(...Object.values(env));
  env.invalidateLocalDataHydration = () => { calls.push(['invalidate']); return actualInvalidate(); };
  const deps = { ...env, homeworkShelf: shelf, t: () => 'Saved homework loaded' };
  const open = new Function('__d', shelfHandler + '\nreturn openHomeworkShelf;')(deps);
  return { state, calls, toasts, refs, open, deps,
    async beginQr() { new Function(...Object.keys(env), packEffect)(...Object.values(env)); await flush(); calls.length = 0; },
    resolveQr() { gate.resolve(JSON.stringify({ title: 'Old QR', resources: [oldQr] })); }, rejectQr() { gate.reject(new Error('Old QR failed')); }, cleanup() { cleanup?.(); },
  };
}
const checks = [], check = (name, run) => checks.push({ name, run });
check('valid shelf retains exact array and selects Directions first', () => { const h = mount(); h.open(); assert.equal(h.state.history, savedShelf.resources); assert.equal(h.refs.hydratedHistoryRef.current, savedShelf.resources); assert.equal(h.state.pending, directions); assert.equal(h.toasts.length, 1); });
check('valid shelf without Directions selects first saved resource', () => { const h = mount({ resources: [lesson], title: 'Reading only' }); h.open(); assert.equal(h.state.pending, lesson); assert.equal(h.state.history[0], lesson); });
check('accepted shelf retires pending, project and file owners before replacement', () => { const h = mount(); h.open(); assert.deepEqual(h.calls.slice(0, 4), [['pending', null], ['cancel-project', { notifyLifecycle: false }], ['cancel-intake', 'homework-shelf-open'], ['invalidate']]); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 1); assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 5); });
check('accepted shelf retires pending opener before first role setter', () => { const h = mount(); let firstRolePending; h.deps.setHasSelectedMode = () => { firstRolePending = h.refs.pendingQrAssignmentOpenRequestRef.current; }; h.open(); assert.equal(firstRolePending, null); });
check('shelf opened during earlier QR decode retains accepted shelf after completion', async () => { const h = mount(); await h.beginQr(); h.open(); h.resolveQr(); await flush(); assert.equal(h.state.history, savedShelf.resources); assert.equal(h.state.pending, directions); h.cleanup(); });
check('shelf opened during earlier QR decode suppresses stale failure feedback', async () => { const h = mount(); await h.beginQr(); h.open(); const before = h.toasts.length; h.rejectQr(); await flush(); assert.equal(h.toasts.length, before); assert.equal(h.state.history, savedShelf.resources); h.cleanup(); });
for (const [name, invalid] of [['missing', null], ['malformed resources', { resources: 'not-an-array' }], ['empty', { resources: [] }]]) check(name + ' shelf preserves current workspace and owners', () => { const h = mount(invalid), token = h.refs.pendingQrAssignmentOpenRequestRef.current; h.open(); assert.deepEqual(h.state.history, [work]); assert.equal(h.refs.pendingQrAssignmentOpenRequestRef.current, token); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 0); assert.equal(h.calls.length, 0); assert.equal(h.toasts.length, 0); });
(async () => {
  const cases = []; for (const c of checks) { try { await c.run(); cases.push({ name: c.name, passed: true }); } catch (error) { cases.push({ name: c.name, passed: false, error: error.stack }); } }
  const report = { sourceFile, handlersFile, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), handlersSha256: crypto.createHash('sha256').update(handlersRaw).digest('hex'), completedAt: new Date().toISOString(), actualHandler: true, actualQrEffect: true, actualInvalidate: true, actualPendingSetter: true, passed: cases.every(c => c.passed), cases };
  if (process.argv[4]) fs.writeFileSync(path.resolve(root, process.argv[4]), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: cases.length, failed: cases.filter(c => !c.passed).map(c => c.name) })); if (!report.passed) process.exitCode = 1;
})();
