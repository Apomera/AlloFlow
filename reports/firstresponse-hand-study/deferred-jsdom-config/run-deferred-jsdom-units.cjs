const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const privateDirectory = __dirname;
const sourceFiles = ['stem_lab/stem_tool_firstresponse.js', 'desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'];
const originalEnvironmentChunk = 'node_modules/vitest/dist/chunks/index.DC7d2Pf8.js';
const cliChunk = 'node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js';
const packageFiles = ['package.json', 'package-lock.json'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex');
const handStudyExpected = Number(process.env.FIRSTRESPONSE_HAND_STUDY_EXPECTED || 46);
if (!Number.isInteger(handStudyExpected) || handStudyExpected < 1) throw new Error('Invalid FIRSTRESPONSE_HAND_STUDY_EXPECTED');
const jobs = [{ id: 'hand-study', file: 'tests/firstresponse_hand_study.test.js', count: handStudyExpected }];
jobs.push({ id: 'patient-finish-static', file: 'tests/firstresponse_patient_finish.test.js', pattern: 'reverses the documented hand-study UI delta', count: 1 });
for (const age of ['adult', 'child', 'infant']) jobs.push({ id: 'patient-finish-' + age, file: 'tests/firstresponse_patient_finish.test.js', pattern: 'First Response patient skin finish ' + age + ' ', count: 7 });
for (const age of ['adult', 'child', 'infant']) {
  jobs.push({ id: 'support-preservation-' + age, file: 'tests/firstresponse_supporting_hand.test.js', pattern: 'preserves every.*' + age + '.*scene', count: 18 });
  jobs.push({ id: 'support-framing-' + age, file: 'tests/firstresponse_supporting_hand.test.js', pattern: 'frames the complete.*' + age + '.*supporting hand', count: 12 });
}
jobs.push({ id: 'support-lifecycle', file: 'tests/firstresponse_supporting_hand.test.js', pattern: 'supporting hand lifecycle and camera compatibility', count: 8 });
jobs.push({ id: 'support-observation', file: 'tests/firstresponse_supporting_hand.test.js', pattern: 'supporting hand visual observation and pose comparison', count: 11 });
for (const age of ['adult', 'child', 'infant']) jobs.push({ id: 'palm-framing-' + age, file: 'tests/firstresponse_palm_detail.test.js', pattern: 'shows the complete ' + age + ' palm', count: 14 });
jobs.push({ id: 'palm-controls', file: 'tests/firstresponse_palm_detail.test.js', pattern: '^(?!.*shows the complete)', count: 17 });
const fullFileJobs = [
  jobs[0],
  { id: 'patient-finish', file: 'tests/firstresponse_patient_finish.test.js', count: 22 },
  { id: 'supporting-hand', file: 'tests/firstresponse_supporting_hand.test.js', count: 109 },
  { id: 'palm-detail', file: 'tests/firstresponse_palm_detail.test.js', count: 59 },
];

const requestedMode = process.argv[2] || '--plan';
const selection = process.argv[3] || 'hand-study';
const pool = process.argv[4] || 'forks';
const startup = process.argv[5] || 'plain';
const runId = process.argv[6] || new Date().toISOString().replace(/[:.]/g, '-');
if (!['--plan', '--run'].includes(requestedMode)) throw new Error('Expected --plan or --run');
if (!['forks', 'threads'].includes(pool)) throw new Error('Expected forks or threads');
if (!['plain', 'extended'].includes(startup)) throw new Error('Expected plain or extended startup');
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Use a simple run id');
const selectedJobs = selection === 'all' ? fullFileJobs
  : selection === 'all-shards' ? jobs
  : [...fullFileJobs, ...jobs.slice(1)].filter(job => job.id === selection);
if (!selectedJobs.length) throw new Error('Unknown shard: ' + selection);
const out = path.join(privateDirectory, 'deferred-jsdom-unit-evidence', runId);
const plan = {
  config: path.join(privateDirectory, 'vitest-deferred-jsdom.config.mjs'),
  setup: path.join(privateDirectory, 'setup-deferred-jsdom.mjs'),
  pool, startup, configLoader: 'native', out, selectedJobs,
  expected: selectedJobs.reduce((total, job) => total + job.count, 0),
  testTimeout: 240000, hookTimeout: 120000, retry: 0, maxWorkers: 1,
  unchanged: ['assertions', 'fixtures', 'repository config', 'installed jsdom', 'installed Vitest', 'dependency files'],
};
if (requestedMode === '--plan') {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

const snapshotFiles = [...sourceFiles, originalEnvironmentChunk, cliChunk, ...packageFiles,
  'vitest.config.js', 'tests/setup.js', 'tests/helpers/firstresponse_hand_study_delta.cjs',
  'tests/helpers/firstresponse_hand_study_delta.json',
  ...new Set(jobs.map(job => job.file))].filter(file => fs.existsSync(path.join(repo, file)));
const baseline = Object.fromEntries(snapshotFiles.map(file => [file, hash(file)]));
const privateBaseline = Object.fromEntries([
  'vitest-deferred-jsdom.config.mjs', 'setup-deferred-jsdom.mjs', 'run-deferred-jsdom-units.cjs',
  ...(startup === 'extended' ? ['startup-hook.mjs', 'startup-baseline.json'] : []),
].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(privateDirectory, file))).digest('hex')]));
if (baseline[sourceFiles[0]] !== baseline[sourceFiles[1]]) throw new Error('Production and desktop source mirrors differ');
for (const job of selectedJobs) {
  const content = fs.readFileSync(path.join(repo, job.file), 'utf8');
  if (/@(?:vitest|jest)-environment\b/.test(content)) throw new Error('A test-file environment pragma would bypass deferred jsdom: ' + job.file);
}
function guard() {
  for (const [file, expectedHash] of Object.entries(baseline)) if (hash(file) !== expectedHash) throw new Error('File changed during validation: ' + file);
  for (const [file, expectedHash] of Object.entries(privateBaseline)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(privateDirectory, file))).digest('hex');
    if (actual !== expectedHash) throw new Error('Private validation file changed: ' + file);
  }
}
const completed = [];
const distinct = new Set();
async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'baseline.json'), JSON.stringify({ ...plan, baseline, privateBaseline, startedAt: new Date().toISOString() }, null, 2));
  for (const job of selectedJobs) {
    guard();
    const report = path.join(out, job.id + '.json');
    const log = path.join(out, job.id + '.log');
    const environmentLog = path.join(out, job.id + '-environment.jsonl');
    for (const file of [report, log, environmentLog]) if (fs.existsSync(file)) throw new Error('Refusing to overwrite evidence: ' + file);
    const args = [];
    if (startup === 'extended') args.push('--import=' + pathToFileURL(path.join(privateDirectory, 'startup-hook.mjs')).href);
    args.push(path.join(repo, 'node_modules/vitest/vitest.mjs'), 'run', job.file,
      '--config=' + plan.config, '--configLoader=native', '--pool=' + pool, '--experimental.viteModuleRunner=false',
      '--maxWorkers=1', '--isolate=false', '--retry=0', '--testTimeout=240000', '--hookTimeout=120000',
      '--reporter=default', '--reporter=json', '--outputFile=' + report);
    if (job.pattern) args.push('--testNamePattern', job.pattern);
    const startedAt = Date.now();
    console.log('START ' + job.id + ' expected=' + job.count + ' source=' + baseline[sourceFiles[0]]);
    const stream = fs.createWriteStream(log);
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, {
        cwd: repo,
        env: { ...process.env, FIRSTRESPONSE_DEFERRED_JSDOM_LOG: environmentLog },
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      child.stdout.pipe(stream, { end: false });
      child.stderr.pipe(stream, { end: false });
      child.on('error', reject);
      child.on('close', resolve);
    }).finally(() => stream.end());
    guard();
    if (!fs.existsSync(report)) throw new Error('Missing report: ' + job.id + '; exit=' + exitCode);
    const result = JSON.parse(fs.readFileSync(report, 'utf8'));
    const assertions = result.testResults.flatMap(file => file.assertionResults || []);
    const passed = assertions.filter(assertion => assertion.status === 'passed');
    if (exitCode !== 0 || result.numFailedTests || result.numFailedTestSuites || passed.length !== job.count) {
      console.log(fs.readFileSync(log, 'utf8').slice(-22000));
      throw new Error(job.id + ': expected ' + job.count + ' passed; got ' + passed.length + '; exit=' + exitCode);
    }
    const environmentEvents = fs.readFileSync(environmentLog, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
    if (environmentEvents.filter(event => event.event === 'setup-finish').length !== 1
        || environmentEvents.filter(event => event.event === 'teardown').length !== 1) {
      throw new Error('Missing or duplicate jsdom setup/cleanup evidence: ' + job.id);
    }
    for (const assertion of passed) {
      const key = job.file + '::' + assertion.fullName;
      if (distinct.has(key)) throw new Error('Duplicate check: ' + key);
      distinct.add(key);
    }
    completed.push({ ...job, passed: passed.length, elapsedMs: Date.now() - startedAt, exitCode });
    console.log('PASS ' + job.id + ' ' + passed.length);
  }
  guard();
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ sourceSHA256: baseline[sourceFiles[0]], passed: distinct.size, completed, baselineUnchanged: true }, null, 2));
  console.log('ALL ' + distinct.size + ' DISTINCT CHECKS PASSED IN ' + completed.length + ' SERIAL PROCESSES');
}
main().catch(error => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'incomplete-summary.json'), JSON.stringify({ error: error.message, completed, sourceSHA256: baseline[sourceFiles[0]] }, null, 2));
  console.error(error);
  process.exitCode = 1;
});
