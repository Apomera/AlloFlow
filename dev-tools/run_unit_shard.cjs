// Blocking unit-test runner: the whole Vitest suite MINUS tests/QUARANTINE.txt (audit finding H1).
//
// Any argument passed through lands on the vitest command line, so CI keeps using
//   npm run test:ci:shard -- --shard=3/8
// unchanged. The only difference is that quarantined files are excluded, so this job is green on a
// clean tree and a NEW failure is therefore visible as a new failure.
//
// Quarantined files still run — in the separate, non-blocking `quarantine` job (npm run
// test:quarantine), so their status stays public rather than being swept away.
const { spawnSync } = require('child_process');
const { ROOT, readQuarantine } = require('./quarantine.cjs');

const quarantined = readQuarantine();
const passthrough = process.argv.slice(2);

const args = ['vitest', 'run', '--maxWorkers=2'];
for (const file of quarantined) args.push('--exclude', file);
args.push(...passthrough);

if (quarantined.length) {
  console.log('[unit] excluding ' + quarantined.length + ' quarantined file(s) — see tests/QUARANTINE.txt');
}

const res = spawnSync('npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(res.status === null ? 1 : res.status);
