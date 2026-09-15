#!/usr/bin/env node
/**
 * find_vacuous_pins.cjs — PROVES which source-pin tests are passing vacuously.
 *
 * A source-pin test reads a big file and asserts on a region of it:
 *
 *     const branch = source.slice(source.indexOf(START), source.indexOf(END));
 *     expect(branch).toContain('onClose={handleCloseDashboard}');
 *
 * When an anchor goes stale, `indexOf` returns -1, `slice` reads that as an
 * offset from the END of the string, and the region silently becomes the whole
 * file — so the assertion passes against unrelated code. The test stays green
 * while pinning nothing. See tests/helpers/anchored_slice.js for the fix and
 * dev-tools/check_anchored_slices.cjs for the ratchet that stops new cases.
 *
 * WHY THIS TOOL EXISTS, and why it mutates instead of grepping: a static scan
 * for "asserted literal missing from the file the test reads" is badly wrong in
 * both directions. It flags `not.toContain('...')`, where absence is the whole
 * point. It flags assertions against rendered HTML rather than the source file.
 * It misses literals built by concatenation. When this was attempted by grep it
 * reported 32 vacuous suites; the real number was zero, and every one of those
 * suites was either healthy or already failing loudly. The only trustworthy
 * question is behavioural:
 *
 *     If I DELETE the pinned code, does the test notice?
 *
 * So this tool runs a suite, and for each source file that suite reads, mutates
 * a copy of that file (destroying the anchors the suite names) and re-runs. A
 * suite that still passes against gutted source is not testing anything. The
 * original file is restored from the in-memory original in a finally block, and
 * verified byte-identical afterwards.
 *
 * SAFETY: this tool WRITES to tracked source files for a few seconds at a time.
 * It refuses to run if the named files are dirty in git (so a crash can never
 * lose someone else's uncommitted work), restores in a finally, and verifies
 * the restore. Run it on a quiet tree. It never touches more than one file at
 * a time and never runs the repo's build.
 *
 * Usage:
 *   node dev-tools/find_vacuous_pins.cjs tests/foo.test.js [more.test.js ...]
 *   node dev-tools/find_vacuous_pins.cjs --from <file-with-one-test-path-per-line>
 *   node dev-tools/find_vacuous_pins.cjs --dry tests/foo.test.js    # show plan only
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');

function argList() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const fromIdx = process.argv.indexOf('--from');
  if (fromIdx !== -1 && process.argv[fromIdx + 1]) {
    const listed = fs.readFileSync(process.argv[fromIdx + 1], 'utf8')
      .split('\n').map((s) => s.trim()).filter(Boolean);
    return listed;
  }
  return args;
}

// Which source files does this suite read? Only direct readFileSync of a path
// that exists — a suite that builds paths dynamically is reported as skipped.
function filesRead(testPath) {
  const src = fs.readFileSync(path.join(ROOT, testPath), 'utf8');
  const re = /readFileSync\(\s*(?:resolve\([^)]*?['"]([^'"]+)['"]\s*\)|['"]([^'"]+)['"])/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src))) {
    const rel = (m[1] || m[2] || '').replace(/\\/g, '/');
    if (!rel || rel.endsWith('/')) continue;
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) out.add(rel);
  }
  return [...out];
}

// "Dirty" means TRACKED with uncommitted modifications — that is work a crash
// could destroy. An untracked file ('??') has nothing in git to lose and is
// safe to mutate-and-restore, which is also what lets this tool be tested
// against throwaway fixtures.
function isDirty(rel) {
  const r = spawnSync('git', ['status', '--porcelain', '--', rel], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return true; // cannot tell — refuse
  const lines = r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.some((l) => !l.startsWith('??'));
}

function runSuite(testPath) {
  const r = spawnSync('npx', ['vitest', 'run', testPath, '--reporter=dot'], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', timeout: 15 * 60 * 1000,
  });
  const text = `${r.stdout || ''}${r.stderr || ''}`;
  return { passed: r.status === 0, text };
}

// Gut the file: keep its byte length roughly plausible but destroy every
// identifier and string a pin could match. Comments go too — several suites
// pin '// @section NAME' markers.
function gut(content) {
  return content
    .split('\n')
    .map((line, i) => (line.trim() ? `// gutted line ${i + 1}` : ''))
    .join('\n');
}

function main() {
  const suites = argList();
  if (!suites.length) {
    console.error('usage: node dev-tools/find_vacuous_pins.cjs tests/foo.test.js [...]');
    console.error('       node dev-tools/find_vacuous_pins.cjs --from list.txt');
    return 2;
  }

  const results = [];
  for (const testPath of suites) {
    if (!fs.existsSync(path.join(ROOT, testPath))) {
      console.error(`skip (missing): ${testPath}`);
      continue;
    }
    const reads = filesRead(testPath);
    if (!reads.length) {
      results.push({ testPath, verdict: 'skipped', why: 'reads no source file directly' });
      continue;
    }

    const baseline = DRY ? { passed: true, text: '' } : runSuite(testPath);
    if (!baseline.passed) {
      results.push({ testPath, verdict: 'already-failing', why: 'fails before any mutation; fix or triage it first', reads });
      continue;
    }

    const dirty = reads.filter(isDirty);
    if (dirty.length) {
      results.push({ testPath, verdict: 'skipped', why: `refusing to mutate dirty file(s): ${dirty.join(', ')}`, reads });
      continue;
    }

    if (DRY) {
      results.push({ testPath, verdict: 'planned', why: `would mutate: ${reads.join(', ')}`, reads });
      continue;
    }

    const blind = [];
    for (const rel of reads) {
      const full = path.join(ROOT, rel);
      const original = fs.readFileSync(full);
      try {
        fs.writeFileSync(full, gut(original.toString('utf8')), 'utf8');
        const mutated = runSuite(testPath);
        if (mutated.passed) blind.push(rel);
      } finally {
        fs.writeFileSync(full, original);
        const restored = fs.readFileSync(full);
        if (!restored.equals(original)) {
          console.error(`\nFATAL: could not restore ${rel} — restore it from git before doing anything else.`);
          process.exit(3);
        }
      }
    }

    results.push({
      testPath,
      verdict: blind.length ? 'VACUOUS' : 'ok',
      why: blind.length ? `still passes with these gutted: ${blind.join(', ')}` : 'notices when its source is destroyed',
      reads,
    });
  }

  console.log('');
  for (const r of results) {
    const tag = { VACUOUS: 'VACUOUS ', ok: 'ok      ', skipped: 'skipped ', 'already-failing': 'FAILING ', planned: 'planned ' }[r.verdict];
    console.log(`${tag} ${r.testPath}`);
    console.log(`         ${r.why}`);
  }
  const vacuous = results.filter((r) => r.verdict === 'VACUOUS');
  console.log(`\n${results.length} suite(s): ${vacuous.length} vacuous, ` +
    `${results.filter((r) => r.verdict === 'ok').length} ok, ` +
    `${results.filter((r) => r.verdict === 'already-failing').length} already failing, ` +
    `${results.filter((r) => r.verdict === 'skipped').length} skipped.`);
  if (vacuous.length) {
    console.log('\nA vacuous suite asserts on a region that no longer exists. Re-point its anchors');
    console.log("at what the code says now, and slice with tests/helpers/anchored_slice.js so the");
    console.log('next rename fails loudly instead of silently widening the region.');
  }
  return vacuous.length ? 1 : 0;
}

process.exit(main());
