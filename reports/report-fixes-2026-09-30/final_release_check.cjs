'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const target = path.join(__dirname, 'reader-release-check.json');
if (fs.existsSync(target) && !fs.existsSync(path.join(__dirname, 'reader-release-check-before-focus.json'))) fs.copyFileSync(target, path.join(__dirname, 'reader-release-check-before-focus.json'));
const result = spawnSync(process.execPath, ['dev-tools/check_reader_release.cjs', '--json'], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
try {
  const report = JSON.parse(result.stdout);
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ exitCode: result.status, report }));
} catch (error) {
  fs.writeFileSync(path.join(__dirname, 'reader-release-check-executor-error.json'), JSON.stringify({ at: new Date().toISOString(), exitCode: result.status, error: error.message, processError: result.error?.message, stderr: result.stderr }, null, 2) + '\n');
  process.exitCode = 1;
}
