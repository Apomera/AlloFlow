const fs = require('node:fs');
const file = 'reports/document-remediation-rendered-refinements-2026-09-09/summarize.cjs';
let s = fs.readFileSync(file, 'utf8').replaceAll('exports', 'exportResults');
s = s.replace('assert.equal(exportResults.stats.expected + retry.stats.expected, 14);', 'assert.equal(exportResults.stats.expected, 13); assert.equal(exportResults.stats.unexpected, 1); assert.equal(exportResults.stats.skipped, 0); assert.equal(retry.stats.expected, 1);');
fs.writeFileSync(file,s);
