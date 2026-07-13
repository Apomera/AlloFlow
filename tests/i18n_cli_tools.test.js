// Subprocess tests for the two i18n CLI dev-tools (CJS, no exports — driven via
// `node <script>`). Both are CI guards whose logic had no test coverage.
//
// 1. ingest_translation_feedback.cjs — exercises the full accept/reject guard
//    ladder in DRY-RUN against a temp dir of fixture correction records. Dry-run
//    never writes lang/*; it only emits feedback_patches/<slug>.json, which we
//    clean up afterward.
// 2. check_safety_string_spanglish.cjs --json — regression guard asserting the
//    real lang tree currently has zero half-translated safety strings (the
//    tool's whole purpose) and exits 0.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const INGEST = resolve(ROOT, 'dev-tools/i18n/ingest_translation_feedback.cjs');
const SPANGLISH = resolve(ROOT, 'dev-tools/i18n/check_safety_string_spanglish.cjs');
const PATCHES_DIR = resolve(ROOT, 'dev-tools/i18n/feedback_patches');

// Run a node script, returning { stdout, status } even on a non-zero exit.
function runNode(script, args) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8' });
    return { stdout, status: 0 };
  } catch (e) {
    return { stdout: (e.stdout || '').toString(), status: e.status ?? 1 };
  }
}

describe('ingest_translation_feedback.cjs — dry-run guard ladder', () => {
  let tmp;
  let out;
  const patchesPreexisted = existsSync(PATCHES_DIR);

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ingest-test-'));
    // 1 acceptable correction + one fixture per rejection rung.
    const recs = {
      'a_accept.json':     { language: 'Greek', key: 'common.save', current: 'Save', suggested: 'Αποθήκευση', english: 'Save' },
      'b_unknown.json':    { language: 'Klingon', key: 'common.save', suggested: 'x' },
      'c_english.json':    { language: 'English', key: 'common.save', suggested: 'x' },
      'd_nokey.json':      { language: 'Greek', key: '', suggested: 'x' },
      'e_badkey.json':     { language: 'Greek', key: 'zzz.nope.nonexistent', suggested: 'x' },
      'f_phmismatch.json': { language: 'Greek', key: 'guided.step_of', suggested: 'Βήμα χωρίς αριθμούς' },
      'g_noop.json':       { language: 'Greek', key: 'common.save', suggested: 'Save' },
      'h_spanglish.json':  { language: 'Greek', key: 'common.save', suggested: 'this cannot be recovered' },
    };
    for (const [f, r] of Object.entries(recs)) writeFileSync(join(tmp, f), JSON.stringify(r));
    out = runNode(INGEST, [tmp]); // dry-run (no --apply)
  });

  afterAll(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    // Dry-run wrote feedback_patches/greek.json. Remove only what the test created.
    if (!patchesPreexisted) rmSync(PATCHES_DIR, { recursive: true, force: true });
    else rmSync(join(PATCHES_DIR, 'greek.json'), { force: true });
  });

  it('reports the right accepted / needs-review tallies', () => {
    expect(out.stdout).toContain('corrections found: 8');
    expect(out.stdout).toContain('accepted: 1 across 1 packs');
    expect(out.stdout).toContain('needs review: 7');
  });

  it('accepts a clean, placeholder-safe, non-English correction and writes the patch', () => {
    const patch = JSON.parse(readFileSync(join(PATCHES_DIR, 'greek.json'), 'utf8'));
    expect(patch['common.save']).toBe('Αποθήκευση');
  });

  it('rejects each guard-ladder violation with its specific reason', () => {
    const s = out.stdout;
    expect(s).toContain('unknown language "Klingon"');
    expect(s).toContain('English source correction');
    expect(s).toMatch(/no key/);
    expect(s).toContain('key not in ui_strings.js: zzz.nope.nonexistent');
    expect(s).toContain('placeholder/tag mismatch');
    expect(s).toContain('suggestion equals English source');
    expect(s).toContain('still contains English structural words');
  });

  it('is a dry-run (does not apply to lang/*)', () => {
    expect(out.stdout).toContain('dry-run');
  });
});

describe('check_safety_string_spanglish.cjs --json — regression guard', () => {
  it('reports zero half-translated safety strings on the current tree and exits 0', () => {
    const { stdout, status } = runNode(SPANGLISH, ['--json']);
    const report = JSON.parse(stdout);
    expect(typeof report.totalPacks).toBe('number');
    expect(report.totalPacks).toBeGreaterThan(0);
    expect(report.skipped).toContain('maay_maay'); // PPS pack is intentionally excluded
    expect(report.flaggedKeys).toBe(0);
    expect(status).toBe(0);
  }, 15000);
});
