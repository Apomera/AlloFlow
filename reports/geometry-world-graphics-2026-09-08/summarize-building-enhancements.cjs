const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const hashes = {};
for (const name of ['stem_tool_geometryworld.js', 'stem_tool_geometryworld_builder.js', 'stem_tool_printlab.js']) {
  const source = fs.readFileSync(path.join(root, 'stem_lab', name));
  const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/stem_lab', name));
  if (!source.equals(mirror)) throw new Error(name + ': desktop mirror differs');
  new Function(source.toString('utf8'));
  hashes[name] = crypto.createHash('sha256').update(source).digest('hex');
}
const tests = new Map();
const reports = ['placement-transaction-tests.json', 'building-controls-tests.json', 'touch-pointer-lock-tests.json', 'showcase-views-tests.json', 'studio-floor-tests.json'];
const files = new Map();
for (const name of reports) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));
  if (!data.success || data.numFailedTests) throw new Error(name + ': unsuccessful test report');
  for (const result of data.testResults) {
    const occurrences = new Map();
    for (const test of result.assertionResults) {
      if (test.status !== 'passed') throw new Error(test.fullName + ': ' + test.status);
      const ordinal = (occurrences.get(test.fullName) || 0) + 1;
      occurrences.set(test.fullName, ordinal);
      const key = result.name + '|' + test.fullName + '|' + ordinal;
      if (!tests.has(key)) files.set(path.basename(result.name), (files.get(path.basename(result.name)) || 0) + 1);
      tests.set(key, test.status);
    }
  }
}
const summary = {verifiedAt:new Date().toISOString(), syntax:'passed', desktopMirrors:'byte-identical', sourceSHA256:hashes,
  testReports:reports, distinctPassedTests:tests.size, testsByFile:Object.fromEntries(files)};
fs.writeFileSync(path.join(__dirname, 'building-enhancement-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
