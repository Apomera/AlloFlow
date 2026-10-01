// Prepare an isolated index without staging another owner's Moonwalk work.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = process.cwd();
const report = path.join(root, 'reports/moon-mission-enhancement-pass4-2026-09-28');
const index = path.join(report, 'commit.index');
const scope = [
  'stem_lab/stem_tool_moonmission.js',
  'desktop/web-app/public/stem_lab/stem_tool_moonmission.js',
  'tests/moonmission_launch_physics.test.js',
  'tests/moonmission_launch_playback.test.js',
  'tests/moonmission_orbit_playback.test.js',
  'tests/moonmission_science_numbers.test.js',
  'tests/moonmission_moon_and_splash.test.js',
  'tests/moonmission_proceed_gates.test.js',
  'tests/moonmission_saturn_v.test.js',
  'tests/e2e/21-moon-mission-gl.spec.ts',
  'tests/e2e/moon-mission-launch-orbit.spec.ts',
  'reports/moon-mission-enhancement-pass4-2026-09-28/README.md',
];
function git(args, isolated = true) {
  const r = cp.spawnSync('git', args, { cwd: root, env: isolated ? { ...process.env, GIT_INDEX_FILE: index } : process.env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || String(r.error));
  return r.stdout;
}
if (fs.existsSync(index)) throw new Error('The task index already exists; inspect it before any reuse.');
const head = git(['rev-parse', 'HEAD'], false).trim();
const sharedEntries = git(['ls-files', '--stage', '--', ...scope], false);
fs.writeFileSync(path.join(report, 'commit-scope.json'), JSON.stringify({ head, scope, sharedEntries }, null, 2));
git(['read-tree', head]);
git(['add', '--', ...scope]);
const baseline = path.join(report, 'baseline/preexisting-moonwalk.patch');
git(['apply', '--cached', '--reverse', '--check', baseline]);
git(['apply', '--cached', '--reverse', baseline]);
git(['diff', '--cached', '--check']);
fs.writeFileSync(path.join(report, 'staged.diff'), git(['diff', '--cached', '--binary']));
console.log(git(['diff', '--cached', '--stat']));
console.log('Prepared isolated index. No commit or shared-index mutation performed.');
