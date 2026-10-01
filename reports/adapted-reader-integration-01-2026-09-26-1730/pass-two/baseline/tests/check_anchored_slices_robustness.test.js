import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

// The ratchet gate must survive this tree, not just a quiet one.
//
// WHY THIS EXISTS
// check_anchored_slices.cjs walks tests/ to build a file list, then reads each
// file in a second pass. Between those two passes a file can disappear -- this is
// a SHARED tree where other sessions create and delete scratch suites constantly.
// On 2026-09-15 the gate died with an unhandled ENOENT on
// tests/tmp_probe/sib2.test.js, a directory another session had already removed:
//
//     Error: ENOENT: no such file or directory, open '...tests/tmp_probe/sib2.test.js'
//
// A vanished file is not a gate failure. Crashing on it replaces the whole report
// -- including every real finding -- with a stack trace, and an unreadable gate is
// one people learn to skip. The read is now guarded so a file that evaporates
// mid-scan is simply skipped.
//
// The gate script had no tests of its own, which is how this shipped.
const ROOT = process.cwd();
const GATE = resolve(ROOT, 'dev-tools/check_anchored_slices.cjs');

// The gate WRITES to its baseline (it absorbs growth in files the current
// author has not touched). Pointed at the tracked file, this suite dirtied
// dev-tools/anchored_slices_baseline.json on every run and raced any other
// suite that also drives the gate — vitest runs test files in parallel.
// ANCHORED_SLICES_BASELINE hands it a private copy instead.
const PRIVATE_BASELINE = join(tmpdir(), `anchored_slices_robustness_${process.pid}.json`);
writeFileSync(PRIVATE_BASELINE, readFileSync(resolve(ROOT, 'dev-tools/anchored_slices_baseline.json')));

function runGate(args = [], scanDir) {
  const env = { ...process.env, ANCHORED_SLICES_BASELINE: PRIVATE_BASELINE };
  // Scanning only the probe directory isolates this suite from every other one
  // that writes fixtures under tests/ — their files appearing and vanishing
  // mid-scan is a race this suite cannot control, and it surfaced as an
  // intermittent failure that passed alone and failed in a batch.
  if (scanDir) env.ANCHORED_SLICES_TESTS_DIR = scanDir;
  const opts = { cwd: ROOT, encoding: 'utf8', env };
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE, ...args], opts) };
  } catch (e) {
    // The gate exits 1 when the ratchet is exceeded; that is a REPORT, not a crash.
    return { code: e.status === undefined ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('check_anchored_slices - survives a file vanishing mid-scan', () => {
  it('guards the read instead of letting ENOENT escape', () => {
    const src = execFileSync(process.execPath, ['-e', `process.stdout.write(require('fs').readFileSync(${JSON.stringify(GATE)}, 'utf8'))`], { encoding: 'utf8' });
    // The bare readFileSync in the scan loop is what crashed.
    expect(src, 'the scan read must be wrapped').toMatch(/catch[\s\S]{0,120}ENOENT/);
  });

  it('reports rather than crashing, and never on a stack trace', () => {
    const { code, out } = runGate();
    // 0 (clean) or 1 (ratchet exceeded) are both legitimate. A crash is not.
    expect([0, 1], `gate exited ${code}:\n${out.slice(0, 600)}`).toContain(code);
    expect(out).not.toMatch(/ENOENT/);
    expect(out).not.toMatch(/at Module\._compile/);
    // Explicit timeout: the gate walks ~4,300 test files and shells out to git
    // for authorship, so it runs in seconds, not milliseconds — and slower
    // still on a cold filesystem cache. The 5 s default failed here once the
    // authorship lookup landed; the sibling test below already allows 120 s.
  }, 120000);

  it('still finishes when a scratch suite disappears while it runs', () => {
    // Recreate the exact shape: a test file that exists when the walk starts.
    // We cannot race the gate deterministically, so assert the weaker fact that
    // matters -- a directory of throwaway suites does not break the run -- and
    // then delete it, which is what the other session did.
    const dir = resolve(ROOT, 'tests/tmp_anchored_probe');
    try {
      mkdirSync(dir, { recursive: true });
      // Build the fixture's raw-pattern line at runtime. Written as a literal it
      // would be indistinguishable from a real pin to the very scanner under test,
      // and this file would flag itself -- a self-inflicted ratchet bump. An
      // exemption would have hidden it instead; assembling the string keeps both
      // the fixture honest and the scan accurate.
      const RAW = ['const r = s', 'slice(s', "indexOf('A'), s", "indexOf('B'));"].join('.');
      writeFileSync(resolve(dir, 'probe.test.js'), RAW + '\n');
      const first = runGate([], dir);
      expect([0, 1]).toContain(first.code);
      rmSync(dir, { recursive: true, force: true });
      // The directory is gone: the gate must report that it has nothing to
      // scan, not crash on the vanished path.
      const second = runGate([], dir);
      expect([0, 1], 'the gate broke after the probe directory was removed').toContain(second.code);
      expect(second.out).not.toMatch(/ENOENT/);
    } finally {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    }
  }, 120000);
});
