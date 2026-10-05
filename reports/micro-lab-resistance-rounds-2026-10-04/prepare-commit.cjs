const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd(), folder = 'reports/micro-lab-resistance-rounds-2026-10-04', report = path.resolve(folder);
assert(!process.env.GIT_INDEX_FILE);
const git = (args, env = {}, input) => cp.execFileSync('git', args, { cwd: root, env: { ...process.env, ...env }, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const validation = JSON.parse(fs.readFileSync(path.join(report, 'validation-summary.json'), 'utf8'));
assert.deepEqual(require('./audit-validation.cjs')(), validation);
const parent = '36d70aaa36bddf4789ef5d56dca420283a11098d';
git(['merge-base', '--is-ancestor', parent, 'refs/heads/codex/micro-home-integrity-2026-10-03']);
const branch = git(['symbolic-ref', '-q', 'HEAD']).trim(), checkoutParent = git(['rev-parse', 'HEAD']).trim();
const owned = ['stem_lab/stem_tool_microbiology.js', 'desktop/web-app/public/stem_lab/stem_tool_microbiology.js',
  'tests/microbiology_resistance_rounds.test.js', 'tests/e2e/microbiology-resistance-rounds.spec.ts', 'ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
for (const name of fs.readdirSync(report)) {
  if (!/^commit-(manifest|receipt)/.test(name) && /\.(md|json|png|txt|csv|cjs)$/.test(name) && fs.statSync(path.join(report, name)).isFile()) owned.push(folder + '/' + name);
}
const validatedFiles = Object.fromEntries(owned.map(file => [file, hash(fs.readFileSync(file))]));
const registryBlobs = {};
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const base = git(['show', parent + ':' + file]);
  const patch = require('./registry-patch.cjs')(base, fs.readFileSync(owned[0], 'utf8'));
  const working = JSON.parse(fs.readFileSync(file, 'utf8')).stem.microbiology;
  for (const [key, value] of Object.entries(patch.labels)) assert.equal(working[key], value);
  registryBlobs[file] = git(['hash-object', '-w', '--stdin'], {}, patch.text).trim();
}
function verify() {
  assert.equal(git(['symbolic-ref', '-q', 'HEAD']).trim(), branch); assert.equal(git(['rev-parse', 'HEAD']).trim(), checkoutParent);
  for (const [file, expected] of Object.entries({ ...validatedFiles, ...validation.testInputs })) assert.equal(hash(fs.readFileSync(file)), expected, file);
}
const index = path.join(report, '.prepare-index-' + process.pid), env = { GIT_INDEX_FILE: index };
try {
  verify(); git(['read-tree', parent], env);
  git(['add', '--', ...owned.filter(file => !Object.hasOwn(registryBlobs, file))], env);
  for (const [file, oid] of Object.entries(registryBlobs)) git(['update-index', '--add', '--cacheinfo', '100644,' + oid + ',' + file], env);
  const tree = git(['write-tree'], env).trim();
  const changed = git(['diff', '--name-only', '-z', parent, tree]).split('\0').filter(Boolean);
  assert(changed.length && changed.every(file => owned.includes(file)));
  verify();
  fs.writeFileSync(path.join(report, 'commit-manifest.json'), JSON.stringify({ branch, checkoutParent, parent, tree, changed, validatedFiles, registryBlobs }, null, 2) + '\n');
  console.log(JSON.stringify({ parent, tree, changedFiles: changed.length, sealedFiles: owned.length, checkoutParent }));
} finally { if (fs.existsSync(index)) fs.unlinkSync(index); }
