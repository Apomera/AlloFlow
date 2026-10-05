// Run from the repository root. Every suite is serial and uses one worker.
const cp = require('node:child_process'), fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-trail-identity-2026-10-02';
const sourcePath = 'stem_lab/stem_tool_physics.js', mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_physics.js';
const source = fs.readFileSync(sourcePath), digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert(source.equals(fs.readFileSync(mirrorPath)), 'Source and desktop copy differ');
fs.mkdirSync(report, { recursive: true });
const historical = ['physics-recorded-flights-2026-10-02', 'physics-recorded-context-2026-10-02',
  'physics-velocity-clarity-2026-10-02', 'physics-point-clarity-2026-10-02']
  .flatMap(name => {
    const directory = 'reports/' + name;
    return fs.readdirSync(directory).filter(file => file === 'visual-results.json' || file.endsWith('.png'))
      .map(file => ({ path: directory + '/' + file, sha256: digest(fs.readFileSync(directory + '/' + file)) }));
  });
function run(args, environment = {}) {
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...environment } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Check exited with status ' + (result.status ?? 1));
}
function browsers(files, label, visualDirectory = report) {
  run(['node_modules/@playwright/test/cli.js', 'test', ...files.map(file => 'tests/e2e/' + file),
    '--config=' + report + '/playwright.config.ts', '--workers=1', '--retries=0', '--max-failures=1',
    '--reporter=list,json', '--output=' + report + '/' + label + '-artifacts'],
    { PLAYWRIGHT_JSON_OUTPUT_FILE: report + '/' + label + '-results.json', PHYSICS_VISUAL_REPORT_DIR: visualDirectory,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-semi-space-size=4', '--max-old-space-size=384'].filter(Boolean).join(' ') });
}
const chosen = process.argv.slice(2), all = chosen.length === 0;
try {
  if (all || chosen.includes('--unit')) run(['node_modules/vitest/vitest.mjs', 'run', 'tests/physics', '--maxWorkers=1', '--pool=threads',
    '--no-file-parallelism', '--testTimeout=30000', '--hookTimeout=30000',
    '--reporter=default', '--reporter=json', '--outputFile=' + report + '/unit-results.json']);
  if (all || chosen.includes('--trail')) browsers(['physics-trail-identity.spec.ts'], 'trail');
  if (all || chosen.includes('--regression')) {
    browsers(['physics-visual-layout.spec.ts', 'physics-clarity.spec.ts', 'physics-flight-history.spec.ts',
      'physics-apex-inspection.spec.ts'], 'regression');
    browsers(['physics-velocity-clarity.spec.ts'], 'point-regression', report + '/point-regression');
  }
} finally {
  assert(fs.readFileSync(sourcePath).equals(source), 'Source changed during checks');
  assert(fs.readFileSync(mirrorPath).equals(source), 'Desktop copy changed during checks');
  for (const item of historical) assert.equal(digest(fs.readFileSync(item.path)), item.sha256, 'Historical capture changed: ' + item.path);
  fs.writeFileSync(report + '/check-integrity.json', JSON.stringify({ sourceSha256: digest(source), sourceUnchanged: true,
    mirrorMatches: true, historicalFilesPreserved: historical.length, historical }, null, 2) + '\n');
  console.log('Source and mirror stable; ' + historical.length + ' historical captures unchanged.');
}
