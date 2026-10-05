// Run from the repository root. Suites are serial and use one worker.
const cp = require('node:child_process'), fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-point-clarity-2026-10-02';
const sourcePath = 'stem_lab/stem_tool_physics.js', mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_physics.js';
const source = fs.readFileSync(sourcePath), digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert(source.equals(fs.readFileSync(mirrorPath)), 'Source and desktop copy differ');
fs.mkdirSync(report, { recursive: true });
const historical = [
  ['reports/physics-recorded-flights-2026-10-02', 'recordings-'],
  ['reports/physics-recorded-context-2026-10-02', 'context-'],
  ['reports/physics-velocity-clarity-2026-10-02', 'velocity-']
].flatMap(([directory, prefix]) => fs.readdirSync(directory)
  .filter(name => name === 'visual-results.json' || (name.startsWith(prefix) && name.endsWith('.png')))
  .map(name => ({ path: directory + '/' + name, sha256: digest(fs.readFileSync(directory + '/' + name)) })));
function run(args, environment = {}) {
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...environment } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Check exited with status ' + (result.status ?? 1));
}
function browsers(files, label) {
  run(['node_modules/@playwright/test/cli.js', 'test', ...files.map(file => 'tests/e2e/' + file),
    '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + report + '/' + label + '-artifacts'],
    { PLAYWRIGHT_JSON_OUTPUT_FILE: report + '/' + label + '-results.json', PHYSICS_VISUAL_REPORT_DIR: report,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-semi-space-size=4', '--max-old-space-size=384'].filter(Boolean).join(' ') });
}
const chosen = process.argv.slice(2);
const all = chosen.length === 0;
try {
  if (all || chosen.includes('--unit')) run(['node_modules/vitest/vitest.mjs', 'run', 'tests/physics', '--maxWorkers=1', '--pool=forks',
    '--reporter=default', '--reporter=json', '--outputFile=' + report + '/unit-results.json']);
  if (all || chosen.includes('--canvas')) browsers(['physics-visual-layout.spec.ts', 'physics-clarity.spec.ts'], 'canvas-regression');
  if (all || chosen.includes('--point')) browsers(['physics-velocity-clarity.spec.ts'], 'point');
  if (all || chosen.includes('--apex')) browsers(['physics-apex-inspection.spec.ts'], 'apex-regression');
} finally {
  assert(fs.readFileSync(sourcePath).equals(source), 'Source changed during checks');
  assert(fs.readFileSync(mirrorPath).equals(source), 'Desktop copy changed during checks');
  for (const item of historical) assert.equal(digest(fs.readFileSync(item.path)), item.sha256, 'Historical capture changed: ' + item.path);
  fs.writeFileSync(report + '/check-integrity.json', JSON.stringify({ sourceSha256: digest(source), sourceUnchanged: true,
    mirrorMatches: true, historicalFilesPreserved: historical.length, historical }, null, 2) + '\n');
  console.log('Source and mirror stable; ' + historical.length + ' historical captures unchanged.');
}
