'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const { buildFirstWaveModule } = require(path.join(root, '_build_first_wave_view_modules.js'));
const parser = require(path.join(root, 'node_modules/@babel/parser'));
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const sourcePath = 'host_handlers_source.jsx', modulePaths = ['host_handlers_module.js', 'desktop/web-app/public/host_handlers_module.js'];
const manifestPath = 'dev-tools/host_handlers_wave3_manifest.json';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const normalize = value => value.toString('utf8').replace(/\r\n/g, '\n');
function replace(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Unique production anchor: ' + before.slice(0, 90));
  return source.replace(before, after);
}
const wordPredicate = `  const hasMeaningfulWordSoundsWorkspace = () =>
      [wordSoundsHistory, wordSoundsFamilies, wordSoundsAudioLibrary, wordSoundsBadges, phonemeMastery, wordSoundsConfusionPatterns]
          .some(value => value && typeof value === 'object' && Object.keys(value).length > 0)
      || Number(wordSoundsDailyProgress?.completed) > 0
      || wordSoundsDailyProgress?.goalMet === true
      || Object.values(wordSoundsScore || {}).some(value => typeof value === 'number' && Number.isFinite(value) && value > 0);

`;
const ownerState = `  const [pendingQrAssignmentOpenRequest, setPendingQrAssignmentOpenRequest] = useState(null);
  const pendingQrAssignmentResource = pendingQrAssignmentOpenRequest?.resource || null;
  const pendingQrAssignmentOpenRequestRef = useRef(null);
  const setPendingQrAssignmentResource = useCallback(value => {
      const current = pendingQrAssignmentOpenRequestRef.current;
      const resource = typeof value === 'function' ? value(current?.resource || null) : value;
      if (typeof value === 'function' && resource === (current?.resource || null)) return;
      if (!resource && !current) return;
      // Retire ownership immediately, including before React commits cleanup.
      // A fresh token also distinguishes an exact-object A -> null -> A batch.
      const next = resource ? { resource } : null;
      pendingQrAssignmentOpenRequestRef.current = next;
      setPendingQrAssignmentOpenRequest(next);
  }, []);`;
const operations = [];
function edit(source, before, after, target) {
  operations.push({ target, before, after }); return replace(source, before, after);
}
function hostFixes(source, file, pin) {
  source = edit(source, '  const [pendingQrAssignmentResource, setPendingQrAssignmentResource] = useState(null);', ownerState, file);
  source = edit(source, "      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {\n          _alloMarkRemovedResChunks", "      if (v.kind === 'res-remove' && Array.isArray(v.ids)) {\n          setPendingQrAssignmentResource(current => current && v.ids.includes(current.id) ? null : current);\n          _alloMarkRemovedResChunks", file);
  source = edit(source, '  const clearCanvasWorkspaceState = (options = {}) => {', '  const clearCanvasWorkspaceState = (options = {}) => {\n      setPendingQrAssignmentResource(null);', file);
  source = edit(source, '  const handleClearHistory = () => {', '  const handleClearHistory = () => {\n    setPendingQrAssignmentResource(null);', file);
  source = edit(source, '      const resource = pendingQrAssignmentResource;\n      const openContext = historyOpenContextRef.current;', '      const resource = pendingQrAssignmentResource;\n      const openRequest = pendingQrAssignmentOpenRequest;\n      const openContext = historyOpenContextRef.current;', file);
  source = edit(source, '      const isCurrent = () => !cancelled && openGeneration === pendingQrAssignmentOpenGenerationRef.current;', '      const isCurrent = () => !cancelled && openGeneration === pendingQrAssignmentOpenGenerationRef.current\n          && pendingQrAssignmentOpenRequestRef.current === openRequest;', file);
  source = edit(source, '          if (openContext === current) return true;\n          const hydration = bootHistoryHydrationRef.current;', `          if (openContext === current) return true;
          // Removing an unrelated history item leaves this exact pending artifact valid.
          if (openContext?.values && current?.values
              && openContext.values.every((value, index) => index === 1 || value === current.values[index])
              && Array.isArray(current.values[1]) && current.values[1].includes(resource)) return true;
          const hydration = bootHistoryHydrationRef.current;`, file);
  source = edit(source, '              setPendingQrAssignmentResource(current => current === resource ? null : current);', '              setPendingQrAssignmentResource(current => pendingQrAssignmentOpenRequestRef.current === openRequest && current === resource ? null : current);', file);
  source = edit(source, '  }, [pendingQrAssignmentResource, isTeacherMode]);', '  }, [pendingQrAssignmentOpenRequest, isTeacherMode]);', file);
  source = edit(source, '  const buildCanvasWorkspaceSnapshot = async (workspaceId = canvasRecoveryCurrentIdRef.current) => {', wordPredicate + '  const buildCanvasWorkspaceSnapshot = async (workspaceId = canvasRecoveryCurrentIdRef.current) => {', file);
  source = edit(source, '          || Boolean(guidedPlanBrief);\n      if (liveStudentEntry || !hasMeaningfulWorkspace)', '          || Boolean(guidedPlanBrief)\n          || hasMeaningfulWordSoundsWorkspace();\n      if (liveStudentEntry || !hasMeaningfulWorkspace)', file);
  source = edit(source, '  const __alloHostDeps = {', '  const __alloHostDeps = {\n    get buildCanvasWorkspaceSnapshot() { return buildCanvasWorkspaceSnapshot; }, get clearCanvasWorkspaceState() { return clearCanvasWorkspaceState; }, get hasMeaningfulWordSoundsWorkspace() { return hasMeaningfulWordSoundsWorkspace; },', file);
  const pinPattern = /host_handlers_module\.js\?v=[a-f0-9]{8}/g;
  const matches = source.match(pinPattern); assert.equal(matches?.length, 1, file + ' HostHandlers pin');
  return edit(source, matches[0], 'host_handlers_module.js?v=' + pin, file);
}
function handlerFixes(source) {
  source = edit(source, '              || Boolean(__d.guidedPlanBrief);', '              || Boolean(__d.guidedPlanBrief)\n              || __d.hasMeaningfulWordSoundsWorkspace();', sourcePath);
  source = edit(source, 'await buildCanvasWorkspaceSnapshot(__d.canvasRecoveryCurrentIdRef.current)', 'await __d.buildCanvasWorkspaceSnapshot(__d.canvasRecoveryCurrentIdRef.current)', sourcePath);
  assert.equal((source.match(/(?<![.\w])clearCanvasWorkspaceState\(/g) || []).length, 3, 'Three host-only clear calls');
  // These identical calls belong to lock, erase-all and erase-one. Capture each scoped edit.
  for (const marker of ['const lockCanvasRecoveryVault =', 'const eraseAllCanvasRecoveryVault =', 'const eraseCanvasRecoverySnapshot =']) {
    const from = source.indexOf(marker), to = source.indexOf('\nconst ', from + marker.length);
    assert(from >= 0 && to > from, marker);
    const before = source.slice(from, to), after = replace(before, 'clearCanvasWorkspaceState(', '__d.clearCanvasWorkspaceState(');
    source = edit(source, before, after, sourcePath);
  }
  source = edit(source, '      const studioApi = window.AlloModules && window.AlloModules.StudioResponse;\n      const cleanContent =', `      const studioApi = window.AlloModules && window.AlloModules.StudioResponse;
      const needsStudioResponse = filteredContent.some(item => ['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge'].includes(item.type));
      if (needsStudioResponse && (!studioApi || ['supports', 'toSubmission', 'toResponseEntries'].some(name => typeof studioApi[name] !== 'function'))) {
          __d.addToast(__d.t('toasts.export_tools_still_loading_try') || 'Submission tools are still loading. Try Submit again.', 'error');
          return { ok: false, retryable: true, reason: 'studio-tools-not-ready' };
      }
      const cleanContent =`, sourcePath);
  return source;
}
function prepare() {
  const files = [...hosts, sourcePath, ...modulePaths, manifestPath], before = new Map(files.map(file => [file, read(file)]));
  assert.equal(normalize(before.get(hosts[0])), normalize(before.get(hosts[1])), 'Host mirror before');
  assert.equal(normalize(before.get(hosts[0])), normalize(before.get(hosts[2])), 'App mirror before');
  const sourceBefore = normalize(before.get(sourcePath));
  const oldGenerated = buildFirstWaveModule('HostHandlers', sourceBefore);
  assert.equal(normalize(before.get(modulePaths[0])), oldGenerated, 'Existing generated HostHandlers is current');
  assert.equal(normalize(before.get(modulePaths[1])), oldGenerated, 'Existing public HostHandlers is current');
  const after = new Map();
  const sourceAfter = handlerFixes(sourceBefore), moduleAfter = buildFirstWaveModule('HostHandlers', sourceAfter);
  const pin = hash(moduleAfter).slice(0, 8);
  after.set(sourcePath, sourceAfter); modulePaths.forEach(file => after.set(file, moduleAfter));
  hosts.forEach(file => after.set(file, hostFixes(normalize(before.get(file)), file, pin)));
  const manifest = JSON.parse(normalize(before.get(manifestPath)));
  for (const name of ['buildCanvasWorkspaceSnapshot', 'clearCanvasWorkspaceState', 'hasMeaningfulWordSoundsWorkspace']) { assert(!manifest.deps.includes(name), name + ' pre-existing dependency'); manifest.deps.push(name); }
  manifest.deps.sort(); after.set(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  hosts.forEach(file => parser.parse(after.get(file), { sourceType: 'unambiguous', plugins: ['jsx'] }));
  new vm.Script(moduleAfter); parser.parse(sourceAfter, { sourceType: 'script', plugins: ['jsx'] });
  const outputs = [];
  for (const file of files) {
    const beforeBytes = before.get(file), afterText = after.get(file);
    const afterBytes = Buffer.from(beforeBytes.includes(Buffer.from('\r\n')) ? afterText.replace(/\n/g, '\r\n') : afterText);
    // Module builder emits LF; preserve its exact canonical output bytes.
    const bytes = modulePaths.includes(file) ? Buffer.from(afterText) : afterBytes;
    fs.mkdirSync(path.join(__dirname, 'candidate', path.dirname(file)), { recursive: true });
    fs.mkdirSync(path.join(__dirname, 'source-before', path.dirname(file)), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'candidate', file), bytes);
    fs.writeFileSync(path.join(__dirname, 'source-before', file), beforeBytes);
    outputs.push({ file, beforeSha256: hash(beforeBytes), afterSha256: hash(bytes), candidate: 'candidate/' + file });
  }
  assert.equal(outputs.find(row => row.file === modulePaths[0]).afterSha256.slice(0, 8), pin);
  const record = { preparedAt: new Date().toISOString(), pin, files: outputs, operations, context: ['_build_first_wave_view_modules.js', 'word_sounds_readiness_contract.js'].map(file => ({ file, sha256: hash(read(file)) })) };
  fs.writeFileSync(path.join(__dirname, 'prepared.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ prepared: true, files: outputs.length, pin, operations: operations.length }));
}
function apply() {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, 'prepared.json'), 'utf8'));
  assert(!fs.existsSync(path.join(__dirname, 'applied.json')), 'Keep applied receipt');
  for (const item of record.files) { assert.equal(hash(read(item.file)), item.beforeSha256, 'Source changed since prepare: ' + item.file); assert.equal(hash(fs.readFileSync(path.join(__dirname, item.candidate))), item.afterSha256, 'Candidate changed: ' + item.file); }
  record.context.forEach(item => assert.equal(hash(read(item.file)), item.sha256, 'Builder context changed'));
  for (const item of record.files) fs.writeFileSync(path.join(root, item.file), fs.readFileSync(path.join(__dirname, item.candidate)));
  record.appliedAt = new Date().toISOString(); fs.writeFileSync(path.join(__dirname, 'applied.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ applied: true, files: record.files.length, pin: record.pin }));
}
function rebaseAndApply() {
  const old = JSON.parse(fs.readFileSync(path.join(__dirname, 'prepared.json'), 'utf8'));
  const archive = path.join(__dirname, 'initial-candidate');
  assert(!fs.existsSync(archive), 'Keep initial candidate evidence');
  fs.mkdirSync(archive);
  fs.copyFileSync(path.join(__dirname, 'prepared.json'), path.join(archive, 'prepared.json'));
  for (const item of old.files) {
    for (const folder of ['candidate', 'source-before']) {
      const target = path.join(archive, folder, item.file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(__dirname, folder, item.file), target);
    }
  }
  const before = normalize(fs.readFileSync(path.join(archive, 'source-before', hosts[0]))).split('\n');
  const current = normalize(read(hosts[0])).split('\n');
  assert.equal(before.length, current.length, 'Inspect nontrivial concurrent host change separately');
  const changes = before.flatMap((line, index) => line === current[index] ? [] : [{line:index+1,before:line,after:current[index]}]);
  assert(changes.every(change => change.before.includes('window.__alloLazyMaineSldPractice') && change.after.includes('window.__alloLazyMaineSldPractice')), 'Only observed independent Maine pin change is authorized for automatic refresh');
  fs.writeFileSync(path.join(__dirname, 'concurrent-host-delta.json'), JSON.stringify({changes,preserved:true}, null, 2)+'\n');
  prepare(); apply();
}
if (process.argv[2] === 'apply') apply(); else if(process.argv[2] === 'rebase-and-apply') rebaseAndApply(); else prepare();
