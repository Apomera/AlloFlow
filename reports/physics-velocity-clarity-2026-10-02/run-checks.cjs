// Run from the repository root. Every suite uses one worker, sequentially.
const cp = require('node:child_process'), fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const report = 'reports/physics-velocity-clarity-2026-10-02';
const sourcePath = 'stem_lab/stem_tool_physics.js', mirrorPath = 'desktop/web-app/public/stem_lab/stem_tool_physics.js';
const source = fs.readFileSync(sourcePath), digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert(source.equals(fs.readFileSync(mirrorPath)), 'Source and desktop copy differ');
const canvasFiles = ['physics-visual-layout.spec.ts', 'physics-clarity.spec.ts'];
const remainingFiles = ['physics-force-clarity.spec.ts', 'physics-energy-visuals.spec.ts',
  'physics-sample-inspection.spec.ts', 'physics-apex-inspection.spec.ts', 'physics-analysis-workspace.spec.ts',
  'physics-recorded-context.spec.ts', 'physics-recorded-flights.spec.ts'];
function run(args, environment = {}) {
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...environment } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Check exited with status ' + (result.status ?? 1));
}
function browsers(files, label) {
  run(['node_modules/@playwright/test/cli.js', 'test', ...files.map(file => 'tests/e2e/' + file),
    '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + report + '/' + label + '-artifacts'],
    { PLAYWRIGHT_JSON_OUTPUT_FILE: report + '/' + label + '-results.json',
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-semi-space-size=4', '--max-old-space-size=384'].filter(Boolean).join(' ') });
}
async function replace(path, bytes) {
  const observed = fs.readFileSync(path), temp = path + '.velocity-report-' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, bytes);
  try {
    const deadline = Date.now() + 30000;
    while (true) {
      assert(fs.readFileSync(path).equals(observed), 'Preserve a concurrent report edit');
      try { fs.renameSync(temp, path); break; }
      catch (error) {
        if (!['EACCES', 'EPERM', 'EBUSY'].includes(error.code) || Date.now() >= deadline) throw error;
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
(async () => {
  fs.mkdirSync(report, { recursive: true });
  if (!process.argv.includes('--remaining-only')) {
    if (!process.argv.includes('--skip-unit')) run(['node_modules/vitest/vitest.mjs', 'run', 'tests/physics', '--maxWorkers=1', '--pool=forks',
      '--reporter=default', '--reporter=json', '--outputFile=' + report + '/unit-results.json']);
    if (!process.argv.includes('--skip-canvas')) browsers(canvasFiles, 'canvas-regression');
    browsers(['physics-velocity-clarity.spec.ts'], 'velocity');
  }
  // Two older specs write dated captures. Preserve their earlier evidence and
  // archive this run's captures beside the new velocity visuals.
  const historical = [
    { path: 'reports/physics-recorded-flights-2026-10-02', archive: 'recording-regression', prefix: 'recordings-' },
    { path: 'reports/physics-recorded-context-2026-10-02', archive: 'context-regression', prefix: 'context-' }
  ];
  const previous = historical.flatMap(group => fs.readdirSync(group.path)
    .filter(name => name === 'visual-results.json' || (name.startsWith(group.prefix) && name.endsWith('.png')))
    .map(name => ({ ...group, name, bytes: fs.readFileSync(group.path + '/' + name) })));
  try { browsers(remainingFiles, 'browser'); }
  finally {
    for (const item of previous) {
      const path = item.path + '/' + item.name;
      fs.mkdirSync(report + '/' + item.archive, { recursive: true });
      fs.writeFileSync(report + '/' + item.archive + '/' + item.name, fs.readFileSync(path));
      await replace(path, item.bytes);
      assert(fs.readFileSync(path).equals(item.bytes), 'Historical capture was not restored');
    }
  }
  assert(fs.readFileSync(sourcePath).equals(source), 'Source changed during checks');
  assert(fs.readFileSync(mirrorPath).equals(source), 'Desktop copy changed during checks');
  fs.writeFileSync(report + '/check-integrity.json', JSON.stringify({ sourceSha256: digest(source),
    sourceUnchanged: true, mirrorMatches: true, historicalFilesPreserved: previous.length }, null, 2) + '\n');
  console.log('Source and mirror stable; ' + previous.length + ' historical captures preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
