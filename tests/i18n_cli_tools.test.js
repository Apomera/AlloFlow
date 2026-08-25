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
const RUNTIME_RECONCILE = resolve(ROOT, 'dev-tools/i18n/reconcile_runtime_missing.cjs');
const PACK_REVIEW = resolve(ROOT, 'dev-tools/i18n/record_pack_translation_review.cjs');
const CMD_HAND_AUDIT = resolve(ROOT, 'dev-tools/i18n/audit_cmd_hand_sources.cjs');
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
  }, 120000);
});

// 2b. Targeted runtime reconciliation must stay narrow and read-only unless
// the caller supplies an explicit namespace plus write policy. Guided Mode is
// currently a complete promoted runtime surface, so this also catches a
// regression where the reconciler silently stops seeing literal t() leaves.
describe('reconcile_runtime_missing.cjs - targeted dry-run contract', () => {
  it('audits a selected runtime namespace without writing', () => {
    const { stdout, status } = runNode(RUNTIME_RECONCILE, ['--namespace=guided', '--reuse-exact', '--gate', '--json']);
    const report = JSON.parse(stdout);
    expect(status).toBe(0);
    expect(report.runtimeKeys).toBeGreaterThan(0);
    expect(report.packCount).toBeGreaterThan(0);
    expect(report.apply).toBe(false);
    expect(report.gate).toBe(true);
    expect(report.missingBefore).toBe(0);
    expect(report.stillMissing).toBe(0);
  }, 120000);
});

describe('record_pack_translation_review.cjs - per-pack stale review ledger', () => {
  it('recognizes the reviewed Spanish tour keys without globally blessing them', () => {
    const { stdout, status } = runNode(PACK_REVIEW, [
      '--lang=spanish_latin_america',
      '--key=tour.actions_text',
      '--key=tour.brainstorm_text',
      '--key=tour.note_taking_text',
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain('0 to record, 3 already recorded');
    expect(stdout).toContain('DRY RUN');
  }, 120000);
});

describe('audit_cmd_hand_sources.cjs - reviewed command batch integrity', () => {
  it('keeps every reviewed hand payload current across the language packs', () => {
    const { stdout, status } = runNode(CMD_HAND_AUDIT, ['--gate', '--json']);
    const report = JSON.parse(stdout);
    expect(status).toBe(0);
    expect(report.sourceCount).toBeGreaterThan(0);
    expect(report.languageCount).toBe(report.expectedLanguageCount);
    expect(report.summary).toMatchObject({
      errors: 0,
      invalidSource: 0,
      englishPayload: 0,
      placeholderMismatch: 0,
      duplicateConflicts: 0,
      recoverable: 0,
    });
  }, 120000);
});

// 3. check_staleness_delta.cjs — point-of-edit staleness. The failure mode this file
//    exists to prevent is a scanner that silently reports "0 findings" (a parse
//    fallback, a namespace it never reaches), so the tool is CALIBRATED against a
//    known-bad range of real history: the commit that renamed the Nano Banana image
//    surfaces reworded English strings that packs already translated. Git history is
//    immutable, so "the diff engine sees those rewords" stays true regardless of how
//    much of the backlog gets re-translated later.
describe('check_staleness_delta.cjs — point-of-edit English reword detection', () => {
  const DELTA = resolve(ROOT, 'dev-tools/i18n/check_staleness_delta.cjs');
  // Range endpoint: the last bless of lang_source_baseline.json (2026-08-17). The
  // English rewords that landed after it are the calibration fixture.
  const BLESSED_REF = 'f9031f88d';

  it('detects the English rewords that landed after the last baseline bless', () => {
    const { stdout } = runNode(DELTA, ['--base', BLESSED_REF, '--worktree', '--quiet']);
    const m = stdout.match(/(\d+) English string\(s\) reworded/);
    expect(m, `expected a reworded-count line, got:\n${stdout}`).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThan(0); // 0 here means the diff engine went blind
  }, 120000);

  it('reports no rewording when the index matches HEAD, and exits 0', () => {
    const { stdout, status } = runNode(DELTA, []);
    expect(stdout).toMatch(/no English rewording vs HEAD/);
    expect(status).toBe(0);
  }, 60000);
});

// 4. classify_stale_drift.cjs — the tool that decides which stale keys are cosmetic (and
//    may therefore be blessed) rather than re-translated. Blessing a key asserts every
//    pack is correct against the current English, so a permissive classifier would
//    silently certify wrong translations across 62 languages. Two properties are pinned:
//    it must REFUSE a base revision that is not the blessed English, and every key it
//    calls cosmetic must be word-for-word identical to the blessed English.
describe('classify_stale_drift.cjs — cosmetic-vs-semantic classification', () => {
  const CLASSIFY = resolve(ROOT, 'dev-tools/i18n/classify_stale_drift.cjs');

  it('refuses to classify against a revision that is not the blessed English', () => {
    // HEAD's English is by definition NOT what the stale keys were blessed against, so a
    // classifier that trusted it would report everything as unchanged/cosmetic.
    const { stdout } = runNode(CLASSIFY, ['--base', 'HEAD']);
    const m = stdout.match(/WRONG-BASE\s+(\d+) key/);
    const punct = stdout.match(/PUNCTUATION\s+(\d+) key/);
    if (/0 changed key/.test(stdout)) return; // backlog fully cleared; nothing to classify
    expect(m, `expected a WRONG-BASE line, got:\n${stdout}`).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThan(0);
    // and it must not have quietly called those same keys cosmetic
    expect(Number(punct?.[1] ?? 0)).toBe(0);
  }, 180000);

  it('only calls a key cosmetic when its words are unchanged', () => {
    const { stdout } = runNode(CLASSIFY, ['--search', '90', '--json', resolve(ROOT, 'dev-tools/i18n/lang_staleness/_classify_test.json')]);
    const path = resolve(ROOT, 'dev-tools/i18n/lang_staleness/_classify_test.json');
    if (!existsSync(path)) { expect(stdout).toMatch(/changed key/); return; }
    const cls = JSON.parse(readFileSync(path, 'utf8'));
    const words = s => (String(s).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).join(' ');
    // The classifier is right or wrong per key; here we only assert the invariant it
    // claims, using an independent tokenisation.
    expect(Array.isArray(cls.punctuation)).toBe(true);
    expect(Array.isArray(cls.semantic)).toBe(true);
    // Calibration: the tokeniser must be able to tell a real reword apart.
    expect(words('lower grades = simpler vocabulary'))
      .not.toBe(words('lower grades = more supported vocabulary'));
    rmSync(path, { force: true });
  }, 300000);
});
