const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

// This preparation writes only into its private work directory.
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const p = name => path.join(__dirname, name);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readRepo = name => fs.readFileSync(path.join(repo, name), 'utf8');
const baseline = fs.readFileSync(p('before.js'), 'utf8');
const candidate = fs.readFileSync(p('candidate.js'), 'utf8');
const delta = JSON.parse(fs.readFileSync(p('delta.json'), 'utf8'));
const fixedBaseline = 'f551cf0c50073315effbf3fa5bcd9ce2dd3e1b806dbfcbd3f1434ba7e831af2c';
const selftest = process.argv.includes('--selftest');
assert.equal(delta.beforeSHA256, fixedBaseline);
assert.equal(sha(baseline), fixedBaseline);
assert.equal(sha(candidate), delta.afterSHA256);
assert.ok(delta.edits.length > 0);
let forward = baseline;
for (const edit of delta.edits) {
  assert.equal(forward.split(edit.old).length, 2, 'source edit has one exact input');
  forward = forward.replace(edit.old, edit.new);
}
assert.equal(forward, candidate, 'exact edit list accounts for every source byte');

const sourceCopies = ['stem_lab/stem_tool_firstresponse.js',
  'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js',
  'desktop/app-build/stem_lab/stem_tool_firstresponse.js',
  'desktop/web-app/build/stem_lab/stem_tool_firstresponse.js'];
const sourceHashes = Object.fromEntries(sourceCopies.map(name => [name, sha(readRepo(name))]));
for (const [name, hash] of Object.entries(sourceHashes)) assert.equal(hash, fixedBaseline, 'unchanged source baseline: ' + name);
const fixtureHashes = Object.fromEntries(fs.readdirSync(path.join(repo, 'tests'))
  .filter(name => /^firstresponse.*\.test\.js$/.test(name)).sort()
  .map(name => [name, sha(fs.readFileSync(path.join(repo, 'tests', name)))]));
const helperNames = fs.readdirSync(path.join(repo, 'tests/helpers'))
  .filter(name => name.startsWith('firstresponse_') && /_delta\.(cjs|json)$/.test(name)).sort();
const helperHashes = Object.fromEntries(helperNames.map(name => [name, sha(readRepo('tests/helpers/' + name))]));
const checkerFile = 'dev-tools/firstresponse_arm_finish_check.cjs';
const checkerBefore = readRepo(checkerFile);
const checkerHashes = Object.fromEntries(fs.readdirSync(path.join(repo, 'dev-tools')).filter(name => /^firstresponse.*\.cjs$/.test(name)).sort().map(name => [name, sha(readRepo('dev-tools/' + name))]));
assert.equal(Object.keys(checkerHashes).length, 8, 'eight existing First Response checker files');
let gitDir = path.join(repo, '.git');
if (!fs.statSync(gitDir).isDirectory()) gitDir = path.resolve(repo, fs.readFileSync(gitDir, 'utf8').trim().replace(/^gitdir:\s*/, ''));
const indexPath = path.join(gitDir, 'index');
const indexSHA256 = fs.existsSync(indexPath) ? sha(fs.readFileSync(indexPath)) : null;
const frozenInputs = { sourceHashes, fixtureHashes, helperHashes, checkerHashes, armCheckerSHA256: sha(checkerBefore), indexPath, indexSHA256 };
const snapshotPath = p('history-input-snapshot.json');
if (fs.existsSync(snapshotPath)) assert.deepEqual(frozenInputs, JSON.parse(fs.readFileSync(snapshotPath, 'utf8')), 'shared history inputs retain first-read bytes');
else {
  assert.equal(Object.keys(fixtureHashes).length, 39, '39 existing raw First Response tests');
  fs.writeFileSync(snapshotPath, JSON.stringify(frozenInputs, null, 2) + '\n');
}

const helper = `const { createHash } = require('node:crypto');
const delta = require('./firstresponse_mouth_surface_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertMouthSurface(source) {
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Mouth surface source does not match its exact refinement delta');
  for (const edit of [...delta.edits].reverse()) {
    if (source.split(edit.new).length !== 2) throw new Error('Mouth surface reversal is not unique: ' + (edit.name || 'source edit'));
    source = source.replace(edit.new, edit.old);
  }
  if (hash(source) !== delta.beforeSHA256) throw new Error('Mouth surface reversal did not recover fixed baseline');
  return source;
}
module.exports = { revertMouthSurface, delta };
`;
const additions = [
  { file: 'tests/helpers/firstresponse_mouth_surface_delta.cjs', content: helper },
  { file: 'tests/helpers/firstresponse_mouth_surface_delta.json', content: JSON.stringify(delta, null, 2) + '\n' }
];
for (const addition of additions) {
  assert.ok(!fs.existsSync(path.join(repo, addition.file)), 'new helper destination must not already exist');
  addition.SHA256 = sha(addition.content);
  addition.beforeSHA256 = null;
  addition.afterSHA256 = addition.SHA256;
  fs.writeFileSync(p(path.basename(addition.file)), addition.content);
}
const helperFile = 'tests/helpers/firstresponse_brow_finish_delta.cjs';
const helperBefore = readRepo(helperFile);
const marker = 'function revertBrowFinish(source) {';
assert.equal(helperBefore.split(marker).length, 2);
const normalization = "\n  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {\n    source = require('./firstresponse_mouth_surface_delta.cjs').revertMouthSurface(source);\n  }";
const helperAfter = helperBefore.replace(marker, marker + normalization);
assert.equal(helperAfter.replace(normalization, ''), helperBefore, 'all original brow helper statements remain unchanged');

for (const code of [helper, helperAfter]) new Function(code);
const edits = [{ file: helperFile, before: helperBefore, after: helperAfter }]
  .map(edit => ({ ...edit, beforeSHA256: sha(edit.before), afterSHA256: sha(edit.after) }));

const sandbox = p('history-helper-sandbox');
fs.mkdirSync(sandbox, { recursive: true });
for (const name of helperNames) fs.copyFileSync(path.join(repo, 'tests/helpers', name), path.join(sandbox, name));
for (const addition of additions) fs.writeFileSync(path.join(sandbox, path.basename(addition.file)), addition.content);
fs.writeFileSync(path.join(sandbox, path.basename(helperFile)), helperAfter);
const prior = JSON.parse(fs.readFileSync(path.join(__dirname, '../firstresponse-brow-finish-work/history-preservation.json'), 'utf8'));
assert.equal(prior.sourceSHA256, fixedBaseline);
const chain = [{ file: 'firstresponse_mouth_surface_delta.cjs', method: 'revertMouthSurface', SHA256: fixedBaseline }, ...prior.historicalChain];
assert.equal(chain.length, 15, 'fifteen exact historical helper reversals');
const chainResults = [];
for (const entry of chain) {
  const api = require(path.join(sandbox, entry.file));
  assert.equal(sha(api[entry.method](candidate)), entry.SHA256, 'current source recovers ' + entry.file);
  assert.equal(sha(api[entry.method](baseline)), entry.SHA256, 'accepted baseline recovers ' + entry.file);
  assert.throws(() => api[entry.method](candidate + '\n'), 'every helper rejects unknown current bytes');
  chainResults.push({ ...entry, candidatePassed: true, baselinePassed: true, unknownSourceRejected: true });
}
const helperPath = path.join(sandbox, path.basename(additions[0].file));
const deltaPath = path.join(sandbox, path.basename(additions[1].file));
let mouth = require(helperPath);
assert.equal(mouth.revertMouthSurface(candidate), baseline);
assert.equal(mouth.revertMouthSurface(baseline), baseline);
let mutationResult = { requested: selftest, ran: false };
if (selftest) {
  const savedBytes = fs.readFileSync(deltaPath);
  const damaged = JSON.parse(savedBytes);
  damaged.edits[0].old += '\n/* intentional private selftest mutation */';
  let damagedDeltaError;
  try {
    fs.writeFileSync(deltaPath, JSON.stringify(damaged, null, 2) + '\n');
    delete require.cache[require.resolve(deltaPath)];
    delete require.cache[require.resolve(helperPath)];
    mouth = require(helperPath);
    mouth.revertMouthSurface(candidate);
  } catch (error) { damagedDeltaError = error.message; }
  finally {
    fs.writeFileSync(deltaPath, savedBytes);
    delete require.cache[require.resolve(deltaPath)];
    delete require.cache[require.resolve(helperPath)];
  }
  assert.match(damagedDeltaError || '', /did not recover fixed baseline/);
  assert.ok(fs.readFileSync(deltaPath).equals(savedBytes), 'mutated delta bytes restored and reread');
  mouth = require(helperPath);
  assert.equal(mouth.revertMouthSurface(candidate), baseline, 'freshly reread restored delta passes');
  mutationResult = { requested: true, ran: true, damagedDeltaRejected: damagedDeltaError, mutationScope: 'private sandbox delta file only', restoredAndReread: true };
}
const integration = { sourceSHA256: sha(candidate), beforeSHA256: fixedBaseline, exactReversal: true,
  sourceOutsideEditIdentical: true, unknownSourceRejected: true, historicalAssertionsChanged: false,
  sourceHashes, indexSHA256, additions, edits };
const preservation = { sourceSHA256: sha(candidate), beforeSHA256: fixedBaseline, uniqueSourceEdits: delta.edits.length,
  exactReversal: true, sourceOutsideListedEditsIdentical: true, unknownSourceRejected: true,
  historicalChain: chainResults, fixtureHashes, existingRawTests: Object.keys(fixtureHashes).length,
  sharedHistoryInputs: frozenInputs, selftest: mutationResult, historicalAssertionsChanged: false,
  limitations: 'Exact compatibility and source preservation proof only; no geometry or browser execution in this preparation step.' };
for (const [name, hash] of Object.entries(sourceHashes)) assert.equal(sha(readRepo(name)), hash);
for (const [name, hash] of Object.entries(fixtureHashes)) assert.equal(sha(fs.readFileSync(path.join(repo, 'tests', name))), hash);
for (const [name, hash] of Object.entries(helperHashes)) assert.equal(sha(readRepo('tests/helpers/' + name)), hash);
assert.equal(sha(readRepo(checkerFile)), frozenInputs.armCheckerSHA256);
for (const [name, hash] of Object.entries(checkerHashes)) assert.equal(sha(readRepo('dev-tools/' + name)), hash, 'historical checker unchanged: ' + name);
assert.equal(fs.existsSync(indexPath) ? sha(fs.readFileSync(indexPath)) : null, indexSHA256, 'shared index bytes unchanged');
assert.equal(sha(fs.readFileSync(p('candidate.js'))), integration.sourceSHA256, 'candidate unchanged during preparation');
assert.equal(sha(fs.readFileSync(p('delta.json'))), sha(JSON.stringify(delta, null, 2) + '\n'), 'delta unchanged during preparation');
fs.writeFileSync(p('history-integration.json'), JSON.stringify(integration, null, 2) + '\n');
fs.writeFileSync(p('history-preservation.json'), JSON.stringify(preservation, null, 2) + '\n');
console.log(JSON.stringify({ prepared: true, sourceSHA256: integration.sourceSHA256, helperChains: chain.length,
  existingRawTests: preservation.existingRawTests, exactReversal: true, unknownSourceRejected: true,
  mutationResult, sharedFilesWritten: 0, edits: edits.map(({file,beforeSHA256,afterSHA256})=>({file,beforeSHA256,afterSHA256})) }));
