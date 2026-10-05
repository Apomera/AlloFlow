'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..'), sourceFile = path.resolve(root, process.argv[2] || 'AlloFlowANTI.txt');
const raw = fs.readFileSync(sourceFile), source = raw.toString().replace(/\r\n/g, '\n');
function section(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a + start.length); assert(a >= 0 && b > a, start); return source.slice(a, b); }
const invalidateCode = section('  const invalidateLocalDataHydration = ', '  const cancelActiveProjectLoad');
const pendingSetterCode = section('  const setPendingQrAssignmentResource = useCallback(value => {', '  const buildAlloShareUrl = useCallback');
const dialogBinding = source.match(/^  const \[canvasRecoveryDialogMode, [^\]]+\] = useState[^\n]+/m)?.[0]; assert(dialogBinding, 'Actual dialog state binding');
const hasDialogWrapper = source.includes('  const setCanvasRecoveryDialogMode = (mode) => {');
const dialogWrapperCode = hasDialogWrapper ? section('  const setCanvasRecoveryDialogMode = (mode) => {', '  const canvasRecoveryVaultPendingActionRef') : '';
const closeCode = section('  const closeCanvasRecoveryDialog = (nextMode = null) => {', '  const renderCanvasRecoveryCodeConfirmation');
const projectStartCode = section('        onProjectLoadStart: () => {', '        onProjectLoadComplete:');
const unmountAnchor = source.indexOf("    cancelActiveFileIntakeOperations('host-unmount');"), unmountStart = source.lastIndexOf('  useEffect(() => () => {', unmountAnchor), unmountEnd = source.indexOf('  const [outlineType', unmountAnchor);
assert(unmountAnchor >= 0 && unmountStart >= 0 && unmountEnd > unmountStart, 'Actual host unmount effect');
const unmountCode = source.slice(unmountStart, unmountEnd);
const oldResource = { id: 'waiting-resource', type: 'simplified', data: 'Current work' };
function mount(options = {}) {
  const file = { name: 'workspace.json' }, input = { files: [file], value: 'workspace.json' };
  const importRequest = options.noImport ? null : { input, file }, restoreRequest = options.noRestore ? null : { owner: 'active-restore' };
  const state = { dialog: options.dialog || 'manage', busy: options.busy ?? 'import-read', pending: oldResource, saveStatus: 'saved', pendingSync: true, pdfDelete: { id: 'old-delete' } };
  const calls = [], dialogValues = [];
  const refs = {
    canvasRecoveryImportRequestRef: { current: importRequest }, canvasRecoveryRestoreRequestRef: { current: restoreRequest }, canvasRecoveryVaultSyncRequestRef: { current: null }, canvasRecoveryVaultActionRequestRef: { current: null },
    canvasRecoveryMutationInProgressRef: { current: options.mutationBusy ?? false }, canvasRecoveryImportPreviousIdRef: { current: null }, canvasRecoveryCurrentIdRef: { current: 'workspace-old' },
    canvasRecoverySaveTokenRef: { current: 2 }, canvasRecoveryPendingSaveCountRef: { current: 3 }, localDataHydrationGenerationRef: { current: 7 }, studentWorkHydrationGenerationRef: { current: 9 },
    workspaceReplacementGenerationRef: { current: 4 }, isStudentWorkLoaded: { current: false }, pendingQrAssignmentOpenRequestRef: { current: { resource: oldResource } },
    canvasRecoveryVaultImportRef: { current: { id: 'vault-import' } }, canvasRecoveryVaultPendingActionRef: { current: { action: 'enable' } },
  };
  let cleanup;
  const env = {
    ...refs, isCanvas: options.isCanvas ?? true, canvasRecoveryVaultForm: { mode: options.vaultMode || 'idle' },
    useCallback: fn => fn, useEffect(fn) { cleanup = fn(); },
    useState() { return [state.dialog, value => { dialogValues.push(value); state.dialog = typeof value === 'function' ? value(state.dialog) : value; calls.push(['dialog', state.dialog]); }]; },
    setCanvasRecoveryBusyId(value) { state.busy = typeof value === 'function' ? value(state.busy) : value; calls.push(['busy', state.busy]); },
    setPendingQrAssignmentOpenRequest(value) { state.pending = value?.resource || null; calls.push(['pending', state.pending]); },
    setCanvasRecoverySaveStatus(value) { state.saveStatus = value; calls.push(['save-status', value]); },
    setPendingSync(value) { state.pendingSync = value; calls.push(['pending-sync', value]); },
    setPdfRemediationDeleteConfirm(value) { state.pdfDelete = value; calls.push(['pdf-delete', value]); },
    cancelActiveProjectLoad(value) { calls.push(['cancel-project', value]); }, cancelActiveFileIntakeOperations(reason) { calls.push(['cancel-intake', reason]); },
    clearCanvasRecoveryVaultSecrets(mode) { calls.push(['clear-vault-secrets', mode]); },
    ALLO_WORKSPACE_RECOVERY: { newId: () => 'workspace-new' }, _alloLearningWebWorkspaceKey: 'workspace-key', safeSetItem(key, value) { calls.push(['persist', key, value]); },
  };
  function compile(code, result) { return new Function(...Object.keys(env), code + '\nreturn ' + result + ';')(...Object.values(env)); }
  env.setPendingQrAssignmentResource = compile(pendingSetterCode, 'setPendingQrAssignmentResource');
  env.invalidateLocalDataHydration = compile(invalidateCode, 'invalidateLocalDataHydration');
  env.setCanvasRecoveryDialogMode = compile(dialogBinding + '\n' + dialogWrapperCode, 'setCanvasRecoveryDialogMode');
  const close = compile(closeCode, 'closeCanvasRecoveryDialog');
  const projectStart = new Function(...Object.keys(env), 'return ({\n' + projectStartCode + '\n}).onProjectLoadStart;')(...Object.values(env));
  new Function(...Object.keys(env), unmountCode)(...Object.values(env));
  return { state, refs, calls, dialogValues, input, file, importRequest, restoreRequest, setDialog: env.setCanvasRecoveryDialogMode, close, projectStart, unmount: () => cleanup(), invalidate: env.invalidateLocalDataHydration };
}
const cases = [], check = (name, run) => cases.push({ name, run });
check('null dialog close retires selected import and clears its input and import-read busy', () => { const h = mount(); h.setDialog(null); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.input.value, ''); assert.equal(h.state.busy, null); assert.equal(h.state.dialog, null); assert.equal(h.refs.canvasRecoveryRestoreRequestRef.current, h.restoreRequest); });
check('null dialog close preserves a newer file selected on the same input', () => { const h = mount(); h.input.files = [{ name: 'newer.json' }]; h.input.value = 'newer.json'; h.setDialog(null); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.input.value, 'newer.json'); assert.equal(h.state.busy, null); });
check('null dialog close leaves an unrelated active busy owner intact', () => { const h = mount({ busy: 'project-import' }); h.setDialog(null); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.state.busy, 'project-import'); assert.equal(h.input.value, ''); });
check('nonclosing dialog mode preserves import selection and busy owner', () => { const h = mount(); h.setDialog('choice'); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, h.importRequest); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.busy, 'import-read'); assert.equal(h.state.dialog, 'choice'); });
check('null dialog without import owner performs no import cleanup', () => { const h = mount({ noImport: true }); h.setDialog(null); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.busy, 'import-read'); assert.deepEqual(h.calls, [['dialog', null]]); });
check('functional dialog setter passes exact callback through and preserves selection', () => { const h = mount(), fn = previous => previous === 'manage' ? 'choice' : 'error'; h.setDialog(fn); assert.equal(h.dialogValues[0], fn); assert.equal(h.state.dialog, 'choice'); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, h.importRequest); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.busy, 'import-read'); });
check('shown-once recovery-code confirmation blocks close and preserves all owners', () => { const h = mount({ vaultMode: 'confirm-recovery-code' }), vaultImport = h.refs.canvasRecoveryVaultImportRef.current, pendingAction = h.refs.canvasRecoveryVaultPendingActionRef.current; h.close(); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, h.importRequest); assert.equal(h.refs.canvasRecoveryVaultImportRef.current, vaultImport); assert.equal(h.refs.canvasRecoveryVaultPendingActionRef.current, pendingAction); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.dialog, 'manage'); assert.equal(h.calls.length, 0); });
check('permitted close clears vault secrets and selected read through actual wrapper', () => { const h = mount(); h.close(); assert.equal(h.refs.canvasRecoveryVaultImportRef.current, null); assert.equal(h.refs.canvasRecoveryVaultPendingActionRef.current, null); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.input.value, ''); assert.equal(h.state.busy, null); assert.equal(h.state.dialog, null); assert.equal(h.state.pdfDelete, null); assert(h.calls.some(v => v[0] === 'clear-vault-secrets' && v[1] === 'idle')); });
check('permitted close to choice retains selected workspace read', () => { const h = mount(); h.close('choice'); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, h.importRequest); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.busy, 'import-read'); assert.equal(h.state.dialog, 'choice'); });
check('busy rejected Canvas project start preserves restore, pending and generations', () => { const h = mount({ mutationBusy: true }), pending = h.refs.pendingQrAssignmentOpenRequestRef.current; assert.throws(() => h.projectStart(), /Another saved-work operation/); assert.equal(h.refs.canvasRecoveryRestoreRequestRef.current, h.restoreRequest); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, h.importRequest); assert.equal(h.refs.pendingQrAssignmentOpenRequestRef.current, pending); assert.equal(h.refs.localDataHydrationGenerationRef.current, 7); assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 9); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 4); assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'workspace-old'); assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, true); assert.equal(h.calls.length, 0); });
check('accepted Canvas project start retires pending and hydration before new workspace', () => { const h = mount({ noImport: true, noRestore: true }); h.projectStart(); assert.equal(h.refs.pendingQrAssignmentOpenRequestRef.current, null); assert.equal(h.refs.localDataHydrationGenerationRef.current, 8); assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 10); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 5); assert.equal(h.refs.isStudentWorkLoaded.current, true); assert.equal(h.refs.canvasRecoveryImportPreviousIdRef.current, 'workspace-old'); assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'workspace-new'); assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, true); assert.equal(h.refs.canvasRecoverySaveTokenRef.current, 3); assert.equal(h.refs.canvasRecoveryPendingSaveCountRef.current, 0); assert.equal(h.state.pendingSync, false); assert.equal(h.state.busy, 'project-import'); assert.equal(h.state.saveStatus, 'restoring'); assert.equal(h.calls[0][0], 'pending'); });
check('accepted non-Canvas project start retires pending restore and persists new scope', () => { const h = mount({ isCanvas: false, mutationBusy: true, noImport: true }); h.projectStart(); assert.equal(h.refs.pendingQrAssignmentOpenRequestRef.current, null); assert.equal(h.refs.canvasRecoveryRestoreRequestRef.current, null); assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 5); assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'workspace-new'); assert.equal(h.refs.canvasRecoverySaveTokenRef.current, 2); assert(h.calls.some(v => v[0] === 'persist' && v[1] === 'workspace-key' && v[2] === 'workspace-new')); });
check('accepted project start retires older file selection before project-import busy', () => { const h = mount({ noRestore: true }); h.projectStart(); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.input.value, ''); assert.equal(h.state.busy, 'project-import'); const busy = h.calls.filter(v => v[0] === 'busy'); assert.deepEqual(busy, [['busy', null], ['busy', 'project-import']]); });
check('host unmount silently retires import and restore without recovery state setters', () => { const h = mount({ mutationBusy: true }); h.unmount(); assert.equal(h.refs.canvasRecoveryImportRequestRef.current, null); assert.equal(h.refs.canvasRecoveryRestoreRequestRef.current, null); assert.equal(h.refs.canvasRecoveryMutationInProgressRef.current, false); assert.equal(h.refs.localDataHydrationGenerationRef.current, 8); assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 10); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 5); assert.equal(h.refs.isStudentWorkLoaded.current, true); assert.equal(h.input.value, 'workspace.json'); assert.equal(h.state.busy, 'import-read'); assert.equal(h.calls.filter(v => ['busy', 'dialog', 'pending', 'save-status'].includes(v[0])).length, 0); });
check('host unmount preserves silent project cancellation and intake reason', () => { const h = mount({ noImport: true, noRestore: true }); h.unmount(); assert.deepEqual(h.calls, [['cancel-project', { notifyLifecycle: false }], ['cancel-intake', 'host-unmount']]); });
check('host unmount without recovery owners still retires both read generations', () => { const h = mount({ noImport: true, noRestore: true }); h.unmount(); assert.equal(h.refs.localDataHydrationGenerationRef.current, 8); assert.equal(h.refs.studentWorkHydrationGenerationRef.current, 10); assert.equal(h.refs.workspaceReplacementGenerationRef.current, 5); assert.equal(h.refs.canvasRecoveryCurrentIdRef.current, 'workspace-old'); assert.equal(h.state.busy, 'import-read'); });
for (const busy of ['vault-unlock', 'vault-recover']) check('actual replacement releases its retired ' + busy + ' busy state', () => {
  const h = mount({ noImport: true, noRestore: true, busy });
  h.refs.canvasRecoveryVaultActionRequestRef.current = {}; h.refs.canvasRecoveryVaultSyncRequestRef.current = {};
  h.invalidate(); assert.equal(h.refs.canvasRecoveryVaultActionRequestRef.current, null); assert.equal(h.refs.canvasRecoveryVaultSyncRequestRef.current, null); assert.equal(h.state.busy, null);
});
check('action retirement preserves unrelated replacement busy state', () => {
  const h = mount({ noImport: true, noRestore: true, busy: 'project-import' }); h.refs.canvasRecoveryVaultActionRequestRef.current = {};
  h.invalidate(); assert.equal(h.refs.canvasRecoveryVaultActionRequestRef.current, null); assert.equal(h.state.busy, 'project-import');
});
check('silent unmount retires vault action without any busy publication', () => {
  const h = mount({ noImport: true, noRestore: true, busy: 'vault-unlock' }); h.refs.canvasRecoveryVaultActionRequestRef.current = {}; h.refs.canvasRecoveryVaultSyncRequestRef.current = {};
  h.unmount(); assert.equal(h.refs.canvasRecoveryVaultActionRequestRef.current, null); assert.equal(h.refs.canvasRecoveryVaultSyncRequestRef.current, null); assert.equal(h.state.busy, 'vault-unlock'); assert.equal(h.calls.filter(value => value[0] === 'busy').length, 0);
});
check('replacement without vault action does not clear an unrelated vault busy value', () => {
  const h = mount({ noImport: true, noRestore: true, busy: 'vault-unlock' }); h.invalidate(); assert.equal(h.state.busy, 'vault-unlock');
});
(async () => { const results = []; for (const c of cases) { try { await c.run(); results.push({ name: c.name, passed: true }); } catch (error) { results.push({ name: c.name, passed: false, error: error.stack }); } } const report = { sourceFile, sourceSha256: crypto.createHash('sha256').update(raw).digest('hex'), completedAt: new Date().toISOString(), actualClosures: ['dialog-state-binding', 'dialog-setter-wrapper', 'dialog-close', 'pending-resource-setter', 'central-hydration-invalidation', 'project-load-start', 'host-unmount-effect'], hasDialogWrapper, passed: results.every(v => v.passed), cases: results }; if (process.argv[3]) fs.writeFileSync(path.resolve(root, process.argv[3]), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ passed: report.passed, checks: results.length, failed: results.filter(v => !v.passed).map(v => v.name) })); if (!report.passed) process.exitCode = 1; })();
