// Focused behavioral diagnostic: exit 0 = selected import-graph tests pass,
// exit 1 = test failure, exit 2 = no complete verdict (cap, no tests, fallback).
// Publishing requires independent exact-candidate CI and signed artifact proof.
'use strict';

const { spawnSync } = require('child_process');
const { ROOT, readQuarantine } = require('./quarantine.cjs');
const fallback = require('./changed_tests_fallback.cjs');

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const baseArg = args.find((a) => a.startsWith('--base='));

function git(argv) {
  const res = spawnSync('git', argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) throw new Error('Unable to determine test scope: git ' + argv.join(' ') + '\n' + String(res.stderr || res.error || 'Git failed'));
  return String(res.stdout || '').trim();
}

// Pick what "changed" means. Pre-commit (deploy.sh's gate phase) the work is
// staged, so the uncommitted tracked files are right, staged included.
// Post-commit, or on a clean tree, fall back to what the last commit touched so
// the gate is still meaningful when run by hand after a deploy.
function resolveBase() {
  if (baseArg) return baseArg.slice('--base='.length);
  const dirty = git(['status', '--porcelain', '--untracked-files=no']);
  if (dirty) return null;            // null => uncommitted tracked changes
  return 'HEAD~1';
}

const quarantined = readQuarantine();
const base = resolveBase();

// â”€â”€ Size cap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Large scopes need complete CI evidence; declining to run is not a pass.
// The publisher separately verifies the exact source and attested artifact.
const MAX_CHANGED_FILES = 120;
function changedFiles() {
  const staged = git(['diff', '--cached', '--name-only']);
  const unstaged = git(['diff', '--name-only']);
  // On a clean tree the scope is the committed range from base, so the cap
  // must include that range rather than measuring only uncommitted files.
  const committed = base ? git(['diff', '--name-only', base, 'HEAD']) : '';
  const set = new Set(
    (staged + '\n' + unstaged + '\n' + committed).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  );
  return [...set];
}
const files = changedFiles();
if (files.length > MAX_CHANGED_FILES) {
  console.log('check_changed_tests: ' + files.length + ' files changed â€” over the ' + MAX_CHANGED_FILES
    + '-file cap for a pre-publish check.');
  console.log('check_changed_tests: NO VERDICT â€” the blocking 8-shard unit job in CI covers this push.');
  process.exit(2);
}

// Only a file a test can import can sit in a test's import graph, so a change of
// reports, docs or AlloFlowANTI.txt alone selects nothing. Saying so up front
// skips the ~20-minute graph resolve vitest would spend reaching the same answer.
const importable = files.filter((f) => /\.(?:[cm]?[jt]sx?|json)$/i.test(f));
if (!importable.length) {
  console.log('check_changed_tests: no test files cover this change (' + files.length
    + ' changed, none importable) â€” nothing to run.');
  process.exit(2);
}

const vitestArgs = [ROOT + '/node_modules/vitest/vitest.mjs', 'related', ...importable, '--run'];
// --maxWorkers=2 matches run_unit_shard.cjs. Higher contends with the rest of a
// deploy (the CRA production build is running for part of it) and the flaky
// entries in QUARANTINE.txt are all "times out under full-suite contention".
vitestArgs.push('--maxWorkers=2');
for (const file of quarantined) vitestArgs.push('--exclude', file);

if (!QUIET) {
  console.log('check_changed_tests: running tests affected by '
    + importable.length + ' file(s) changed in '
    + (base ? 'commit range ' + base + '..HEAD' : 'the working tree')
    + (quarantined.length ? ' (excluding ' + quarantined.length + ' quarantined file(s))' : ''));
}

// No shell: the file list can pass cmd.exe's 8 KB line limit. The large buffer
// keeps jsdom's CSS parse noise from killing the run with ENOBUFS.
const res = spawnSync(process.execPath, vitestArgs, {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
});
const output = String(res.stdout || '') + String(res.stderr || '');
if (!QUIET) process.stdout.write(output);

// No selected tests is no behavioral verdict, including asset-only changes.
// Full exact-candidate verification may still approve such a release.
// Never turn a skipped selection into evidence of test success.
if (/No test files found/i.test(output)) {
  console.log('check_changed_tests: no test files cover this change â€” nothing to run.');
  process.exit(2);
}

// The import-graph resolve itself can exhaust file handles on this tree (Windows,
// 2,300+ test files): vitest dies with EMFILE before judging any test. Fall back to
// the tests that name the changed files, run in small batches, and say so.
if (res.status !== 0 && fallback.isHandleExhaustion(output)) {
  const fs = require('fs');
  const path = require('path');
  const selected = fallback.selectTests(importable, fallback.listTestFiles(ROOT),
    (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'), quarantined);
  console.log('check_changed_tests: vitest could not resolve the import graph (EMFILE: too many open files).');
  if (!selected.length) {
    console.log('check_changed_tests: fallback found no test that names the changed files; nothing to run.');
    process.exit(2);
  }
  console.log('check_changed_tests: FALLBACK running ' + selected.length + ' test file(s) that name the changed files'
    + ' (narrower than the import graph; CI runs the full suite).');
  for (const batch of fallback.chunk(selected, 25)) {
    const run = spawnSync(process.execPath, [ROOT + '/node_modules/vitest/vitest.mjs', 'run', ...batch, '--maxWorkers=2'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    });
    const text = String(run.stdout || '') + String(run.stderr || '');
    if (!QUIET) process.stdout.write(text);
    if (run.status !== 0) {
      console.error('');
      console.error(fallback.isHandleExhaustion(text)
        ? 'FAIL: the fallback batch also ran out of file handles, so no verdict is possible.'
        : 'FAIL: a test that names a changed file is red. Fix the test or the code first.');
      process.exit(1);
    }
  }
  console.log('check_changed_tests: NO COMPLETE VERDICT (fallback): selected tests pass, but the import graph was not resolved.');
  process.exit(2);
}

if (res.status !== 0) {
  console.error('');
  console.error('FAIL â€” a test covering this change is red. This deploy publishes to the live CDN,');
  console.error('so it would ship the failure before CI ever sees the commit. Fix the test or the');
  console.error('code, or (only if it is genuinely pre-existing and understood) add the file to');
  console.error('tests/QUARANTINE.txt with a reason and a count.');
  process.exit(1);
}

console.log('check_changed_tests: OK â€” every test covering this change passes.');
