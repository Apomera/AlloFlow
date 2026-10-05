const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const label = process.argv[2] || 'current';
const base = label === 'candidate' ? path.join(__dirname, 'candidate') : root;
const receipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'candidate-receipt.json')));
const operations = JSON.parse(fs.readFileSync(path.join(__dirname, 'operations.json')));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const norm = text => text.replace(/\r\n/g, '\n');
const read = file => fs.readFileSync(path.join(base, file));
for (const item of receipt.files) assert.equal(sha(read(item.file)), item.candidateSha256, `Candidate hash: ${item.file}`);
for (const item of receipt.generatorInputs) assert.equal(sha(fs.readFileSync(path.join(root, item.file))), item.sha256, `Generator input: ${item.file}`);
const host = read('AlloFlowANTI.txt');
assert.ok(host.equals(read('desktop/web-app/src/App.jsx')));
assert.ok(host.equals(read('desktop/web-app/src/AlloFlowANTI.txt')));
const runtime = read('host_handlers_module.js');
assert.ok(runtime.equals(read('desktop/web-app/public/host_handlers_module.js')));
parser.parse(host.toString(), { sourceType: 'module', plugins: ['jsx'] });
new vm.Script(read('host_handlers_source.jsx').toString());
new vm.Script(runtime.toString());
const { buildFirstWaveModule } = require(path.join(root, '_build_first_wave_view_modules.js'));
assert.equal(buildFirstWaveModule('HostHandlers', read('host_handlers_source.jsx').toString()), runtime.toString());
assert.ok(host.toString().includes(`host_handlers_module.js?v=${sha(runtime).slice(0, 8)}`));
const getterStart = host.toString().indexOf('  const __alloHostDeps = {');
const getters = [...new Set([...host.toString().slice(getterStart, host.toString().indexOf('\n  };\n', getterStart)).matchAll(/get ([A-Za-z_$][\w$]*)\(\) \{ return \1; \}/g)].map(match => match[1]))].sort();
const reads = [...new Set([...read('host_handlers_source.jsx').toString().replace(/^\s*\/\/.*$/gm, '').matchAll(/__d\.([A-Za-z_$][\w$]*)/g)].map(match => match[1]))].sort();
const manifest = JSON.parse(read('dev-tools/host_handlers_wave3_manifest.json'));
assert.deepEqual(getters, reads);
assert.deepEqual([...manifest.deps].sort(), getters);
const reversed = {};
for (const [target, file] of [['host', 'AlloFlowANTI.txt'], ['source', 'host_handlers_source.jsx']]) {
  let text = norm(read(file).toString());
  for (const op of operations.filter(op => op.target === target).reverse()) {
    assert.equal(text.split(op.after).length - 1, 1, `Unique reverse ${op.scope}`);
    text = text.replace(op.after, op.before);
  }
  const before = fs.readFileSync(path.join(__dirname, 'before', file));
  if (before.toString().includes('\r\n')) text = text.replace(/\n/g, '\r\n');
  assert.ok(Buffer.from(text).equals(before), `Exact raw reverse: ${file}`);
  reversed[file] = sha(Buffer.from(text));
}
const beforeManifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'before/dev-tools/host_handlers_wave3_manifest.json')));
const expectedManifest = structuredClone(beforeManifest);
expectedManifest.deps = expectedManifest.deps.filter(name => !['getWordSoundsPortableAudioCoverage', 'handleAnalysisTextChange'].includes(name));
expectedManifest.deps.push('workspaceReplacementGenerationRef', 'canvasRecoveryRestoreRequestRef', 'canvasRecoveryVaultSyncRequestRef', 'canvasRecoveryVaultActionRequestRef', 'canvasRecoveryImportRequestRef', 'requestReadingSupportTransition');
if (receipt.bootOperationsIncluded) {
  expectedManifest.deps.push('markOrganizerLayoutEdited');
  expectedManifest.handlers = expectedManifest.handlers.filter(name => name !== 'onUpdateResource');
  expectedManifest.useCallbackHandlers = expectedManifest.useCallbackHandlers.filter(name => name !== 'onUpdateResource');
  if (receipt.bootHotRecord) expectedManifest[receipt.bootHotRecord.key].push(receipt.bootHotRecord.item);
}
expectedManifest.deps.sort();
assert.deepEqual(manifest, expectedManifest);
const result = { label, passed: true, completedAt: new Date().toISOString(), files: receipt.files, generatorInputs: receipt.generatorInputs, parsedUniqueProductionFiles: 3, hostMirrorsExact: true, runtimeMirrorsExact: true, generatedParityExact: true, gettersAndManifestExact: true, pin: receipt.pin, reversedRawPreimages: reversed, manifestChange: { added: receipt.bootOperationsIncluded ? 7 : 6, removedUnused: 2, returnedHotHandler: receipt.bootOperationsIncluded ? 'onUpdateResource' : null }, removedUnusedDependencies: ['getWordSoundsPortableAudioCoverage', 'handleAnalysisTextChange'] };
fs.writeFileSync(path.join(__dirname, `${label}-consistency.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ label, passed: true, files: receipt.files.length, pin: receipt.pin }));
