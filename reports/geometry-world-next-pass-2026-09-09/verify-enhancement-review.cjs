const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const testReports = [
  'integration-regression-tests.json',
  'visual-state-lifecycle-tests.json',
  'builder-flow-fix-tests.json',
  'ground-edge-tests-final.json'
];
const tests = new Map();
for (const report of testReports) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, report), 'utf8'));
  if (!data.success || data.numFailedTests || data.numFailedTestSuites || data.wasInterrupted) {
    throw new Error('Unresolved test run: ' + report);
  }
  for (const suite of data.testResults) {
    if (suite.status !== 'passed' || suite.assertionResults.some(test => test.status !== 'passed')) {
      throw new Error('Incomplete suite: ' + suite.name);
    }
    tests.set(path.basename(suite.name), { count: suite.assertionResults.length, evidence: report });
  }
}
const sourceSHA256 = {};
for (const file of ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js']) {
  const source = fs.readFileSync(path.join(root, 'stem_lab', file));
  const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab', file));
  if (!source.equals(mirror)) throw new Error('Desktop mirror differs: ' + file);
  new Function(source.toString('utf8'));
  sourceSHA256[file] = crypto.createHash('sha256').update(source).digest('hex');
}
const browser = JSON.parse(fs.readFileSync(path.join(__dirname, 'saver-ground-edge-results.json'), 'utf8'));
if (!browser.passed || browser.errors.length || browser.consoleErrors.length) throw new Error('Browser check failed');
const draw = browser.checks.drawComparison;
if (draw.withEdges.triangles !== draw.withoutEdges.triangles || draw.savedDraws <= 0) throw new Error('Invalid draw comparison');
const previousSTL = 'fcec4a5158452565fde809e983647bb251a48c40dcb2ef5365f7594dfdab7398';
if (browser.checks.invariant.stlHash !== previousSTL) throw new Error('Pavilion STL changed from the prior art pass');
const result = {
  verifiedAt: new Date().toISOString(),
  passedTests: [...tests.values()].reduce((total, suite) => total + suite.count, 0),
  testsByFile: Object.fromEntries(tests),
  syntax: 'passed',
  desktopMirrors: 'byte-identical',
  sourceSHA256,
  browser: {
    passed: true,
    evidence: 'saver-ground-edge-results.json',
    drawsBefore: draw.withEdges.draws,
    drawsAfter: draw.withoutEdges.draws,
    savedDraws: draw.savedDraws,
    savedPercent: Math.round(draw.savedDraws / draw.withEdges.draws * 1000) / 10,
    trianglesUnchanged: draw.withEdges.triangles,
    unchangedSTL: browser.checks.invariant.stlHash,
    preview: 'saver-floor-edges-off.png',
    limitation: 'Controlled draw-call comparison in one view; not an FPS benchmark.'
  }
};
fs.writeFileSync(path.join(__dirname, 'enhancement-review-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
