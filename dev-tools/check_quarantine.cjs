// Anti-rot guard for tests/QUARANTINE.txt (audit finding H1).
//
// A known-failure allowlist is only safe if it can shrink and cannot silently grow stale. Without
// this, a quarantined test that someone later FIXES stays excluded from the blocking job forever —
// so the thing it protects can regress again, unnoticed, exactly as before.
//
// Two checks, both cheap:
//   1. every listed path still exists (a deleted test must leave the list);
//   2. no listed file PASSES (a fixed test must leave the list, so the blocking job regains it).
//
// Check 2 requires actually running the quarantined files, so it lives in the non-blocking CI job
// next to `npm run test:quarantine`. Run with --paths-only to do check 1 alone (fast, safe for a
// pre-commit hook or the deploy gate).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT, readQuarantine, readQuarantineEntries } = require('./quarantine.cjs');

const pathsOnly = process.argv.includes('--paths-only');
const entries = readQuarantineEntries();
const flaky = new Set(entries.filter((e) => e.flaky).map((e) => e.path));
const quarantined = readQuarantine();

if (!quarantined.length) {
  console.log('check_quarantine: the quarantine list is empty — the blocking job covers the whole suite.');
  process.exit(0);
}

// ── 1. stale paths ──────────────────────────────────────────────────────────
const missing = quarantined.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
if (missing.length) {
  console.error('check_quarantine: FAIL — ' + missing.length + ' quarantined file(s) no longer exist. Remove them from tests/QUARANTINE.txt:');
  for (const m of missing) console.error('  ' + m);
  process.exit(1);
}
console.log('check_quarantine: ' + quarantined.length + ' quarantined file(s), all present.');
if (pathsOnly) process.exit(0);

// ── 2. files that now pass ──────────────────────────────────────────────────
const reporterFile = path.join(ROOT, '.quarantine-status.json');
const res = spawnSync('npx', ['vitest', 'run', '--maxWorkers=2', '--reporter=json', '--outputFile=' + reporterFile, ...quarantined], {
  cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32',
});
if (!fs.existsSync(reporterFile)) {
  console.error('check_quarantine: could not read a run report (vitest exit ' + res.status + ') — treating as inconclusive, not as a pass.');
  process.exit(0);
}

let report;
try { report = JSON.parse(fs.readFileSync(reporterFile, 'utf8')); }
catch (e) { console.error('check_quarantine: unreadable report — inconclusive. ' + e.message); process.exit(0); }
finally { try { fs.unlinkSync(reporterFile); } catch (_) {} }

const rootPrefix = ROOT.replace(/\\/g, '/') + '/';
const nowPassing = (report.testResults || [])
  .filter((f) => f.status === 'passed')
  .map((f) => f.name.replace(/\\/g, '/').replace(rootPrefix, ''))
  // FLAKY entries pass sometimes by definition — that is why they are quarantined. Demanding their
  // removal on a green run would be a chore that can never be completed correctly.
  .filter((rel) => !flaky.has(rel));

if (nowPassing.length) {
  console.error('');
  console.error('check_quarantine: FAIL — ' + nowPassing.length + ' quarantined file(s) now PASS.');
  console.error('Remove them from tests/QUARANTINE.txt so the blocking job protects them again:');
  for (const p of nowPassing) console.error('  ' + p);
  process.exit(1);
}

console.log('check_quarantine: OK — every quarantined file still fails; none is being excluded for no reason.');
