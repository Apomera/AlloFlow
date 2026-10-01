const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = process.cwd();
const report = path.join(root, 'reports/moon-mission-enhancement-pass4-2026-09-28');
const plan = JSON.parse(fs.readFileSync(path.join(report, 'commit-scope.json')));
let index = plan.index || path.join(report, 'commit.index');
function git(args, taskIndex = index) {
  const r = cp.spawnSync('git', args, { cwd: root, env: taskIndex ? { ...process.env, GIT_INDEX_FILE: taskIndex } : process.env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || String(r.error));
  return r.stdout;
}
const readme = plan.scope.find(p => p.endsWith('/README.md'));
if (process.argv.includes('--commit') && fs.readFileSync(readme, 'utf8').includes('final result pending')) throw new Error('Finish validation before committing.');
const currentHead = git(['rev-parse', 'HEAD'], null).trim();
if (currentHead !== plan.head) {
  const touched = git(['diff', '--name-only', plan.head, currentHead, '--', ...plan.scope], null).trim();
  if (touched) throw new Error('A concurrent commit changed task files; review first: ' + touched);
}
if (git(['ls-files', '--stage', '--', ...plan.scope], null) !== plan.sharedEntries) throw new Error('Shared task entries changed; preserve and review them.');
for (const source of plan.scope.slice(0, 2)) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  if (sha !== '65d3ea31e3323581a50d13a50247e6fd3797668301664985dae8a9f59025958e') throw new Error('Validated source changed: ' + source);
}
// Preserve existing file metadata. read-tree on a new index cleared it and made
// Git rescan the large OneDrive checkout. Work only on a fresh private copy;
// reverse its staged content to HEAD, then apply the exact task patch.
const taskPatch = path.join(report, 'verified-task-only.patch');
fs.writeFileSync(taskPatch, git(['diff', '--cached', '--binary', plan.head]));
const sharedPatch = git(['diff', '--cached', '--binary', currentHead], null);
const sharedPatchPath = path.join(report, 'shared-stage-for-private-copy.patch');
fs.writeFileSync(sharedPatchPath, sharedPatch);
const sharedIndex = path.resolve(root, git(['rev-parse', '--git-path', 'index'], null).trim());
index = path.join(report, 'commit-cached-' + process.pid + '.index');
fs.copyFileSync(sharedIndex, index);
if (sharedPatch.trim()) git(['apply', '--cached', '--reverse', sharedPatchPath]);
if (git(['diff', '--cached', '--name-only', currentHead]).trim()) throw new Error('Private copy did not return exactly to current HEAD.');
git(['apply', '--cached', taskPatch]);
plan.head = currentHead;
plan.index = index;
fs.writeFileSync(path.join(report, 'commit-scope.json'), JSON.stringify(plan, null, 2));
// Refresh only the report and tests. Re-adding the source would stage the preserved Moonwalk work.
git(['add', '--', ...plan.scope.slice(2)]);
git(['diff', '--cached', '--check']);
const stagedPaths = git(['diff', '--cached', '--name-only']).trim().split('\n');
if (stagedPaths.some(p => !plan.scope.includes(p)) || stagedPaths.length !== plan.scope.length) throw new Error('Unexpected commit scope.');
const sourceBlob = git(['rev-parse', ':' + plan.scope[0]]).trim();
if (sourceBlob !== git(['rev-parse', ':' + plan.scope[1]]).trim()) throw new Error('Staged mirrors differ.');
const verificationIndex = path.join(report, 'preservation-check-' + process.pid + '.index');
fs.copyFileSync(index, verificationIndex);
git(['apply', '--cached', path.join(report, 'baseline/preexisting-moonwalk.patch')], verificationIndex);
for (const source of plan.scope.slice(0, 2)) {
  const restoredBlob = git(['rev-parse', ':' + source], verificationIndex).trim();
  const workingBlob = git(['hash-object', '--path=' + source, source], null).trim();
  if (restoredBlob !== workingBlob) throw new Error('Baseline does not exactly reconstruct ' + source);
}
fs.writeFileSync(path.join(report, 'staged.diff'), git(['diff', '--cached', '--binary']));
fs.writeFileSync(path.join(report, 'preservation.json'), JSON.stringify({ verified: true, stagedMirrorsMatch: true, sourceBlob, baselineRestoresWorkingFilesExactly: true }, null, 2));
console.log(git(['diff', '--cached', '--stat']));
if (!process.argv.includes('--commit')) {
  console.log('Final isolated scope and exact baseline preservation verified; no commit performed.');
} else {
  if (git(['rev-parse', 'HEAD'], null).trim() !== plan.head) throw new Error('HEAD advanced during verification; rerun preparation against its new base.');
  console.log(git(['commit', '-m', 'Enhance Moon Mission launch physics and orbit playback']));
  const commit = git(['rev-parse', 'HEAD'], null).trim();
  if (git(['ls-files', '--stage', '--', ...plan.scope], null) !== plan.sharedEntries) throw new Error('Commit succeeded, but shared task entries changed; index refresh intentionally skipped. Commit: ' + commit);
  git(['restore', '--staged', '--source', commit, '--', ...plan.scope], null);
  const remaining = git(['diff', '--numstat', '--', ...plan.scope.slice(0, 2)], null);
  fs.writeFileSync(path.join(report, 'commit-receipt.json'), JSON.stringify({ commit, parent: plan.head, scope: plan.scope, remainingSourceDiff: remaining }, null, 2));
  console.log('Commit: ' + commit + '\nPreserved source diff:\n' + remaining);
}
