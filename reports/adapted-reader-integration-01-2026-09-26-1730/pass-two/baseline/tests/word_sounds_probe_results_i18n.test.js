// PROBE-RESULTS LOCALIZATION + SURFACE PARITY.
//
// Word Sounds has TWO probe summary surfaces:
//   * renderProbeResults        — shown when a SEQUENTIAL-mode probe exhausts
//                                 its queue (setShowProbeResults(true))
//   * the showSessionComplete panel — the ordinary probe-completion path
//
// They report the same measures, so they must say the same things in the same
// language. renderProbeResults was written with every label hardcoded in
// English — including three strings whose i18n keys already existed and were
// already translated in the language packs — so a teacher running a probe in
// Spanish got an English results screen on that path only.
//
// CSV column headers are deliberately NOT localized: the export is
// machine-readable and stable headers matter more for spreadsheet/SIS import
// than translation. That choice is pinned here so it reads as intentional.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let mod, probeView, alloData;

beforeAll(() => {
  mod = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
  alloData = readFileSync(resolve(process.cwd(), 'allo_data_source.jsx'), 'utf8');
  const start = mod.indexOf('const renderProbeResults = () => {');
  expect(start, 'renderProbeResults not found').toBeGreaterThan(0);
  // Cut at the CSV builder's end so we test the RENDER body, then run to the
  // close of the function.
  const end = mod.indexOf('React.useEffect(', start);
  probeView = mod.slice(start, end);
});

const VISIBLE_LABELS = [
  ['word_sounds.items_attempted', 'Items Attempted'],
  ['word_sounds.items_correct', 'Items Correct'],
  ['word_sounds.accuracy', 'Accuracy'],
  ['word_sounds.items_per_min', 'Items / Min'],
  ['word_sounds.accuracy_by_difficulty', 'Accuracy by word difficulty'],
  ['word_sounds.band_compare_caveat', 'Compare like with like'],
  ['word_sounds.duration_label', 'Duration: '],
  ['word_sounds.download_csv', 'Download CSV'],
  ['word_sounds.grade_label', 'Grade '],
];

describe('the sequential-probe results screen is localized', () => {
  for (const [key, english] of VISIBLE_LABELS) {
    it(`renders ${key} through ts() with an English fallback`, () => {
      expect(probeView, `${key} is not resolved through ts()`).toContain(`ts("${key}")`);
      expect(probeView, `${key} lost its English fallback`).toContain(english);
    });
  }

  it('every key it uses is registered in allo_data so packs can translate it', () => {
    const used = [...new Set((probeView.match(/ts\("(word_sounds\.[a-z_]+)"\)/g) || [])
      .map((m) => m.replace(/ts\("|"\)/g, '')))];
    expect(used.length, 'expected the view to resolve several keys').toBeGreaterThan(5);
    const missing = used.filter((k) => !alloData.includes(`'${k}':`));
    expect(missing, `keys used but never registered: ${missing.join(', ')}`).toEqual([]);
  });

  it('uses the same band labels as the other probe surface', () => {
    // Both panels must name the difficulty bands identically, or the same
    // child's data reads differently depending on how the probe ended.
    for (const key of ['word_sounds.band_cvc_easy', 'word_sounds.band_medium', 'word_sounds.band_hard']) {
      expect(probeView, `${key} missing from the sequential-probe panel`).toContain(key);
    }
    const sessionPanel = mod.slice(mod.indexOf('band_compare_caveat', mod.indexOf('showSessionComplete')));
    expect(sessionPanel).toContain('word_sounds.band_cvc_easy');
  });
});

describe('CSV export stays machine-readable', () => {
  it('keeps stable English column headers', () => {
    // Intentional: spreadsheet and SIS imports key on these names.
    for (const header of ['"Grade"', '"Activity"', '"Accuracy %"', '"Items/Min"', '"Duration (s)"']) {
      expect(probeView, `CSV header ${header} changed — downstream imports key on it`).toContain(header);
    }
  });

  it('does not route CSV headers through ts()', () => {
    expect(probeView).not.toMatch(/headers[\s\S]{0,200}ts\(/);
  });
});
