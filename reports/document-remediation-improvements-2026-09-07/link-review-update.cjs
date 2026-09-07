const fs = require('node:fs');
const path = require('node:path');
const file = path.resolve(__dirname, '../document-remediation-review-2026-09-07/README.md');
const target = path.join(__dirname, 'README.md').replace(/\\/g, '/');
const before = fs.readFileSync(file, 'utf8');
if (!before.includes(target)) {
  const note = '> Implementation update, September 7, 2026: the concrete correctness and reliability fixes have been implemented and validated. See the [implementation report](' + target + ') for changes, final test results, and remaining follow-on work. The review below preserves the original findings and evidence.\n\n';
  if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Concurrent review change');
  fs.writeFileSync(file, note + before);
}
console.log('Historical review links to the implementation results.');
