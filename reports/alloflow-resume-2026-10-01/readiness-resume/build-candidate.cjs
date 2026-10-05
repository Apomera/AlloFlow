const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
process.chdir(root);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file);
const before = new Map();
const mirrorBaselines = new Map();
const resumePartial = process.argv.includes('--resume-partial');
const sources = ['word_sounds_readiness_contract.js', 'host_handlers_source.jsx', 'view_word_sounds_preview_source.jsx', 'live_aac_source.jsx', 'module_scope_extras_source.jsx', 'word_sounds_module.js'];
for (const file of sources) before.set(file, read(file));
const outputs = ['host_handlers_module.js', 'view_word_sounds_preview_module.js', 'live_aac_module.js', 'module_scope_extras_module.js', 'allo_data_module.js'];
for (const file of outputs) {
  const publicFile = 'desktop/web-app/public/' + file;
  if (file === 'host_handlers_module.js' && resumePartial) {
    assert.equal(sha(read(publicFile)), '9fd0873d60692bf2852fbc488fc8850483b36be3d6148cb32b9e732f8fd54b9c', 'Public HostHandlers changed since failed write; hold');
    assert(read(file).equals(Buffer.from(require(path.join(root, '_build_first_wave_view_modules.js')).buildFirstWaveModule('HostHandlers'))), 'Partial root output is not current canonical output');
  } else assert(read(file).equals(read(publicFile)), 'Root/public preflight mismatch: ' + file);
  before.set(file, read(file)); before.set(publicFile, read(publicFile));
  mirrorBaselines.set(file, read(publicFile));
}
const registryFiles = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
assert(read(registryFiles[0]).equals(read(registryFiles[1])), 'Registry root/public mismatch');
for (const file of registryFiles) before.set(file, read(file));
const oldDataSource = read('allo_data_source.jsx').toString('utf8');
before.set('allo_data_source.jsx', read('allo_data_source.jsx'));
const dataWrapper = source => "(function() {\n'use strict';\nif (window.AlloModules && window.AlloModules.AlloDataModule) { console.log('[CDN] AlloDataModule already loaded, skipping'); return; }\n// allo_data_source.jsx — pure data: phoneme guide, prompts, i18n strings, etc.\n// Extracted from AlloFlowANTI.txt on 2026-04-21.\n" + source + '\nwindow.AlloModules.AlloDataModule = true;\n})();\n';
const candidates = JSON.parse(read('reports/alloflow-resume-2026-10-01/readiness-integration/english-strings-candidate.json').toString('utf8').replace(/^\uFEFF/, ''));
const keys = Object.keys(candidates);
assert.equal(keys.length, 26, 'Only assigned readiness keys');
for (const key of keys) assert(/^word_sounds\.readiness_[a-z_]+$/.test(key) && typeof candidates[key] === 'string');
if (!read('allo_data_module.js').equals(Buffer.from(dataWrapper(oldDataSource)))) {
  assert(resumePartial, 'AlloData has a newer generated change absent from source; hold instead of overwrite');
  const eol = oldDataSource.match(/const WORD_SOUNDS_STRINGS = \{(\r?\n)/)[1];
  const ownInsertion = keys.map(key => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(candidates[key]) + ',').join(eol) + eol;
  assert(oldDataSource.includes(ownInsertion), 'Exact prior owned insertion absent');
  const reconstructedSource = oldDataSource.replace(ownInsertion, '');
  assert(read('allo_data_module.js').equals(Buffer.from(dataWrapper(reconstructedSource))), 'Existing generated AlloData contains another change; hold');
}
const registryText = before.get(registryFiles[0]).toString('utf8');
const oldRegistry = JSON.parse(registryText.replace(/^\uFEFF/, ''));
const installed = keys.filter(key => Object.hasOwn(oldRegistry.word_sounds, key.slice(12)));
let nextRegistry = registryText, nextData = oldDataSource;
if (installed.length) {
  assert.equal(installed.length, keys.length, 'Partial keys require reconciliation');
  for (const key of keys) assert.equal(oldRegistry.word_sounds[key.slice(12)], candidates[key]);
} else {
  const anchor = /(^  "word_sounds": \{)(\r?\n)/m;
  const match = registryText.match(anchor); assert(match, 'Registry namespace anchor');
  const addition = keys.map(key => '    ' + JSON.stringify(key.slice(12)) + ': ' + JSON.stringify(candidates[key]) + ',').join(match[2]) + match[2];
  nextRegistry = registryText.replace(anchor, (_, head, eol) => head + eol + addition);
  assert.equal(nextRegistry.replace(addition, ''), registryText, 'Existing registry bytes preserved');
  const projected = JSON.parse(nextRegistry.replace(/^\uFEFF/, ''));
  for (const key of keys) delete projected.word_sounds[key.slice(12)];
  assert.deepEqual(projected, oldRegistry, 'Existing registry values preserved');
}
const dataAnchor = /const WORD_SOUNDS_STRINGS = \{(\r?\n)/;
const dataMatch = oldDataSource.match(dataAnchor); assert(dataMatch);
const oldStrings = new Function(oldDataSource.match(/const WORD_SOUNDS_STRINGS = (\{[\s\S]*?\n\});/)[0] + '\nreturn WORD_SOUNDS_STRINGS;')();
const dataInstalled = keys.filter(key => Object.hasOwn(oldStrings, key));
if (dataInstalled.length) {
  assert.equal(dataInstalled.length, keys.length);
  for (const key of keys) assert.equal(oldStrings[key], candidates[key]);
} else {
  const addition = keys.map(key => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(candidates[key]) + ',').join(dataMatch[1]) + dataMatch[1];
  nextData = oldDataSource.replace(dataAnchor, match => match + addition);
  assert.equal(nextData.replace(addition, ''), oldDataSource, 'Existing fallback bytes preserved');
  const nextStrings = new Function(nextData.match(/const WORD_SOUNDS_STRINGS = (\{[\s\S]*?\n\});/)[0] + '\nreturn WORD_SOUNDS_STRINGS;')();
  for (const key of keys) delete nextStrings[key];
  assert.deepEqual(nextStrings, oldStrings, 'Existing fallback values preserved');
}
if (process.argv.includes('--preflight-only')) {
  console.log(JSON.stringify({ state: 'read-only-preflight-passed', keyCount: keys.length, rootPublicPairsChecked: outputs.length + 1, resumedPartialOwnBuild: resumePartial, allOutputsEitherMatchedOrVerifiedAsOwnPartialWrite: true, existingRegistryAndFallbackBytesPreserved: true }));
  process.exit(0);
}
function guardedWrite(file, bytes, expected) {
  assert(read(file).equals(expected), 'Concurrent change: ' + file);
  const temporary = file + '.readiness-' + process.pid + '.tmp';
  fs.writeFileSync(temporary, bytes);
  assert(read(file).equals(expected), 'Concurrent change before replace: ' + file);
  fs.renameSync(temporary, file);
}
fs.writeFileSync(path.join(__dirname, 'preflight-baseline.json'), JSON.stringify({ checkedAt: new Date().toISOString(), resumedPartialOwnBuild: resumePartial, files: [...before].map(([file, bytes]) => ({ file, sha256: sha(bytes), bytes: bytes.length })) }, null, 2) + '\n');
for (const file of registryFiles) if (nextRegistry !== registryText) guardedWrite(file, nextRegistry, before.get(file));
if (nextData !== oldDataSource) guardedWrite('allo_data_source.jsx', nextData, before.get('allo_data_source.jsx'));
for (const args of [['_build_first_wave_view_modules.js', 'HostHandlers'], ['_build_view_word_sounds_preview_module.js'], ['_build_live_aac_module.js'], ['_build_module_scope_extras_module.js'], ['_build_allo_data_module.js']]) {
  cp.execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
}
for (const file of sources) assert(read(file).equals(before.get(file)), 'Source changed during build: ' + file);
assert.equal(read('allo_data_source.jsx').toString('utf8'), nextData, 'Concurrent AlloData edit during build');
for (const file of registryFiles) assert.equal(read(file).toString('utf8'), nextRegistry, 'Concurrent registry edit during build: ' + file);
const mirrors = [], heldMirrors = [];
const mirrorEvidence = JSON.parse(read('reports/alloflow-resume-2026-10-01/mirror-sync.json').toString('utf8'));
function knownMirrorHash(file, value) {
  if (Array.isArray(value)) return value.some(row => knownMirrorHash(file, row));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, entry]) => key === file && entry === sha(read(file)) || typeof entry === 'object' && knownMirrorHash(file, entry));
}
function safeMirror(file, newBytes, oldBytes) {
  if (!fs.existsSync(file)) return;
  const current = read(file);
  let head = null; try { head = cp.execFileSync('git', ['show', 'HEAD:' + file], { maxBuffer: 8 * 1024 * 1024 }); } catch (_) {}
  const preimageFile = 'reports/alloflow-resume-2026-10-01/readiness-transport/player-preimage.json';
  const playerPreimage = fs.existsSync(preimageFile) ? JSON.parse(read(preimageFile).toString('utf8')) : {};
  const safe = current.equals(newBytes) || oldBytes && current.equals(oldBytes) || head && current.equals(head) || playerPreimage.sha256 === sha(current) || knownMirrorHash(file, mirrorEvidence);
  if (!safe) { heldMirrors.push({ file, sha256: sha(current), reason: 'Neither HEAD nor confirmed preimage; preserved' }); return; }
  if (!current.equals(newBytes)) guardedWrite(file, newBytes, current);
  mirrors.push({ file, sha256: sha(read(file)) });
}
for (const file of outputs) {
  assert(read(file).equals(read('desktop/web-app/public/' + file)), 'Built root/public mismatch: ' + file);
  new vm.Script(read(file).toString('utf8'), { filename: file });
  safeMirror('desktop/web-app/build/' + file, read(file), mirrorBaselines.get(file));
}
new vm.Script(read('word_sounds_module.js').toString('utf8'), { filename: 'word_sounds_module.js' });
safeMirror('desktop/web-app/public/word_sounds_module.js', read('word_sounds_module.js'), null);
safeMirror('desktop/web-app/build/word_sounds_module.js', read('word_sounds_module.js'), null);
safeMirror('desktop/web-app/build/ui_strings.js', read('ui_strings.js'), before.get('ui_strings.js'));
const files = [...sources, 'allo_data_source.jsx', ...outputs, ...registryFiles, 'AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'reflective_journal.md'];
const evidence = { checkedAt: new Date().toISOString(), head: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), keyCount: keys.length, allExistingRegistryAndFallbackBytesPreserved: true, files: files.map(file => ({ file, sha256: sha(read(file)), bytes: read(file).length })), mirrors, heldMirrors, freeBytes: Number(fs.statfsSync('.').bavail) * Number(fs.statfsSync('.').bsize), sharedHostFilesChangedByThisScript: false };
fs.writeFileSync(path.join(__dirname, 'candidate.json'), JSON.stringify(evidence, null, 2) + '\n');
const hostFiles = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const pinCandidates = [...outputs, 'word_sounds_module.js', 'ui_strings.js'].map(file => {
  const digest = sha(read(file));
  return { module: file, sha256: digest, proposedUrl: 'https://alloflow-cdn.pages.dev/' + file + '?v=' + digest.slice(0, 8), currentUrls: hostFiles.map(host => ({ host, urls: Array.from(new Set(read(host).toString('utf8').match(/https:\/\/alloflow-cdn\.pages\.dev\/[^\s'"`]+/g) || [])).filter(url => url.includes('/' + file + '?')) })), applied: false };
});
fs.writeFileSync(path.join(__dirname, 'pin-proposals.json'), JSON.stringify(pinCandidates, null, 2) + '\n');
console.log(JSON.stringify({ state: 'scoped-builds-complete', keyCount: keys.length, mirrored: mirrors.length, heldMirrors, freeBytes: evidence.freeBytes }));
