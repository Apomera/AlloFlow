'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const BASELINE = '8d288e8531135d36d0928eb1073d47a02f3290dfa60a779e4191e7ced1423230';
const CURRENT = '141a0381080552bfaa7f18271f5a9abd17993ad4b5123111c5957dc4ea389bf8';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const local = name => fs.readFileSync(path.join(__dirname, name));
const json = name => JSON.parse(local(name));
let checks = 0;
function check(label, passed) { checks++; if (!passed) throw Error(label); }
function outsidePaint(bytes) {
  let text = bytes.toString('utf8');
  const regions = [
    ['// ── Mountains ──', '// A deterministic tree line'],
    ['// ── Clouds ──', '// ── Active-stage emphasis ──'],
  ].map(([startMarker, endMarker]) => {
    const start = text.indexOf(startMarker), end = text.indexOf(endMarker, start);
    check('Unique paint boundaries', start >= 0 && end > start && text.indexOf(startMarker, start + startMarker.length) < 0);
    return { start, end };
  });
  for (const region of regions.reverse()) text = text.slice(0, region.start) + '<PAINT>' + text.slice(region.end);
  return Buffer.from(text);
}
async function main() {
  const source = read('stem_lab/stem_tool_watercycle.js');
  const publicSource = read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
  const baseline = local('baseline-runtime.js');
  check('Current runtime exact', sha(source) === CURRENT);
  check('Public mirror exact', source.equals(publicSource));
  check('Frozen prior runtime exact', sha(baseline) === BASELINE);
  check('All production bytes outside two paint regions retained', outsidePaint(source).equals(outsidePaint(baseline)));

  const tests = json('final-tests-results.json'), loaded = json('final-tests-loaded.json');
  check('Final tests passed', tests.success && tests.numTotalTests === 148 && tests.numPassedTests === 148 && tests.numFailedTests === 0);
  check('Final tests loaded both current runtimes', loaded.loadedRuntimes.length === 2 && loaded.loadedRuntimes.every(item => item.sha256 === CURRENT && item.bytes === source.length));
  check('Final tests loaded frozen baseline', loaded.loadedBaseline.sha256 === BASELINE);
  check('Focused test unchanged after execution', loaded.loadedTest.sha256 === sha(read(loaded.loadedTest.path)));
  const inherited = json('stage-flow-inherited-failures.json');
  check('Updated stage relationship test unchanged', sha(read('tests/watercycle_stage_flow.test.js')) === 'fab6a6b88b96a2a5f1858a78e740b49b34728363bf025d39c75192761bdd152d');
  check('Inherited failure evidence retained', !!inherited);

  for (const [prefix, expected, count] of [['baseline-validated', BASELINE, 59], ['browser', CURRENT, 79]]) {
    const report = json(prefix + '-results.json');
    check(prefix + ' actual loaded runtime exact', report.sourceSha256 === expected && report.loadedRuntimeSha256 === expected && sha(local(prefix + '-tested-runtime.js')) === expected);
    check(prefix + ' browser completed all checks', report.completed && report.successful && report.checks.length === count && report.checks.every(item => item.passed) && report.errors.length === 0 && report.consoleErrors.length === 0);
    check(prefix + ' browser closed', report.browserClosed && report.resourcesClosed);
    check(prefix + ' exact tested QA harness', sha(local(prefix + '-tested-harness.cjs')) === report.harnessSha256 && sha(read('dev-tools/watercycle_illustrated_landscape_qa.cjs')) === report.harnessSha256);
    check(prefix + ' expected captures', report.captures.length === 8);
    for (const capture of report.captures) {
      check(prefix + ' capture hash ' + capture.path, sha(local(capture.path)) === capture.sha256 && capture.sourceSha256 === expected);
    }
    if (prefix === 'browser') check('Actual native playback exercised', report.nativeActions.length === 1 && report.nativeActions[0].changedFields.length === 0);
  }
  if (process.argv.includes('--preview')) {
    const response = await fetch('http://127.0.0.1:8770/stem_lab/stem_tool_watercycle.js', { signal: AbortSignal.timeout(10000) });
    const served = Buffer.from(await response.arrayBuffer());
    check('Preview serves exact current runtime', response.ok && sha(served) === CURRENT);
  }
  console.log(JSON.stringify({ successful: true, checks, sourceSha256: CURRENT, tests: 148, browserChecks: 79, finalCaptures: 8, readOnly: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
