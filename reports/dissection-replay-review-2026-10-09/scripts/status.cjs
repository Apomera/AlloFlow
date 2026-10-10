const fs = require('node:fs'), path = require('node:path');
const report = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-replay-review-2026-10-09';
const rows = [];
for (const entry of fs.readdirSync(report, { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^(unit|browser)-/.test(entry.name)) continue;
  const dir = path.join(report, entry.name);
  const read = file => fs.existsSync(path.join(dir, file)) ? JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) : null;
  const run = read('run.json'), result = read('results.json');
  rows.push({ label: entry.name, exit: run && run.exitCode, stable: run && run.inputHashesStable, stats: result && (result.stats || { pass: result.numPassedTests, fail: result.numFailedTests, excluded: result.numPendingTests }) });
}
console.log(JSON.stringify(rows, null, 2));
