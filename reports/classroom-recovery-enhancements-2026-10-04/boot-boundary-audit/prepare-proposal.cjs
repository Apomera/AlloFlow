// Read-only source inspection and report-local proposal. No production writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const report = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const host = read('AlloFlowANTI.txt');
const source = read('host_handlers_source.jsx');
const beforeHost = read('reports/classroom-recovery-enhancements-2026-10-04/before/AlloFlowANTI.txt');
const beforeSource = read('reports/classroom-recovery-enhancements-2026-10-04/before/host_handlers_source.jsx');
const manifest = JSON.parse(read('dev-tools/host_handlers_wave3_manifest.json'));
const operations = [];
const evidence = { inspectionOnly: true, manifestKeys: Object.keys(manifest), comparisons: [] };
const line = (text, needle) => text.slice(0, text.indexOf(needle)).split('\n').length;
const block = (text, start, end) => {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing source block: ' + start);
  return text.slice(a, b);
};
for (const name of ['handleNodeClick', 'handleAddManualNode', 'handleResetLayout']) {
  const shim = `  const ${name} = (...__a) => { markOrganizerLayoutEdited(); return _alloHostHandlers().${name}(...__a); };`;
  evidence.comparisons.push({ name: name + '-shim', preexisting: beforeHost.includes(shim), current: host.includes(shim), beforeLine: line(beforeHost, shim), currentLine: line(host, shim) });
  operations.push({ file: 'AlloFlowANTI.txt', name: name + '-plain-shim', before: shim, after: `  const ${name} = (...__a) => _alloHostHandlers().${name}(...__a);` });
  const bodyStart = name === 'handleNodeClick' ? `const ${name} = (e, nodeId) => {` : `const ${name} = () => {`;
  operations.push({ file: 'host_handlers_source.jsx', name: name + '-keep-edit-marker', before: bodyStart, after: bodyStart + '\n      __d.markOrganizerLayoutEdited();' });
}
const effectStart = '  const organizerLayoutPendingRef = useRef({ editedId: null, timer: null, write: null });';
const effectEnd = '  const handleNodeMouseDown =';
const oldEffect = block(beforeHost, effectStart, effectEnd);
const effect = block(host, effectStart, effectEnd);
evidence.comparisons.push({ name: 'organizer-layout-persistence-effects', unchangedFromBefore: oldEffect === effect, beforeLine: line(beforeHost, effectStart), currentLine: line(host, effectStart), normalizedSha256: hash(effect) });
const updaterStart = 'const onUpdateResource = (resourceId, updater, options = {}) => {';
const updaterEnd = 'function resumeReadThisPage()';
const oldUpdater = block(beforeSource, updaterStart, updaterEnd);
const updater = block(source, updaterStart, updaterEnd);
evidence.comparisons.push({ name: 'resource-mutation-handler', unchangedFromBefore: oldUpdater === updater, beforeLine: line(beforeSource, updaterStart), currentLine: line(source, updaterStart), normalizedSha256: hash(updater) });
const shim = '  const onUpdateResource = useCallback((...__a) => _alloHostHandlers().onUpdateResource(...__a), [setHistory, setGeneratedContent]);';
const hostUpdater = '  ' + updater.trimEnd().replace(updaterStart, 'const onUpdateResource = useCallback((resourceId, updater, options = {}) => {').replaceAll('__d.', '').replace(/\};$/, '}, [setHistory, setGeneratedContent]);');
operations.push({ file: 'AlloFlowANTI.txt', name: 'resource-updater-host-owned', before: shim, after: hostUpdater });
operations.push({ file: 'host_handlers_source.jsx', name: 'resource-updater-remove-moved-body', before: updater + updaterEnd, after: updaterEnd });
operations.push({ file: 'host_handlers_source.jsx', name: 'resource-updater-remove-factory-export', before: 'openCachedPdfRemediation, onUpdateResource, resumeReadThisPage', after: 'openCachedPdfRemediation, resumeReadThisPage' });
const getter = '    get mapContainerRef() { return mapContainerRef; },';
if (!host.includes(getter)) throw new Error('Getter insertion anchor changed');
operations.push({ file: 'AlloFlowANTI.txt', name: 'organizer-edit-marker-getter', before: getter, after: '    get markOrganizerLayoutEdited() { return markOrganizerLayoutEdited; },\n' + getter });
const metadata = JSON.parse(JSON.stringify(manifest));
evidence.remainingBareUpdaterCalls = [...source.replace(updater, '').matchAll(/(?<![\w.])onUpdateResource\s*\(/g)].length;
if (evidence.remainingBareUpdaterCalls !== 0) throw new Error('Bare updater calls would outlive its moved body');
for (const key of ['handlers', 'useCallbackHandlers']) {
  if (Array.isArray(metadata[key])) metadata[key] = metadata[key].filter(name => name !== 'onUpdateResource');
}
metadata.deps = [...new Set([...metadata.deps, 'markOrganizerLayoutEdited'])].sort();
const key = Object.keys(metadata).find(key => Array.isArray(metadata[key]) && metadata[key].some(entry => entry && entry.name === 'runGlossaryHealthCheck'));
if (key) metadata[key].push({ name: 'onUpdateResource', on: '2026-10-04', why: 'reachable from the organizer layout persistence effect and cleanup; keep synchronous mutations available before HostHandlers loads' });
fs.writeFileSync(path.join(report, 'operations.json'), JSON.stringify(operations, null, 2) + '\n');
fs.writeFileSync(path.join(report, 'manifest-proposal.json'), JSON.stringify(metadata, null, 2) + '\n');
fs.writeFileSync(path.join(report, 'source-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
