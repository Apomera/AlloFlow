const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const testReports = ['material-rendering-tests.json', 'print-bridge-tests.json', 'studio-art-final-tests.json'];
const suites = new Map();
for (const report of testReports) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, report), 'utf8'));
  for (const suite of data.testResults) suites.set(path.basename(suite.name), { suite, report });
}
const testsByFile = {}, evidenceByFile = {};
for (const [name, { suite, report }] of suites) {
  if (suite.status !== 'passed' || suite.assertionResults.some(test => test.status !== 'passed')) throw Error('Unresolved test failure: ' + name);
  testsByFile[name] = suite.assertionResults.length; evidenceByFile[name] = report;
}
const sourceSHA256 = {};
for (const name of ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js']) {
  const source = fs.readFileSync(path.join(root, 'stem_lab', name));
  const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab', name));
  if (!source.equals(mirror)) throw Error('Desktop mirror differs: ' + name);
  new Function(source.toString('utf8'));
  sourceSHA256[name] = crypto.createHash('sha256').update(source).digest('hex');
}
const landscape = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrated-landscape-art-direction-verification.json'), 'utf8'));
if (!landscape.pass || !landscape.integratedQualityCheck.pass || !landscape.mirrorByteIdentical) throw Error('Integrated landscape verification failed');
if (landscape.sourceSHA256 !== sourceSHA256['stem_tool_geometryworld.js']) throw Error('Landscape evidence predates the current core source');
const browserEvidence = {};
for (const report of ['after-results.json', 'baseline-stl-results.json', 'studio-art-final-results.json']) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, report), 'utf8'));
  if (!(data.pass === true || data.passed === true) || (data.errors || []).length || (data.consoleErrors || []).length) throw Error('Browser verification failed: ' + report);
  browserEvidence[report] = 'passed';
}
const result = { verifiedAt: new Date().toISOString(), passedTests: Object.values(testsByFile).reduce((a, b) => a + b, 0), testsByFile, evidenceByFile,
  browserEvidence, syntax: 'passed', desktopMirrors: 'byte-identical', sourceSHA256,
  landscape: { pass: true, qualityTransitions: landscape.integratedQualityCheck, evidence: 'integrated-landscape-art-direction-verification.json' } };
fs.writeFileSync(path.join(__dirname, 'art-direction-summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
