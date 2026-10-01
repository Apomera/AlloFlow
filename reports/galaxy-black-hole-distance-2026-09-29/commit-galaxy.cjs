// Prepare a scoped Galaxy commit while preserving other shared staged changes.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const report = path.relative(root, __dirname).replace(/\\/g, '/');
const candidate = path.join(__dirname, 'commit-candidate');
const git = (args, options = {}) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const full = JSON.parse(read(report + '/candidate-galaxy-tests.json'));
assert.equal(full.numPassedTests, 401, 'All 401 Galaxy tests must finish before committing');
assert.equal(full.numFailedTests, 0);
assert.equal(full.success, true);
const finalLayout = JSON.parse(read(report + '/final-layout-tests.json'));
assert.equal(finalLayout.numPassedTests, 80);
assert.equal(finalLayout.numFailedTests, 0);
assert.equal(finalLayout.success, true);

function span(text) {
  const needle = '"galaxy": {', at = text.indexOf(needle);
  assert(at >= 0 && text.indexOf(needle, at + 1) < 0, 'Unique Galaxy namespace');
  const start = at + needle.length - 1;
  let depth = 0, quoted = false, escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '"') quoted = false; }
    else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return [start, i + 1];
  }
  throw Error('Unclosed Galaxy namespace');
}
const currentUi = read('ui_strings.js');
const galaxy = currentUi.slice(...span(currentUi));
function replaceGalaxy(base) {
  const [start, end] = span(base), old = base.slice(start, end);
  const body = galaxy.replace(/\r\n/g, '\n').replace(/\n/g, old.includes('\r\n') ? '\r\n' : '\n');
  const result = base.slice(0, start) + body + base.slice(end);
  const before = JSON.parse(base), after = JSON.parse(result);
  delete before.stem.galaxy; delete after.stem.galaxy;
  assert.deepEqual(after, before, 'Only Galaxy catalog values may change');
  return result;
}
assert.deepEqual(JSON.parse(currentUi).stem.galaxy, JSON.parse(read('desktop/web-app/public/ui_strings.js')).stem.galaxy);
assert.deepEqual(JSON.parse(currentUi).stem.galaxy, JSON.parse(fs.readFileSync(path.join(candidate, 'ui_strings.js'), 'utf8')).stem.galaxy, 'Validated Galaxy catalog changed');
for (const file of ['stem_lab/stem_tool_galaxy.js', 'desktop/web-app/public/stem_lab/stem_tool_galaxy.js', 'dev-tools/i18n/stem_galaxy_en.json', 'tests/galaxy_black_hole_physics.test.js', 'tests/galaxy_black_hole_optics.test.js', 'tests/galaxy_modes_smoke.test.js']) {
  assert(fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(candidate, file))), 'Validated content changed: ' + file);
}

const files = [
  'stem_lab/stem_tool_galaxy.js', 'desktop/web-app/public/stem_lab/stem_tool_galaxy.js',
  'dev-tools/i18n/stem_galaxy_en.json', 'dev-tools/galaxy_black_hole_qa.cjs',
  'tests/galaxy_black_hole_physics.test.js', 'tests/galaxy_black_hole_optics.test.js', 'tests/galaxy_modes_smoke.test.js',
  ...['REVIEW.md', 'validation-summary.json', 'candidate-validation.json', 'candidate-galaxy-tests.json', 'candidate-full-run.json', 'candidate-lifecycle-tests.json', 'candidate-engine-tests.json', 'final-layout-tests.json', 'browser-results.json', 'distance-browser-results.json', 'distance-results.json', 'follow-results.json', 'planning-results.json', 'optical-browser-results.json', 'distance-star-1440.png', 'distance-star-390.png', 'distance-star-320.png', 'distance-after-capture.png', 'distance-rtl-320.png', 'follow-star-390.png'].map(file => report + '/' + file),
];
const uiFiles = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const scope = [...files, ...uiFiles];
const base = git(['rev-parse', 'HEAD']).trim();
const sharedBefore = new Map(scope.map(file => [file, git(['ls-files', '--stage', '--', file])]));
const index = path.join(__dirname, 'galaxy-commit.index');
assert(!fs.existsSync(index), 'A prior prepared index needs inspection');
const env = { ...process.env, GIT_INDEX_FILE: index };
const stagedGit = args => git(args, { env });
stagedGit(['read-tree', base]);
stagedGit(['add', '--', ...files]);
for (const file of uiFiles) {
  const content = replaceGalaxy(git(['show', base + ':' + file]));
  const blob = git(['hash-object', '-w', '--stdin'], { input: content }).trim();
  stagedGit(['update-index', '--add', '--cacheinfo', '100644', blob, file]);
}
stagedGit(['diff', '--cached', '--check']);
const names = stagedGit(['diff', '--cached', '--name-only']).trim().split('\n');
assert(names.every(file => scope.includes(file)), 'Unexpected file in prepared commit');
assert(names.includes('stem_lab/stem_tool_galaxy.js'));
console.log(stagedGit(['diff', '--cached', '--stat']));
assert.equal(git(['rev-parse', 'HEAD']).trim(), base, 'HEAD changed during preparation; refresh the candidate');
console.log(stagedGit(['commit', '-m', 'Enhance Galaxy black hole experiments, optics and playback', '-m', 'Add independent debris trajectories, release planning and comparison, a follow camera, and a synchronized distance chart with keyboard and touch inspection. Add the Schwarzschild optical view and improve paused rendering, labels, and mobile controls.\n\nValidated with 401 Galaxy tests and desktop/mobile WebGL checks.']));
const commit = git(['rev-parse', 'HEAD']).trim();
const committedNames = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit]).trim().split('\n');
assert(committedNames.every(file => scope.includes(file)), 'Commit contains unexpected paths');

// Advance only our unchanged shared-index entries. Other staged edits survive.
const updates = [];
for (const file of files) {
  assert.equal(git(['ls-files', '--stage', '--', file]), sharedBefore.get(file), 'Shared staged path changed during commit: ' + file);
  const blob = git(['rev-parse', commit + ':' + file]).trim();
  updates.push('100644 ' + blob + '\t' + file);
}
for (const file of uiFiles) {
  const existing = git(['show', ':' + file]), merged = replaceGalaxy(existing);
  if (existing !== merged) {
    const blob = git(['hash-object', '-w', '--stdin'], { input: merged }).trim();
    updates.push('100644 ' + blob + '\t' + file);
  }
}
git(['update-index', '--index-info'], { input: updates.join('\n') + '\n' });
fs.writeFileSync(path.join(__dirname, 'commit-receipt.json'), JSON.stringify({ commit, parent: base, files: committedNames, sharedStagedEditsPreserved: true }, null, 2) + '\n');
fs.unlinkSync(index);
console.log(JSON.stringify({ commit, files: committedNames.length, sharedStagedEditsPreserved: true }));
