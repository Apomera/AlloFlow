// Main-UI language pack parity gate.
//
// dev-tools/check_main_ui_pack_parity.cjs checks three separate things across
// 63 language packs: root/public mirror drift, missing translation keys, and
// placeholder integrity ({name} slots that would otherwise ship to a student as
// literal braces).
//
// Until 2026-09-14 the whole gate THREW ON REQUIRE — its catalog dependency
// asserted that every directions.* key had English text, and four call sites had
// been added to view_directions_result_source.jsx without catalog entries. A
// gate that throws before it can check anything protects nothing, so mirror
// drift and placeholder regressions went unguarded. (Mirror drift is not
// hypothetical here: the same class of bug left a second lang tree unsynced
// earlier the same day.)
//
// The untranslated-key backlog — 40 keys x 63 packs — needs native speakers, not
// code, so it is recorded as a baseline that may shrink but never grow. This
// test asserts the gate RUNS and that the two code-level checks stay clean.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_main_ui_pack_parity.cjs');
const BASELINE = resolve(process.cwd(), 'dev-tools/main_ui_pack_parity_baseline.json');
const CATALOG = resolve(process.cwd(), 'dev-tools/i18n/extracted_view_i18n_catalog.cjs');

function runGate() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [GATE], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }) };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

describe('main UI language pack parity', () => {
  const result = runGate();

  it('loads its i18n catalog dependency without throwing', () => {
    // The original breakage. Requiring the catalog is what took the gate down.
    expect(() => {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      require(CATALOG);
    }).not.toThrow();
  });

  it('runs to completion', () => {
    expect(result.out).not.toMatch(/Missing English extracted directions/);
    expect(result.out).toMatch(/parity OK|parity failed/);
  });

  it('passes with no mirror drift and no placeholder mismatch', () => {
    expect(result.out, result.out.slice(0, 2000)).toMatch(/parity OK/);
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/mirror drift\s*:\s*none/);
    expect(result.out).toMatch(/placeholder integrity\s*:\s*ok/);
  });

  it('keeps the translation backlog recorded and non-growing', () => {
    expect(existsSync(BASELINE)).toBe(true);
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
    expect(Array.isArray(baseline.missing)).toBe(true);
    // A ratchet: this number may be lowered as translations land, never raised.
    // If a legitimate new English key needs queuing, re-record with --update and
    // update this ceiling in the same change so the growth is deliberate.
    expect(baseline.missing.length).toBeLessThanOrEqual(2520);
  });

  it('covers every directions key used by the directions view', () => {
    // The four keys whose absence broke the gate. Each call site carries its
    // English inline; the catalog has to agree or the module throws.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const catalog = require(CATALOG);
    for (const key of ['directions.choice', 'directions.map_choose_station',
      'directions.single_choice_hint', 'directions.single_choice_selected']) {
      expect(catalog.DIRECTION_KEYS, `catalog must know ${key}`).toContain(key);
    }
  });

  it('declares English that matches what the view actually renders', () => {
    // The catalog's English is what ships to translators AND what the parity
    // gate compares every pack against. If it drifts from the inline fallback,
    // 63 packs get a localised string students never see. Checked against the
    // .jsx source and the built module, since those can drift from each other.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const catalog = require(CATALOG);
    const views = ['view_directions_result_source.jsx', 'view_directions_result_module.js']
      .map((f) => [f, readFileSync(resolve(process.cwd(), f), 'utf8')]);

    for (const key of catalog.DIRECTION_KEYS) {
      const short = key.slice('directions.'.length);
      const declared = catalog.EXTRACTED_VIEW_ADDITIONS.directions[short];
      expect(declared, `catalog English for ${key}`).toBeTypeOf('string');

      for (const [file, src] of views) {
        // Match a real call site — text('directions.x', 'English') — not the
        // view's own alias map, where the same literal appears as a VALUE
        // (`choiceHint: 'directions.choice_hint'`) with no English after it.
        const call = new RegExp(
          `text\\(\\s*'${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}'\\s*,\\s*'((?:[^'\\\\]|\\\\.)*)'`,
        ).exec(src);
        if (!call) continue; // reached via an alias; DIRECTION_KEYS covers it
        const fallback = call[1].replace(/\\'/g, "'");
        expect(fallback, `${file} fallback for ${key} must match the catalog`).toBe(declared);
      }
    }
  });
});
