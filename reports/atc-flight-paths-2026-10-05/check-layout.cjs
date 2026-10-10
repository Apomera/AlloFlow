const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const folder = path.join(__dirname, 'layout-checks', new Date().toISOString().replace(/[^0-9A-Za-z]/g, ''));
fs.mkdirSync(folder, { recursive: true });
const filter = process.argv[2] === 'desktop' ? 'Playing radar, flight controls, and operations have clear responsive geometry at 1440px' : 'Playing radar';
const child = spawnSync(process.execPath, [path.join(root, 'reports/atc-visual-design-2026-10-04/browser-qa.cjs'), filter], {
  cwd: root, stdio: 'inherit', env: { ...process.env, ATC_QA_RESULTS_PATH: path.join(folder, 'browser-qa-results.json'), ATC_QA_ARTIFACT_DIR: folder }
});
if (child.error) throw child.error;
process.exitCode = child.status == null ? 1 : child.status;
console.log('Layout evidence: ' + folder);
