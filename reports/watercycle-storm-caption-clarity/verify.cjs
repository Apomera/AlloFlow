'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const CURRENT = '4bb912b9f1d00c1b54be26d29197f0c1bd9c1277161664d21842532f973f4bf3';
const BASELINE = '141a0381080552bfaa7f18271f5a9abd17993ad4b5123111c5957dc4ea389bf8';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const local = name => fs.readFileSync(path.join(__dirname, name));
const json = name => JSON.parse(local(name));
let count = 0;
function check(label, passed) { count++; if (!passed) throw Error(label); }
function verify() {
  const source = read('stem_lab/stem_tool_watercycle.js'), baseline = local('baseline-runtime.js');
  check('Current runtime exact', sha(source) === CURRENT);
  check('Public mirror exact', source.equals(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')));
  check('Frozen prior runtime exact', sha(baseline) === BASELINE);
  const changes = json('paint-changes.json');
  check('Presentation manifest exact', changes.baselineSha256 === BASELINE && changes.candidateSha256 === CURRENT && changes.changes.length === 8);
  let restored = source.toString('utf8');
  for (const change of changes.changes) {
    const at = restored.indexOf(change.replacement);
    check('Unique presentation slice: ' + change.name, at >= 0 && restored.indexOf(change.replacement, at + change.replacement.length) < 0);
    restored = restored.slice(0, at) + change.original + restored.slice(at + change.replacement.length);
  }
  check('All bytes outside eight presentation slices retained', Buffer.from(restored).equals(baseline));
  const focus = json('focused-initial-results.json'), regression = json('regression-results.json'), loaded = json('focused-initial-loaded.json');
  check('Focused tests pass', focus.success && focus.numTotalTests === 36 && focus.numPassedTests === 36 && focus.numFailedTests === 0);
  check('Weather regressions pass', regression.success && regression.numTotalTests === 45 && regression.numPassedTests === 45 && regression.numFailedTests === 0);
  check('Focused tests loaded both exact runtimes', loaded.loadedRuntimes.length === 2 && loaded.loadedRuntimes.every(item => item.sha256 === CURRENT && item.bytes === source.length));
  check('Loaded test and manifest unchanged', sha(read(loaded.loadedTest.path)) === loaded.loadedTest.sha256 && sha(read(loaded.loadedPaintManifest.path)) === loaded.loadedPaintManifest.sha256);
  for (const [prefix, expected, expectedChecks] of [['baseline-initial', BASELINE, 94], ['browser-initial', CURRENT, 335]]) {
    const report = json(prefix + '-results.json');
    check(prefix + ' exact tested runtime', report.sourceSha256 === expected && sha(local(prefix + '-tested-runtime.js')) === expected);
    check(prefix + ' exact tested QA script', sha(local(prefix + '-tested-harness.cjs')) === report.harnessSha256 && sha(read('dev-tools/watercycle_storm_caption_clarity_qa.cjs')) === report.harnessSha256);
    check(prefix + ' browser complete and successful', report.completed && report.successful && report.checks.length === expectedChecks && report.checks.every(item => item.passed) && report.errors.length === 0 && report.consoleErrors.length === 0);
    check(prefix + ' resources closed', report.browserClosed && report.resourcesClosed);
    check(prefix + ' native wind control exercised', report.nativeActions.length === 1);
    check(prefix + ' expected captures', report.captures.length === 16);
    for (const capture of report.captures) check(prefix + ' capture exact: ' + capture.path, sha(local(capture.path)) === capture.sha256 && capture.sourceSha256 === expected);
  }
  if (process.argv.includes('--preview')) {
    const preview = json('preview-live-results.json');
    check('Actual local preview verified', preview.completed && preview.successful && preview.sourceSha256 === CURRENT && preview.servedSha256 === CURRENT && preview.loadedSha256 === CURRENT && preview.browserClosed && preview.resourcesClosed && preview.checks.every(item => item.passed));
    check('Actual preview capture exact', sha(local(preview.capture.path)) === preview.capture.sha256 && preview.capture.sourceSha256 === CURRENT);
  }
  console.log(JSON.stringify({ successful: true, checks: count, sourceSha256: CURRENT, tests: 81, browserChecks: 335, finalCaptures: 16, readOnly: true }));
}
try { verify(); } catch (error) { console.error(error.message); process.exitCode = 1; }
