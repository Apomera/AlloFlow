const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const label = process.argv[2] || 'current';
const base = label === 'candidate' ? path.join(__dirname, 'candidate') : label === 'baseline' ? path.join(__dirname, 'before') : root;
const file = name => path.join(base, name);
const out = name => path.join(__dirname, name);
const jobs = [
  { name: 'restore', script: 'restore-audit/restore-ownership.cjs', args: [], env: { RESTORE_HOST: file('AlloFlowANTI.txt'), RESTORE_HANDLER_SOURCE: file('host_handlers_source.jsx'), RESTORE_HANDLER_MODULE: file('host_handlers_module.js'), RESTORE_RESULT: out(`restore-audit/${label}-results.json`) } },
  { name: 'entry', script: 'assignment-audit/entry-workspace-ownership.cjs', args: [file('AlloFlowANTI.txt'), out(`assignment-audit/${label}-entry-results.json`)] },
  { name: 'shelf', script: 'assignment-audit/shelf-workspace-ownership.cjs', args: [file('AlloFlowANTI.txt'), file('host_handlers_source.jsx'), out(`assignment-audit/${label}-shelf-results.json`)] },
  { name: 'host-boundaries', script: 'assignment-audit/host-replacement-boundaries.cjs', args: [file('AlloFlowANTI.txt'), out(`assignment-audit/${label}-host-boundary-results.json`)] },
  { name: 'vault', script: 'vault-audit/ownership-suite.cjs', args: [`combined-${label}`], env: { VAULT_HANDLER_SOURCE: file('host_handlers_source.jsx'), VAULT_HANDLER_MODULE: file('host_handlers_module.js') } },
];
if (fs.existsSync(path.join(__dirname, 'vault-audit/caller-suite.cjs'))) jobs.push({ name: 'vault-callers', script: 'vault-audit/caller-suite.cjs', args: [`combined-${label}`], env: { VAULT_CALLER_SOURCE: file('host_handlers_source.jsx'), VAULT_CALLER_MODULE: file('host_handlers_module.js') } });
jobs.push({ name: 'vault-actions', script: 'vault-audit/action-suite.cjs', args: [`combined-${label}`], env: { VAULT_CALLER_SOURCE: file('host_handlers_source.jsx'), VAULT_CALLER_MODULE: file('host_handlers_module.js') } });
if (label !== 'baseline') jobs.push({ name: 'return-transition', script: 'return-transition.cjs', args: [label] });
const results = [];
for (const job of jobs) {
  console.log(`Starting ${job.name}`);
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.join(__dirname, job.script), ...job.args], { cwd: root, env: { ...process.env, ...job.env }, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  const record = { name: job.name, status: result.status, elapsedMs: Date.now() - started, error: result.error?.message || null, stdout: result.stdout, stderr: result.stderr };
  results.push(record);
  console.log(JSON.stringify(record));
  fs.writeFileSync(out(`${label}-run.json`), JSON.stringify({ label, passed: results.every(r => r.status === 0), completedAt: new Date().toISOString(), results }, null, 2) + '\n');
  if (result.status !== 0 && label !== 'baseline') { process.exitCode = 1; break; }
}
