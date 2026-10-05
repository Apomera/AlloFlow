'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), label = process.argv[2] || 'candidate';
assert.ok(['candidate', 'final'].includes(label));
const base = label === 'candidate' ? path.join(__dirname, 'candidate') : root;
const output = file => path.join(__dirname, file), input = file => path.join(base, file);
const jobs = [
  { name: 'controller', script: 'audit-controller/reproduce.cjs', args: [`${label}-main71.json`, input('allo_device_vault_module.js'), input('AlloFlowANTI.txt')], report: `audit-controller/${label}-main71.json`, count: 71 },
  { name: 'clear-ownership', script: 'audit-controller/clear-ownership.cjs', args: [`${label}-clear27.json`, input('allo_device_vault_module.js')], report: `audit-controller/${label}-clear27.json`, count: 27 },
  { name: 'saved-head', script: 'audit-controller/stale-head.cjs', args: [`${label}-head18.json`, input('allo_device_vault_module.js')], report: `audit-controller/${label}-head18.json`, count: 18 },
  { name: 'backup', script: 'audit-boot/export-backup.node.cjs', args: [], env: { BACKUP_HANDLER_SOURCE: input('host_handlers_source.jsx'), BACKUP_HANDLER_RUNTIME: input('host_handlers_module.js'), BACKUP_RESULT: output(`audit-boot/${label}-backup24.json`) }, report: `audit-boot/${label}-backup24.json`, count: 24 },
  { name: 'boot', script: 'audit-boot/boot-retirement.node.cjs', args: [], env: { BOOT_HOST: input('AlloFlowANTI.txt'), BOOT_RESULT: output(`audit-boot/${label}-boot18.json`) }, report: `audit-boot/${label}-boot18.json`, count: 18 }
];
const records = [];
assert.ok(!fs.existsSync(output(`${label}-focused.json`)), 'Preserve earlier run');
for (const job of jobs) {
  assert.ok(!fs.existsSync(output(job.report)), 'Preserve ' + job.report);
  const result = cp.spawnSync(process.execPath, [output(job.script), ...job.args], { cwd: root, env: { ...process.env, ...job.env }, encoding: 'utf8', timeout: 120000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const report = fs.existsSync(output(job.report)) ? JSON.parse(fs.readFileSync(output(job.report))) : null;
  const passed = result.status === 0 && report?.failed === 0 && report?.passed === job.count;
  const record = { name: job.name, passed, checks: report?.passed, failed: report?.failed, report: job.report, exitCode: result.status, processError: result.error?.message || null, stdout: result.stdout, stderr: result.stderr };
  records.push(record); console.log(JSON.stringify(record));
  fs.writeFileSync(output(`${label}-focused.json`), JSON.stringify({ label, completedAt: new Date().toISOString(), passed: records.every(x => x.passed), checks: records.reduce((n, x) => n + (x.checks || 0), 0), records }, null, 2) + '\n');
  if (!passed) { process.exitCode = 1; break; }
}
