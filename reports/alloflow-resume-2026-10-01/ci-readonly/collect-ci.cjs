const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const runId = process.argv[2] || '36811362905';
const root = __dirname;
function gh(args) {
  const result = cp.spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 160 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(`gh exited ${result.status}: ${(result.stderr || '').slice(0, 300)}`);
  return result.stdout;
}
const run = JSON.parse(gh(['run', 'view', runId, '--json', 'headSha,conclusion,jobs,url']));
const report = { runId, sha: run.headSha, conclusion: run.conclusion, url: run.url, fetchedAt: new Date().toISOString(), currentHead: cp.spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim(), jobs: [] };
for (const job of run.jobs.filter(value => value.conclusion === 'failure')) {
  const text = gh(['run', 'view', runId, '--job', String(job.databaseId), '--log-failed']).replace(/(?:\x1b|\^\[)\[[0-9;]*m/g, '');
  const steps = job.steps.filter(step => step.conclusion === 'failure');
  const start = Math.min(...steps.map(step => Date.parse(step.startedAt)));
  const end = Math.max(...steps.map(step => Date.parse(step.completedAt)));
  const lines = text.split(/\r?\n/).map(line => {
    const match = line.match(/\t(?:UNKNOWN STEP|[^\t]*)\t(?:([\d-]+T[\d:.]+Z) )?(.*)$/);
    return match ? { time: match[1] ? Date.parse(match[1]) : null, value: match[2] } : { time: null, value: line };
  }).map(line => line.value);
  const failures = [...new Set(lines.filter(line => /^\s*FAIL\s+tests[\\/]/.test(line)).map(line => line.slice(0, 650)))];
  const totals = [...new Set(lines.filter(line => /^\s*(?:Test Files|Tests|Duration)\s+/.test(line)))];
  const diagnostics = [...new Set(lines.filter(line => /##\[error\]|^\s*(?:Error:|AssertionError:|ReferenceError:|TypeError:)|(?:missing|drift|outdated|mismatch|not registered|unresolved|violations)/i.test(line) && !/^\s*[+-]/.test(line)).map(line => line.slice(0, 450)))].slice(-50);
  const tail = lines.filter(line => line.trim() && !/^\s*[+-]/.test(line) && !/Post job|\[command\]|git config|orphan process|Adding repository|Temporarily overriding|Cleaning up|actions\//.test(line)).slice(-15).map(line => line.slice(0, 450));
  report.jobs.push({ id: job.databaseId, name: job.name, failedSteps: steps.map(step => step.name), failures, totals, diagnostics, tail });
  fs.writeFileSync(path.join(root, `run-${runId}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ job: job.name, failures: failures.length, totals }));
}
console.log(`Saved sanitized CI evidence for ${report.jobs.length} failed jobs; CI SHA ${report.sha}; local SHA ${report.currentHead}.`);
