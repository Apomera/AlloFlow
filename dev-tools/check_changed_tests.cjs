// Behavioural deploy gate: run the tests affected by THIS deploy's changes.
//
// WHY THIS EXISTS. The blocking unit suite (npm run test:ci:shard, 8 shards in
// .github/workflows/verify.yml) already runs the whole Vitest suite minus
// tests/QUARANTINE.txt on every push and pull request. That gate is good and this
// does not replace it.
//
// The hole it does not cover is timing. deploy.sh pushes and publishes to the CDN
// in the SAME run, so the live site updates minutes before CI finishes judging the
// commit. Everything deploy.sh checks today is STATIC â€” free variables, module
// freshness, registry producers, render smoke. Nothing RUNS the test suite. On
// 2026-08-11 two ReferenceError crashes (an undeclared __alloT in an SVG
// aria-label, in Aquaculture Lab and Logic Lab) reached the live CDN; deploy.sh's
// own line 163 already carries a note about a different bug that shipped because
// "the vitest guard that covered it never ran here".
//
// Running all 2,236 test files locally would take long enough that it would be
// skipped, which is how gates die. So this runs only what the change touches, via
// vitest related, which resolves the affected set from the import graph. On a
// representative deploy that is ~5 files / ~30 seconds.
//
// The file list comes from git, TRACKED files only. vitest --changed also counts
// every untracked file (`git ls-files --others`); with 72,878 untracked scratch
// files from other sessions on 2026-10-28 that turned a two-file commit into a
// 2-hour silent run that the 120-file cap below never saw.
//
// Quarantined files are excluded for exactly the reason run_unit_shard.cjs excludes
// them (audit finding H1): a gate that is permanently red gates nothing. Their
// status stays public in the separate non-blocking quarantine job, and
// check_quarantine fails if that list ever stops shrinking honestly.
'use strict';

const { spawnSync } = require('child_process');
const { ROOT, readQuarantine } = require('./quarantine.cjs');

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
// This gate is a FAST pre-publish check, not a substitute for the blocking
// 8-shard CI job. On a typical deploy vitest --changed selects ~5 files and the
// gate costs ~30s. On a very large batch (a full day of multi-session work) it
// selected 106 files, ran for 20 minutes, and reported failures in 102 of them â€”
// which sounded catastrophic and was not: the sampled failures reproduce at HEAD,
// so they are pre-existing test debt beyond tests/QUARANTINE.txt, not regressions
// from the change being deployed.
//
// Blocking a deploy on debt the change did not introduce is the exact fault audit
// H1 named: a gate that cannot change colour gates nothing, and the next person
// just sets SKIP_CHANGED_TESTS=1 forever. Distinguishing new red from old red
// needs a baseline run against HEAD, which doubles an already slow pass. So above
// the cap this defers to CI explicitly and says so, rather than pretending to a
// verdict it cannot support.
// The cap is measured from git, not from vitest. Asking `vitest list --changed`
// how many files it would select costs a full module-graph resolve â€” 9 minutes on
// this batch â€” so the cheap check has to come first or the gate is slow precisely
// when it is about to decline to run.
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
  console.log('check_changed_tests: SKIPPED â€” the blocking 8-shard unit job in CI covers this push.');
  process.exit(0);
}

// Only a file a test can import can sit in a test's import graph, so a change of
// reports, docs or AlloFlowANTI.txt alone selects nothing. Saying so up front
// skips the ~20-minute graph resolve vitest would spend reaching the same answer.
const importable = files.filter((f) => /\.(?:[cm]?[jt]sx?|json)$/i.test(f));
if (!importable.length) {
  console.log('check_changed_tests: no test files cover this change (' + files.length
    + ' changed, none importable) â€” nothing to run.');
  process.exit(0);
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

// "No test files found" is a PASS, not a failure: plenty of legitimate deploys
// touch only assets, docs, or language packs. Vitest exits non-zero for it, so
// without this the gate would block those deploys outright.
if (/No test files found/i.test(output)) {
  console.log('check_changed_tests: no test files cover this change â€” nothing to run.');
  process.exit(0);
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
