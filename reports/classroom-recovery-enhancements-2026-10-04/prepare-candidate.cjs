const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const report = __dirname;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const normalize = text => text.replace(/\r\n/g, '\n');
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'host_handlers_source.jsx', 'host_handlers_module.js', 'desktop/web-app/public/host_handlers_module.js', 'dev-tools/host_handlers_wave3_manifest.json'];
const preparingFollowup = fs.existsSync(path.join(report, 'applied.json'));
const inputBase = preparingFollowup ? path.join(report, 'before') : root;
const inputs = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(inputBase, file))]));
const operations = [];
function replace(text, before, after, scope) {
  const count = text.split(before).length - 1;
  if (count !== 1) throw Error(`${scope}: expected one preimage, found ${count}`);
  operations.push({ target: text === host ? 'host' : 'source', scope, before, after });
  return text.replace(before, after);
}
let host = normalize(inputs['AlloFlowANTI.txt'].toString('utf8'));
for (const file of files.slice(1, 3)) if (!inputs[file].equals(inputs['AlloFlowANTI.txt'])) throw Error(`Host mirror differs: ${file}`);
let source = normalize(inputs['host_handlers_source.jsx'].toString('utf8'));
const { buildFirstWaveModule } = require(path.join(root, '_build_first_wave_view_modules.js'));
const beforeRuntime = buildFirstWaveModule('HostHandlers', source);
if (normalize(inputs['host_handlers_module.js'].toString('utf8')) !== beforeRuntime) throw Error('Existing generated module differs from editable source');
if (!inputs['host_handlers_module.js'].equals(inputs['desktop/web-app/public/host_handlers_module.js'])) throw Error('Generated runtime mirror differs');

host = replace(host, '  const [canvasRecoveryDialogMode, setCanvasRecoveryDialogMode] = useState(() => isCanvas ? \'checking\' : null);', '  const [canvasRecoveryDialogMode, _setCanvasRecoveryDialogMode] = useState(() => isCanvas ? \'checking\' : null);', 'dialog-state');
host = replace(host, '  const canvasRecoveryVaultControllerRef = useRef(null);', `  const canvasRecoveryVaultControllerRef = useRef(null);
  const canvasRecoveryRestoreRequestRef = useRef(null);
  const canvasRecoveryVaultSyncRequestRef = useRef(null);
  const canvasRecoveryVaultActionRequestRef = useRef(null);
  const canvasRecoveryImportRequestRef = useRef(null);
  const setCanvasRecoveryDialogMode = (mode) => {
      if (mode === null && canvasRecoveryImportRequestRef.current) {
          const request = canvasRecoveryImportRequestRef.current;
          canvasRecoveryImportRequestRef.current = null;
          if (request.input?.files?.[0] === request.file) request.input.value = '';
          setCanvasRecoveryBusyId(current => current === 'import-read' ? null : current);
      }
      _setCanvasRecoveryDialogMode(mode);
  };`, 'request-refs-and-dialog-close');
host = replace(host, '  const localDataHydrationGenerationRef = useRef(0);', '  const localDataHydrationGenerationRef = useRef(0);\n  const workspaceReplacementGenerationRef = useRef(0);', 'workspace-generation');
const invalidateStart = host.indexOf('  const invalidateLocalDataHydration =');
const invalidateEnd = host.indexOf('\n  const cancelActiveProjectLoad', invalidateStart);
if (invalidateStart < 0 || invalidateEnd < 0) throw Error('Missing hydration invalidation span');
host = replace(host, host.slice(invalidateStart, invalidateEnd), `  const invalidateLocalDataHydration = (options = {}) => {
      localDataHydrationGenerationRef.current += 1;
      studentWorkHydrationGenerationRef.current += 1;
      if (!options.preserveStudentEntryLoad) workspaceReplacementGenerationRef.current += 1;
      canvasRecoveryVaultSyncRequestRef.current = null;
      const pendingVaultAction = canvasRecoveryVaultActionRequestRef.current;
      canvasRecoveryVaultActionRequestRef.current = null;
      if (pendingVaultAction && options.notifyLifecycle !== false) {
          setCanvasRecoveryBusyId(current => ['vault-unlock', 'vault-recover'].includes(current) ? null : current);
      }
      // An explicit replacement owns the workspace; ordinary boot hydration
      // advances only its own read generation and remains available.
      const pendingImport = canvasRecoveryImportRequestRef.current;
      canvasRecoveryImportRequestRef.current = null;
      if (pendingImport && options.notifyLifecycle !== false) {
          if (pendingImport.input?.files?.[0] === pendingImport.file) pendingImport.input.value = '';
          setCanvasRecoveryBusyId(current => current === 'import-read' ? null : current);
      }
      if (canvasRecoveryRestoreRequestRef.current) {
          canvasRecoveryRestoreRequestRef.current = null;
          canvasRecoveryMutationInProgressRef.current = false;
          if (options.notifyLifecycle !== false) setCanvasRecoveryBusyId(null);
      }
      isStudentWorkLoaded.current = true;
      return localDataHydrationGenerationRef.current;
  };`, 'invalidate-authoritative-workspace');
host = replace(host, "    cancelActiveFileIntakeOperations('host-unmount');\n    invalidateLocalDataHydration();", "    cancelActiveFileIntakeOperations('host-unmount');\n    invalidateLocalDataHydration({ notifyLifecycle: false });", 'unmount-ref-only');
host = replace(host, '        if (!Array.isArray(receivedDeliveryResources) || !receivedDeliveryResources.length) clearCanvasWorkspaceState();', '        if (!Array.isArray(receivedDeliveryResources) || !receivedDeliveryResources.length) clearCanvasWorkspaceState({ preserveStudentEntryLoad: true });', 'boot-entry-protection-preserves-current-qr');
host = replace(host, `  const clearCanvasWorkspaceState = (options = {}) => {
      setPendingQrAssignmentResource(null);
      cancelActiveProjectLoad();
      cancelActiveFileIntakeOperations('canvas-workspace-clear');
      invalidateLocalDataHydration();`, `  const clearCanvasWorkspaceState = (options = {}) => {
      setPendingQrAssignmentResource(null);
      cancelActiveProjectLoad();
      cancelActiveFileIntakeOperations('canvas-workspace-clear');
      invalidateLocalDataHydration({ preserveStudentEntryLoad: options.preserveStudentEntryLoad === true });`, 'clear-entry-generation-option');
host = replace(host, `        onProjectLoadStart: () => {
            invalidateLocalDataHydration();
            if (isCanvas && canvasRecoveryMutationInProgressRef.current) {
                throw new Error('Another saved-work operation is still running.');
            }`, `        onProjectLoadStart: () => {
            if (isCanvas && canvasRecoveryMutationInProgressRef.current) {
                throw new Error('Another saved-work operation is still running.');
            }
            setPendingQrAssignmentResource(null);
            invalidateLocalDataHydration();`, 'accepted-project-start');
for (const name of ['workspaceReplacementGenerationRef', 'canvasRecoveryRestoreRequestRef', 'canvasRecoveryVaultSyncRequestRef', 'canvasRecoveryVaultActionRequestRef', 'canvasRecoveryImportRequestRef', 'requestReadingSupportTransition']) {
  host = replace(host, '    get canvasRecoveryVaultControllerRef() { return canvasRecoveryVaultControllerRef; },', `    get ${name}() { return ${name}; },\n    get canvasRecoveryVaultControllerRef() { return canvasRecoveryVaultControllerRef; },`, `host-getter-${name}`);
}
host = replace(host, '    get getWordSoundsPortableAudioCoverage() { return getWordSoundsPortableAudioCoverage; }, get globalPoints', '    get globalPoints', 'remove-unused-word-coverage-getter');
host = replace(host, ' get handleAnalysisTextChange() { return handleAnalysisTextChange; }, get handleAudio()', ' get handleAudio()', 'remove-unused-analysis-getter');
const entryOps = JSON.parse(fs.readFileSync(path.join(report, 'assignment-audit/entry-operations.json')));
for (const op of entryOps.filter(op => op.scope !== 'root-reference')) host = replace(host, op.before, op.after, op.scope);

source = replace(source, `      if (__d.canvasRecoveryMutationInProgressRef.current) return false;
      const snapshotWasStored`, `      if (__d.canvasRecoveryMutationInProgressRef.current) return false;
      __d.setPendingQrAssignmentResource(null);
      __d.cancelActiveProjectLoad({ notifyLifecycle: false });
      __d.cancelActiveFileIntakeOperations('canvas-workspace-restore');
      __d.invalidateLocalDataHydration();
      const request = {};
      const generation = __d.workspaceReplacementGenerationRef.current;
      __d.canvasRecoveryRestoreRequestRef.current = request;
      const isCurrentWorkspace = () => __d.workspaceReplacementGenerationRef.current === generation
          && __d.canvasRecoveryCurrentIdRef.current === snapshot.id;
      const isCurrentRestore = () => __d.canvasRecoveryRestoreRequestRef.current === request && isCurrentWorkspace();
      const snapshotWasStored`, 'restore-claim');
source = replace(source, '          await _restoreBuilderDraftFromProject(workspace.builderDraft || null, restoredHistory);', '          await _restoreBuilderDraftFromProject(workspace.builderDraft || null, restoredHistory, { isCurrent: isCurrentRestore });\n          if (!isCurrentRestore()) return false;', 'restore-builder-continuation');
source = replace(source, `              setTimeout(() => {
                  __d.handleRestoreView(activeItem);
                  if (!['readingBook', 'video-ref', 'video-transcript', 'manipulative-resource'].includes(activeItem.type)) {`, `              setTimeout(() => {
                  if (!isCurrentWorkspace()) return;
                  __d.handleRestoreView(activeItem);
                  if (isCurrentWorkspace() && !['readingBook', 'video-ref', 'video-transcript', 'manipulative-resource'].includes(activeItem.type)) {`, 'restore-queued-view');
source = replace(source, `      } catch (error) {
          __d.warnLog('Canvas workspace restore failed:', error);`, `      } catch (error) {
          if (!isCurrentRestore()) return false;
          __d.warnLog('Canvas workspace restore failed:', error);`, 'restore-retired-error');
source = replace(source, `          return false;
      } finally {
          __d.canvasRecoveryMutationInProgressRef.current = false;
          __d.setCanvasRecoveryBusyId(null);
      }
  };
const refreshStorageManagerInventory`, `          return false;
      } finally {
          if (__d.canvasRecoveryRestoreRequestRef.current === request) {
              __d.canvasRecoveryRestoreRequestRef.current = null;
              __d.canvasRecoveryMutationInProgressRef.current = false;
              __d.setCanvasRecoveryBusyId(null);
          }
      }
  };
const refreshStorageManagerInventory`, 'restore-owned-finally');
for (const file of ['assignment-audit/shelf-operations.json', 'vault-audit/operations.json']) {
  for (const op of JSON.parse(fs.readFileSync(path.join(report, file)))) source = replace(source, op.before, op.after, op.name || `source-${file}`);
}
const callerOpsFile = path.join(report, 'vault-audit/caller-operations.json');
if (fs.existsSync(callerOpsFile)) for (const op of JSON.parse(fs.readFileSync(callerOpsFile))) source = replace(source, op.before, op.after, op.name);
const actionOpsFile = path.join(report, 'vault-audit/action-operations.json');
if (fs.existsSync(actionOpsFile)) for (const op of JSON.parse(fs.readFileSync(actionOpsFile))) source = replace(source, op.before, op.after, op.name);
const bootOpsFile = path.join(report, 'boot-boundary-audit/operations.json');
if (fs.existsSync(bootOpsFile)) for (const op of JSON.parse(fs.readFileSync(bootOpsFile))) {
  if (op.target === 'host' || op.file === 'AlloFlowANTI.txt') host = replace(host, op.before, op.after, op.name);
  else if (op.target === 'source' || op.file === 'host_handlers_source.jsx') source = replace(source, op.before, op.after, op.name);
  else throw Error('Unknown boot-operation target');
}
host = replace(host, '  const handleReturnToStart = (...__a) => requestReadingSupportTransition(() => _alloHostHandlers().handleReturnToStart(...__a));', '  const handleReturnToStart = (...__a) => _alloHostHandlers().handleReturnToStart(...__a);', 'return-to-start-plain-shim');
const returnStart = source.indexOf('const handleReturnToStart = () => {');
const returnEnd = source.indexOf('\nconst saveFullChat =', returnStart);
if (returnStart < 0 || returnEnd < 0) throw Error('Return-to-Start body missing');
const returnBody = source.slice(returnStart, returnEnd);
source = replace(source, returnBody, returnBody.replace('const handleReturnToStart = () => {', 'const handleReturnToStart = () => __d.requestReadingSupportTransition(() => {').replace(/\};$/, '});'), 'return-to-start-preserves-transition-guard');
const runtime = buildFirstWaveModule('HostHandlers', source);
new vm.Script(runtime);
new vm.Script(source);
const pin = sha(Buffer.from(runtime)).slice(0, 8);
const pins = [...host.matchAll(/host_handlers_module\.js\?v=([a-f0-9]+)/g)];
if (pins.length !== 1) throw Error(`Expected one HostHandlers pin, got ${pins.length}`);
host = replace(host, `host_handlers_module.js?v=${pins[0][1]}`, `host_handlers_module.js?v=${pin}`, 'generated-module-pin');
const manifest = JSON.parse(inputs['dev-tools/host_handlers_wave3_manifest.json']);
if (!Array.isArray(manifest.deps)) throw Error('Manifest dependencies missing');
manifest.deps = manifest.deps.filter(name => !['getWordSoundsPortableAudioCoverage', 'handleAnalysisTextChange'].includes(name));
for (const name of ['workspaceReplacementGenerationRef', 'canvasRecoveryRestoreRequestRef', 'canvasRecoveryVaultSyncRequestRef', 'canvasRecoveryVaultActionRequestRef', 'canvasRecoveryImportRequestRef', 'requestReadingSupportTransition']) if (!manifest.deps.includes(name)) manifest.deps.push(name);
manifest.deps.sort();
let bootHotRecord = null;
if (fs.existsSync(bootOpsFile)) {
  manifest.deps.push('markOrganizerLayoutEdited');
  manifest.deps.sort();
  manifest.handlers = manifest.handlers.filter(name => name !== 'onUpdateResource');
  manifest.useCallbackHandlers = manifest.useCallbackHandlers.filter(name => name !== 'onUpdateResource');
  const proposal = JSON.parse(fs.readFileSync(path.join(report, 'boot-boundary-audit/manifest-proposal.json')));
  const key = Object.keys(proposal).find(key => Array.isArray(proposal[key]) && proposal[key].some(item => item?.name === 'onUpdateResource'));
  if (key) {
    const item = proposal[key].find(item => item?.name === 'onUpdateResource');
    if (manifest[key].some(item => item?.name === 'onUpdateResource')) throw Error('Boot hot exclusion already exists');
    manifest[key].push(item);
    bootHotRecord = { key, item };
  }
}
const outputs = { 'AlloFlowANTI.txt': host, 'desktop/web-app/src/AlloFlowANTI.txt': host, 'desktop/web-app/src/App.jsx': host, 'host_handlers_source.jsx': source, 'host_handlers_module.js': runtime, 'desktop/web-app/public/host_handlers_module.js': runtime, 'dev-tools/host_handlers_wave3_manifest.json': JSON.stringify(manifest, null, 2) + '\n' };
// Preserve editable-file line endings; the generated module uses the builder's LF output.
for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'host_handlers_source.jsx', 'dev-tools/host_handlers_wave3_manifest.json']) {
  if (inputs[file].toString('utf8').includes('\r\n')) outputs[file] = outputs[file].replace(/\n/g, '\r\n');
}
const receipt = { preparedAt: new Date().toISOString(), pin, callerOperationsIncluded: fs.existsSync(callerOpsFile), files: [] };
receipt.bootOperationsIncluded = fs.existsSync(bootOpsFile);
receipt.bootHotRecord = bootHotRecord;
receipt.generatorInputs = ['_build_first_wave_view_modules.js', 'word_sounds_readiness_contract.js'].map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
for (const file of files) {
  const beforePath = path.join(report, 'before', file);
  const afterPath = path.join(report, 'candidate', file);
  fs.mkdirSync(path.dirname(beforePath), { recursive: true });
  fs.mkdirSync(path.dirname(afterPath), { recursive: true });
  if (fs.existsSync(beforePath) && !fs.readFileSync(beforePath).equals(inputs[file])) throw Error(`Frozen preimage changed: ${file}`);
  fs.writeFileSync(beforePath, inputs[file]);
  fs.writeFileSync(afterPath, outputs[file]);
  receipt.files.push({ file, beforeSha256: sha(inputs[file]), candidateSha256: sha(Buffer.from(outputs[file])), beforeBytes: inputs[file].length, candidateBytes: Buffer.byteLength(outputs[file]) });
}
fs.writeFileSync(path.join(report, 'operations.json'), JSON.stringify(operations, null, 2) + '\n');
fs.writeFileSync(path.join(report, 'candidate-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ files: receipt.files.length, operations: operations.length, pin, callerOperationsIncluded: receipt.callerOperationsIncluded }));
