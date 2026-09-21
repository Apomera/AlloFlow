// The anchored-slices ratchet gate (dev-tools/check_anchored_slices.cjs).
//
// The gate blocks new uses of `source.slice(source.indexOf(A), source.indexOf(B))`,
// which fails OPEN: a stale anchor returns -1, `slice` reads that as an offset
// from the end of the string, and the region silently becomes the whole file so
// every toContain() on it passes for free.
//
// What is tested here is the gate's SOCIAL behaviour, which is what decides
// whether anyone keeps running it. In a tree several sessions write to, the
// baseline ages: on 2026-09-20 the gate flagged 92 files, 84 of them brand-new
// suites written by other people. A gate that fails on every run for reasons
// you cannot act on gets ignored, and then it also hides the one file you DID
// add. So it must fail on your own work and absorb everyone else's.
//
// These tests drive the real gate as a subprocess against throwaway fixtures,
// and restore the baseline afterwards, since the gate writes to it by design.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const GATE = path.join(ROOT, 'dev-tools', 'check_anchored_slices.cjs');
const SHARED_BASELINE = path.join(ROOT, 'dev-tools', 'anchored_slices_baseline.json');

// The gate WRITES to its baseline by design, and vitest runs test files in
// parallel. Sharing the tracked baseline with another suite made both pass
// alone and fail together — so this suite works on a private copy, handed to
// the gate through ANCHORED_SLICES_BASELINE, and the tracked file is never
// touched.
const BASELINE = path.join(os.tmpdir(), `anchored_slices_baseline_${process.pid}_${Date.now()}.json`);

const STAMP = `gate_fixture_${Date.now()}`;
const DIR = path.join(ROOT, 'tests', STAMP);
const rel = (name) => `tests/${STAMP}/${name}`;

// The raw pattern, written so the gate sees it exactly as it appears in real
// suites: a file read, then a slice bounded by two indexOf calls.
const rawSuite = (marker) => `
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('package.json', 'utf8');
describe('fixture', () => {
  it('slices', () => {${marker ? '\n    // allow-raw-slice: deliberate fixture' : ''}
    expect(source.slice(source.indexOf('{'), source.indexOf('NOPE'))).toContain('name');
  });
});
`.trim();

let savedBaseline;

function runGate(args = []) {
  const opts = {
    cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000,
    env: { ...process.env, ANCHORED_SLICES_BASELINE: BASELINE },
  };
  try {
    return { code: 0, out: execFileSync('node', [GATE, ...args], opts) };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

beforeAll(() => {
  // Seed the private baseline from the real one, so the fixtures below are
  // measured against the same reality the gate normally sees.
  savedBaseline = fs.readFileSync(SHARED_BASELINE);
  fs.writeFileSync(BASELINE, savedBaseline);
  fs.mkdirSync(DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.rmSync(BASELINE, { force: true });
  // The tracked baseline must be byte-identical to how we found it: this
  // suite only ever wrote to its private copy, so this is a guard, not a fix.
  if (!fs.readFileSync(SHARED_BASELINE).equals(savedBaseline)) {
    fs.writeFileSync(SHARED_BASELINE, savedBaseline);
    throw new Error('the shared baseline changed while this suite ran — it must use the private one');
  }
});

describe('the gate blocks new raw slices in work you own', () => {
  it('fails, names the file and the line, and points at the helper', () => {
    const file = rel('mine.test.js');
    fs.writeFileSync(path.join(ROOT, file), rawSuite(false));
    const { out, code } = runGate();
    expect(code, 'a new raw slice in an untracked (therefore yours) file must fail').toBe(1);
    expect(out).toContain(file);
    expect(out).toMatch(/line \d+:/);
    expect(out).toContain('sliceBetween');
    fs.rmSync(path.join(ROOT, file));
  }, 10 * 60 * 1000);

  it('honours an allow-raw-slice marker for a deliberate fixture', () => {
    const file = rel('exempt.test.js');
    fs.writeFileSync(path.join(ROOT, file), rawSuite(true));
    const { out } = runGate();
    expect(out).not.toContain(file);
    fs.rmSync(path.join(ROOT, file));
  }, 10 * 60 * 1000);
});

describe('the gate stays actionable as the tree moves under it', () => {
  it('absorbs growth in files the author has not touched, instead of failing forever', () => {
    // Stand in for another session's work: a file that is ALREADY in the
    // baseline at a lower count, and is not dirty in git. The gate must record
    // it at today's count rather than blaming this author.
    const foreign = 'tests/__gate_absorb_probe.test.js';
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

    // Pick a real, committed file that the gate already counts, and lie about
    // its baseline so it looks like it grew.
    const [victim, realCount] = Object.entries(baseline.files).find(([f, n]) => n >= 2 && fs.existsSync(path.join(ROOT, f))) || [];
    expect(victim, 'need a committed file already in the baseline').toBeTruthy();
    baseline.files[victim] = realCount - 1;
    fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 1));

    const first = runGate();
    // Either it absorbed silently (exit 0) or it failed on something of the
    // author's own and absorbed alongside; either way the victim is not blamed.
    const blamedLines = first.out.split('\n').filter((l) => l.trim().startsWith(victim));
    expect(blamedLines, `${victim} is not this author's file and must not be blamed`).toEqual([]);

    const after = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    expect(after.files[victim], 'the baseline must move forward to today\'s count').toBe(realCount);
    expect(foreign in after.files).toBe(false);
  }, 10 * 60 * 1000);

  it('reports absorbed files as a count, so the message stays short', () => {
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const victims = Object.entries(baseline.files).filter(([f, n]) => n >= 2 && fs.existsSync(path.join(ROOT, f))).slice(0, 3);
    expect(victims.length).toBeGreaterThan(0);
    for (const [f, n] of victims) baseline.files[f] = n - 1;
    fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 1));

    const mine = rel('mine2.test.js');
    fs.writeFileSync(path.join(ROOT, mine), rawSuite(false));
    const { out } = runGate();
    // The author's own file is named in full; everyone else's is a count.
    expect(out).toContain(mine);
    expect(out).toMatch(/other file\(s\) also grew/);
    fs.rmSync(path.join(ROOT, mine));
  }, 10 * 60 * 1000);
});

describe('a comment is not a use', () => {
  it('does not flag a header that DESCRIBES the pattern', () => {
    // Real suites explain what they pin, and this gate's own file quotes the
    // broken pattern in its docs. Flagging prose pushes people to scatter
    // exemption markers through comments, which then hide real uses.
    const file = rel('documented.test.js');
    const lines = [
      // allow-raw-slice: the next line is fixture TEXT written to a temp file,
      // not a slice this suite performs. The gate reads source text, so a
      // quoted example is indistinguishable from the real thing to it.
      '// This suite pins a region: source.slice(source.indexOf(A), source.indexOf(B))',
      "import { describe, it, expect } from 'vitest';",
      "describe('x', () => { it('y', () => { expect(1).toBe(1); }); });",
    ];
    fs.writeFileSync(path.join(ROOT, file), lines.join('\n'));
    const { out } = runGate();
    expect(out).not.toContain(file);
    fs.rmSync(path.join(ROOT, file));
  }, 10 * 60 * 1000);
});

describe('it fails CLOSED when git cannot say who owns what', () => {
  it('blames everything rather than absorbing, outside a git work tree', () => {
    // CI checks out main clean: nothing uncommitted, nothing ahead of origin.
    // Attribution then finds no "your files" — and an earlier version absorbed
    // on that basis and printed OK, so CI would never have caught new debt.
    // That is the same fail-open shape the gate exists to prevent, reproduced
    // inside the gate. Simulated here by running it outside a repo, the
    // degenerate case of the same condition.
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'gate_ci_'));
    try {
      fs.mkdirSync(path.join(sandbox, 'dev-tools'));
      fs.mkdirSync(path.join(sandbox, 'tests'));
      fs.copyFileSync(GATE, path.join(sandbox, 'dev-tools', 'check_anchored_slices.cjs'));
      fs.writeFileSync(path.join(sandbox, 'dev-tools', 'anchored_slices_baseline.json'),
        JSON.stringify({ note: 'test', updated: '2026-01-01', totalUses: 0, files: {} }));
      // Fixture TEXT written to a sandbox file, not a slice this suite
      // performs. The gate reads source text, so a quoted example looks
      // identical to the real thing from where it stands.
      const debt = [
        "import fs from 'node:fs';",
        "const source = fs.readFileSync('package.json', 'utf8');",
        // allow-raw-slice: the next line is the fixture's content, not a use.
        "const x = source.slice(source.indexOf('{'), source.indexOf('ZZ'));",
      ];
      fs.writeFileSync(path.join(sandbox, 'tests', 'newdebt.test.js'), debt.join('\n'));

      let code = 0;
      let out = '';
      try {
        out = execFileSync('node', [path.join(sandbox, 'dev-tools', 'check_anchored_slices.cjs')],
          { cwd: sandbox, encoding: 'utf8', timeout: 10 * 60 * 1000 });
      } catch (error) {
        code = error.status ?? 1;
        out = `${error.stdout || ''}${error.stderr || ''}`;
      }
      expect(code, 'unattributable new debt must FAIL, never be absorbed').toBe(1);
      expect(out).toContain('newdebt.test.js');
      expect(out).not.toMatch(/absorbed/);
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  }, 10 * 60 * 1000);
});

describe('--list stays a plain inventory', () => {
  it('prints a count per file and a total, and never exits non-zero', () => {
    const { out, code } = runGate(['--list']);
    expect(code).toBe(0);
    expect(out).toMatch(/\d+ file\(s\), \d+ raw slice\(indexOf\) use\(s\)\./);
  }, 10 * 60 * 1000);
});
