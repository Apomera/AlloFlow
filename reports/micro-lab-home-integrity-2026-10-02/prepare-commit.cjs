// Prepare only this pass on the preceding verified Micro Lab commit.
// The checkout branch, shared index and staging remain untouched.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd(), report = path.resolve('reports/micro-lab-home-integrity-2026-10-02');
const git = (args, env = {}, input) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (process.env.GIT_INDEX_FILE) throw Error('Use the normal checkout environment.');
const validation = JSON.parse(fs.readFileSync(path.join(report, 'validation-summary.json'), 'utf8'));
assert.equal(validation.unit.passed, 941); assert.equal(validation.unit.files, 26); assert.equal(validation.unit.failed, 0);
assert.equal(validation.browser.passed, 70);
for (const key of ['failed', 'skipped', 'flaky']) assert.equal(validation.browser[key], 0);
for (const key of ['runtimeMirrored', 'microbiologyNamespacesMatch', 'syntaxChecksPassed']) assert.equal(validation.interface[key], true);
for (const key of ['missing', 'changedFallbacks']) assert.equal(validation.interface[key], 0);
const browserEvidence = require('./verify-browser.cjs')();
assert.deepEqual(validation.browser.evidence, browserEvidence);
assert.deepEqual(validation.runners.filter(item => item.kind !== 'unit'), browserEvidence.runners);
assert.equal(validation.runners.length, 1 + browserEvidence.runners.length);
for (const kind of ['unit']) {
  const matches = validation.runners.filter(item => item.kind === kind); assert.equal(matches.length, 1);
  const status = matches[0]; assert.equal(status.expected, 941);
  assert.equal(status.phase, 'passed'); assert.equal(status.exitCode, 0); assert.equal(status.signal, null);
  for (const key of ['sourceStillMatches', 'testInputsStillMatch', 'syntaxChecksPassed']) assert.equal(status[key], true);
  assert.equal(status.sourceSha256, validation.sourceSha256); assert(status.finished);
}
assert.equal(Object.keys(validation.testInputs).length, 37);
const prior = JSON.parse(fs.readFileSync('reports/micro-lab-mystery-integrity-2026-10-02/commit-receipt-isolated-branch.json', 'utf8'));
assert.equal(prior.refUpdated, true); assert.equal(prior.commit, 'ca981c6e06161c81f9946202e9fa3078d9ea43ed');
git(['merge-base', '--is-ancestor', prior.commit, prior.branch]);
const parent = prior.commit, branch = git(['symbolic-ref', '-q', 'HEAD']).trim(), checkoutParent = git(['rev-parse', 'HEAD']).trim();
const owned = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js',
  'tests/microbiology_home_integrity.test.js', 'tests/e2e/microbiology-home-integrity.spec.ts'];
for (const name of fs.readdirSync(report)) {
  if (/^commit-(manifest|receipt)/.test(name)) continue;
  if (/\.(md|json|png|txt|csv|cjs)$/.test(name) && fs.statSync(path.join(report, name)).isFile()) owned.push('reports/micro-lab-home-integrity-2026-10-02/' + name);
}
const validatedFiles = Object.fromEntries(owned.map(file => [file, hash(fs.readFileSync(file))]));
for (const file of owned.slice(0, 2)) assert.equal(validatedFiles[file], validation.sourceSha256);
function verify() {
  assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), branch);
  assert.equal(git(['rev-parse', 'HEAD']).trim(), checkoutParent);
  for (const [file, sha] of Object.entries({ ...validatedFiles, ...validation.testInputs })) assert.equal(hash(fs.readFileSync(file)), sha, file);
}
const index = path.join(report, '.prepare-index-' + process.pid), env = { GIT_INDEX_FILE: index };
try {
  verify(); git(['read-tree', parent], env); git(['add', '--', ...owned], env);
  const tree = git(['write-tree'], env).trim();
  const changed = git(['diff', '--name-only', '-z', parent, tree]).split('\0').filter(Boolean);
  assert(changed.length && changed.every(file => owned.includes(file)), 'Commit scope changed unrelated files.');
  verify();
  fs.writeFileSync(path.join(report, 'commit-manifest.json'), JSON.stringify({ branch, checkoutParent, parent, tree, changed, validatedFiles }, null, 2) + '\n');
  console.log(JSON.stringify({ parent, tree, changedFiles: changed.length, sealedFiles: owned.length, checkoutParent }));
} finally { if (fs.existsSync(index)) fs.unlinkSync(index); }
