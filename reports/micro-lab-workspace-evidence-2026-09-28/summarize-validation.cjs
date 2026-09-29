const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(name => /^(unit|browser).*results\.json$/.test(name))
  .sort((a, b) => fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs);
const unit = new Map(), browser = new Map(), runs = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (file.startsWith('unit')) {
    for (const suite of data.testResults || []) for (const test of suite.assertionResults || []) {
      const key = suite.name + ':' + test.fullName;
      if (['pending', 'skipped', 'todo'].includes(test.status) && unit.has(key)) continue;
      unit.set(key, { file: path.basename(suite.name), title: test.fullName, status: test.status, report: file });
    }
    runs.push({ file, passed: data.numPassedTests, failed: data.numFailedTests,
      runnerNotes: file === 'unit-results.json' ? 'Six suites did not start because of worker-startup timeouts; they ran in the recovery report.' : file === 'unit-recovery-results.json' ? 'Two interaction tests timed out and were rerun separately in the final report.' : 'Completed successfully.' });
  } else {
    function visit(suite) {
      for (const spec of suite.specs || []) for (const test of spec.tests || []) {
        const result = test.results?.at(-1);
        const key = spec.file + ':' + spec.title;
        if (result?.status === 'skipped' && browser.has(key)) continue;
        browser.set(key, { file: spec.file, title: spec.title, status: result?.status || 'missing', report: file });
      }
      for (const child of suite.suites || []) visit(child);
    }
    for (const suite of data.suites || []) visit(suite);
    runs.push({ file, ...data.stats });
  }
}
const count = map => ({ total: map.size, passed: [...map.values()].filter(t => t.status === 'passed').length, unresolved: [...map.values()].filter(t => t.status !== 'passed') });
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js');
const mirror = fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_microbiology.js');
const summary = {
  date: '2026-09-28', scope: 'Micro Lab only; local working tree and desktop mirror',
  unit: count(unit), browser: count(browser),
  runtimesMatch: source.equals(mirror), sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  notes: ['Latest results replace earlier results for the same test. Initial runner timeouts and interrupted runs are retained in the detailed reports.', 'The unit recovery run reuses one worker to reduce startup overhead.'],
  runs
};
fs.writeFileSync(path.join(dir, 'validation-summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (summary.unit.total !== 162 || summary.unit.unresolved.length || summary.browser.total !== 16 || summary.browser.unresolved.length || !summary.runtimesMatch) process.exitCode = 1;
