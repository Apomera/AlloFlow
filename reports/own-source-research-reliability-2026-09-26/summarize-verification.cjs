const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const directory = __dirname;
const root = path.resolve(directory, '../..');
const reports = fs.readdirSync(directory).filter(name => name.endsWith('.json')).flatMap(name => {
  const data = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
  return Array.isArray(data.testResults) ? [{ name, data }] : [];
}).sort((a, b) => a.data.startTime - b.data.startTime);
const suites = new Map();
for (const report of reports) {
  for (const suite of report.data.testResults) suites.set(suite.name, { report: report.name, suite });
}
const cases = [...suites.values()].flatMap(({ suite }) => suite.assertionResults || []);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const modules = ['own_sources_module.js', 'stem_lab/stem_lumen_evidence.js', 'quickstart_module.js', 'view_misc_panels_module.js'];
const verification = {
  recordedAt: new Date().toISOString(),
  aggregation: 'Latest complete run per test file; repeated tests counted once.',
  files: suites.size,
  passed: cases.filter(test => test.status === 'passed').length,
  failed: cases.filter(test => test.status === 'failed').length,
  pending: cases.filter(test => !['passed', 'failed'].includes(test.status)).length,
  suiteFailures: [...suites.values()].filter(({ suite }) => suite.status === 'failed').map(({ report, suite }) => ({ report, file: suite.name, message: suite.message })),
  tests: [...suites.values()].map(({ report, suite }) => ({ file: path.relative(root, suite.name), report, status: suite.status, tests: suite.assertionResults.length })),
  mirrors: modules.map(file => {
    const source = hash(file);
    const mirror = hash('desktop/web-app/public/' + file);
    return { file, sha256: source, publicSha256: mirror, matches: source === mirror };
  }),
  sources: ['quickstart_source.jsx', 'view_misc_panels_source.jsx'].map(file => ({ file, sha256: hash(file) })),
  deployment: 'None. Shared host pins and global translations remain with integration01.',
};
fs.writeFileSync(path.join(directory, 'verification-summary.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify({ files: verification.files, passed: verification.passed, failed: verification.failed, pending: verification.pending, mirrorsMatch: verification.mirrors.every(row => row.matches) }));
