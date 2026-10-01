// The vacuous-pin detector itself (dev-tools/find_vacuous_pins.cjs).
//
// That tool WRITES to tracked source files — it gutts a file, re-runs the
// suite, and restores. So the two things that must be true are:
//   1. it actually detects a vacuous pin (a suite that stays green when the
//      code it claims to pin is destroyed), and does not cry wolf on a healthy
//      one; and
//   2. it never leaves a file damaged, and refuses outright to touch a file
//      that has uncommitted work in it.
//
// Both are exercised here against a throwaway fixture source + fixture suite
// written into a temp dir, so nothing in the repo is mutated by this test.

import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawn } from 'node:child_process';

const ROOT = process.cwd();
const TOOL = path.join(ROOT, 'dev-tools', 'find_vacuous_pins.cjs');

// Fixtures live under the repo (the tool resolves paths relative to ROOT) but
// in a temp-named folder, and are removed afterwards.
const STAMP = `vacuous_fixture_${Date.now()}`;
const DIR = path.join(ROOT, 'tests', STAMP);
const SRC_REL = `tests/${STAMP}/fixture_source.js`;
const HEALTHY_REL = `tests/${STAMP}/healthy.test.js`;
const VACUOUS_REL = `tests/${STAMP}/vacuous.test.js`;

const FIXTURE_SOURCE = [
  'const START_MARKER = 1;',
  'function pinnedFunction() { return "the pinned body"; }',
  'const END_MARKER = 2;',
].join('\n');

fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(ROOT, SRC_REL), FIXTURE_SOURCE);

// Healthy: asserts on a literal that really is in the fixture, so gutting the
// fixture must make it fail.
fs.writeFileSync(path.join(ROOT, HEALTHY_REL), `
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('${SRC_REL}', 'utf8');
describe('healthy pin', () => {
  it('pins something that exists', () => {
    expect(source).toContain('function pinnedFunction()');
  });
});
`.trim());

// Vacuous: the END anchor is stale, so the slice runs to the end of the file
// and the region contains everything. It passes today, and keeps passing even
// when the fixture is gutted, because it is really only asserting "the file
// contains a comment", which the gutted file also does.
fs.writeFileSync(path.join(ROOT, VACUOUS_REL), `
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('${SRC_REL}', 'utf8');
describe('vacuous pin', () => {
  it('looks like it pins a region but does not', () => {
    // allow-raw-slice: this fixture must BE the broken pattern to prove the detector catches it.
    const region = source.slice(source.indexOf('START_MARKER'), source.indexOf('ANCHOR_THAT_MOVED'));
    expect(region.length).toBeGreaterThanOrEqual(0);
    expect(source.length).toBeGreaterThan(0);
  });
});
`.trim());

afterAll(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

function runTool(args) {
  try {
    return { code: 0, out: execFileSync('node', [TOOL, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000 }) };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout || ''}${error.stderr || ''}` };
  }
}

describe('detects a vacuous pin, clears a healthy one', () => {
  it('reports the suite that survives having its source destroyed', () => {
    const { out, code } = runTool([VACUOUS_REL]);
    expect(out).toMatch(/VACUOUS/);
    expect(out).toContain(SRC_REL);
    expect(code).toBe(1);
  }, 15 * 60 * 1000);

  it('clears the suite that notices, and does not report it as vacuous', () => {
    const { out, code } = runTool([HEALTHY_REL]);
    expect(out).toMatch(/ok\s+tests\//);
    expect(out).toContain('notices when its source is destroyed');
    expect(out).not.toMatch(/VACUOUS/);
    expect(code).toBe(0);
  }, 15 * 60 * 1000);

  it('leaves every mutated file byte-identical afterwards', () => {
    expect(fs.readFileSync(path.join(ROOT, SRC_REL), 'utf8')).toBe(FIXTURE_SOURCE);
  });
});

describe('safety', () => {
  it('refuses to mutate a file that has uncommitted work in it', () => {
    // AlloFlowANTI.txt is dirty in this working tree while the session's own
    // edits are uncommitted; whatever the state, the tool must either skip a
    // dirty file or find it clean — it must NEVER mutate a dirty one.
    const { out } = runTool(['--dry', 'tests/dashboard_close_routing.test.js']);
    expect(out).toMatch(/skipped|planned/);
    if (/refusing to mutate dirty/.test(out)) {
      expect(out).toContain('AlloFlowANTI.txt');
    }
  }, 5 * 60 * 1000);

  it('a suite that reads no source file is skipped, not mutated', () => {
    const { out } = runTool(['--dry', 'tests/anchored_slice_helper.test.js']);
    expect(out).toContain('reads no source file directly');
  }, 5 * 60 * 1000);

  it('a dry run reports a plan and changes nothing', () => {
    const before = fs.readFileSync(path.join(ROOT, SRC_REL), 'utf8');
    const { out } = runTool(['--dry', HEALTHY_REL]);
    expect(out).toMatch(/planned|skipped/);
    expect(fs.readFileSync(path.join(ROOT, SRC_REL), 'utf8')).toBe(before);
  }, 5 * 60 * 1000);
});


// ── Crash recovery ────────────────────────────────────────────────────────
//
// restoreOrDie lives in a `finally`, which covers a thrown error but NOT a
// Ctrl+C, a kill, or a hard crash: the process dies between the gutting write
// and the restore, leaving a TRACKED source file full of `// gutted line N`
// with nothing on disk to say so. These tests cover the journal that closes
// that hole — written before each mutation, carrying the original bytes, and
// replayed by the next run.
//
// The journal is per-pid for a reason found here: a single shared filename let
// a concurrent run clobber the entry, and recovery then restored the WRONG
// file while the real mutation stayed on disk. That is worse than no journal,
// because it reports success.
describe('crash recovery', () => {
  const SLOW_DIR = path.join(ROOT, 'tests', `${STAMP}_slow`);
  const SLOW_SRC_REL = `tests/${STAMP}_slow/fixture_source.js`;
  const SLOW_TEST_REL = `tests/${STAMP}_slow/slow.test.js`;

  const journals = () => fs.readdirSync(ROOT).filter((n) => n.startsWith('.vacuous-pins-journal.') && n.endsWith('.json'));

  afterAll(() => {
    fs.rmSync(SLOW_DIR, { recursive: true, force: true });
    for (const j of journals()) { try { fs.unlinkSync(path.join(ROOT, j)); } catch (_) {} }
  });

  it('a hard kill mid-mutation leaves a journal, and the next run restores the file', async () => {
    fs.mkdirSync(SLOW_DIR, { recursive: true });
    fs.writeFileSync(path.join(ROOT, SLOW_SRC_REL), FIXTURE_SOURCE);
    // Slow enough that the kill lands while the file is gutted.
    fs.writeFileSync(path.join(ROOT, SLOW_TEST_REL), `
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('${SLOW_SRC_REL}', 'utf8');
describe('slow pin', () => {
  it('waits, then pins', async () => {
    await new Promise(r => setTimeout(r, 12000));
    expect(source).toContain('function pinnedFunction()');
  }, 60000);
});
`.trim());

    const child = spawn('node', [TOOL, SLOW_TEST_REL], { cwd: ROOT });
    const started = Date.now();
    let sawGutted = false;
    while (Date.now() - started < 120000) {
      const now = fs.existsSync(path.join(ROOT, SLOW_SRC_REL)) ? fs.readFileSync(path.join(ROOT, SLOW_SRC_REL), 'utf8') : '';
      if (now.includes('gutted line')) { sawGutted = true; break; }
      if (child.exitCode !== null) break;
      await new Promise((r) => setTimeout(r, 400));
    }
    expect(sawGutted, 'the tool must actually gut the file before we kill it').toBe(true);

    // A journal must exist DURING the mutation, naming this file.
    const during = journals().map((n) => JSON.parse(fs.readFileSync(path.join(ROOT, n), 'utf8')));
    expect(during.some((e) => e.rel === SLOW_SRC_REL), 'a journal must name the file being mutated').toBe(true);

    // Hardest case: SIGKILL, so no handler and no finally runs.
    child.kill('SIGKILL');
    await new Promise((r) => { child.on('exit', r); setTimeout(r, 15000); });
    expect(fs.readFileSync(path.join(ROOT, SLOW_SRC_REL), 'utf8')).toContain('gutted line');

    // The next run must put it back, byte for byte.
    const { out } = runTool(['--dry', SLOW_TEST_REL]);
    expect(out).toMatch(/Recovered: restored/);
    expect(out).toContain(SLOW_SRC_REL);
    expect(fs.readFileSync(path.join(ROOT, SLOW_SRC_REL), 'utf8')).toBe(FIXTURE_SOURCE);
    // Scoped to THIS fixture: vitest runs test files in parallel, and a
    // sibling suite driving the same tool legitimately holds its own journal
    // while it works. Asserting a global count of zero made this fail only
    // when run alongside others — a real flake with an innocent cause.
    const mine = journals().filter((n) => {
      try { return JSON.parse(fs.readFileSync(path.join(ROOT, n), 'utf8')).rel === SLOW_SRC_REL; }
      catch (_) { return false; }
    });
    expect(mine, 'the journal for this fixture is cleared once recovered').toEqual([]);
  }, 15 * 60 * 1000);

  it('leaves a live run\'s journal alone (per-pid, so concurrent runs cannot cross-restore)', () => {
    // A journal owned by a RUNNING process must not be touched: restoring it
    // would corrupt a mutation another run is in the middle of. Our own pid is
    // alive, so a journal claiming it stands in for the concurrent case.
    const victim = path.join(ROOT, SLOW_SRC_REL);
    fs.mkdirSync(SLOW_DIR, { recursive: true });
    fs.writeFileSync(victim, 'CURRENT CONTENT');
    const journalPath = path.join(ROOT, `.vacuous-pins-journal.${process.pid}.json`);
    fs.writeFileSync(journalPath, JSON.stringify({
      rel: SLOW_SRC_REL, startedAt: new Date().toISOString(), pid: process.pid,
      originalBase64: Buffer.from('DIFFERENT ORIGINAL').toString('base64'),
    }));

    const { out } = runTool(['--dry', HEALTHY_REL]);
    expect(out).not.toMatch(/Recovered/);
    expect(fs.readFileSync(victim, 'utf8'), 'a live run\'s file must not be rewritten').toBe('CURRENT CONTENT');
    expect(fs.existsSync(journalPath), 'a live run\'s journal must survive').toBe(true);
    fs.unlinkSync(journalPath);
  }, 5 * 60 * 1000);

  it('the journal filename is gitignored, so a crashed run cannot be committed', () => {
    expect(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8')).toContain('.vacuous-pins-journal.*.json');
  });
});
