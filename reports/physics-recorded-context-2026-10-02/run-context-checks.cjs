// Run from the repository root. Checks use one worker and run sequentially.
const cp = require('child_process'), fs = require('fs'), crypto = require('crypto'), assert = require('assert/strict');
const report = 'reports/physics-recorded-context-2026-10-02';
assert(fs.readFileSync('stem_lab/stem_tool_physics.js').equals(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js')));
const browserFiles = ['72-physics-lab-behaviour.spec.ts', 'physics-flight-integrity.spec.ts',
  'physics-model-comparison.spec.ts', 'physics-flight-history.spec.ts', 'physics-analysis-workspace.spec.ts',
  'physics-apex-inspection.spec.ts', 'physics-energy-visuals.spec.ts', 'physics-force-clarity.spec.ts',
  'physics-investigation-evidence.spec.ts', 'physics-graph-landmarks.spec.ts', 'physics-sample-inspection.spec.ts',
  'physics-recorded-flights.spec.ts', 'physics-recorded-context.spec.ts'];
function run(args, environment = {}) {
  const result = cp.spawnSync(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...environment } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Check exited with status ' + (result.status || 1));
}
async function replace(file, bytes) {
  const observed = fs.readFileSync(file), temporary = file + '.context-report-' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temporary, bytes);
  try {
    const deadline = Date.now() + 30000;
    while (true) {
      assert(fs.readFileSync(file).equals(observed), 'Preserve a concurrent report change');
      try { fs.renameSync(temporary, file); break; }
      catch (error) {
        if (!['EACCES', 'EPERM', 'EBUSY'].includes(error.code) || Date.now() >= deadline) throw error;
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    }
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
(async () => {
  run(['node_modules/vitest/vitest.mjs', 'run', 'tests/physics', '--maxWorkers=1', '--pool=forks',
    '--reporter=default', '--reporter=json', '--outputFile=' + report + '/unit-results.json']);
  // A legacy case writes into its original dated report. Preserve those earlier captures.
  const olderReport = 'reports/physics-recorded-flights-2026-10-02';
  const names = ['visual-results.json'];
  for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) names.push('recordings-' + theme + '-' + width + '.png');
  const previous = names.map(name => ({ name, bytes: fs.readFileSync(olderReport + '/' + name) }));
  try {
    run(['node_modules/@playwright/test/cli.js', 'test', ...browserFiles.map(file => 'tests/e2e/' + file),
      '--workers=1', '--retries=0', '--reporter=list,json', '--output=' + report + '/browser-artifacts'],
      { PLAYWRIGHT_JSON_OUTPUT_FILE: report + '/browser-results.json' });
  } finally {
    fs.mkdirSync(report + '/recording-regression', { recursive: true });
    for (const item of previous) {
      const file = olderReport + '/' + item.name;
      fs.writeFileSync(report + '/recording-regression/' + item.name, fs.readFileSync(file));
      await replace(file, item.bytes);
    }
  }
  run([report + '/verify-context.cjs']);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
