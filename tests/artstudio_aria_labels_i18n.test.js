import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Accessible names had the same gap the announcements had: 120 of Art Studio's
// aria-labels never reached the translator, so a screen-reader user working in
// another language heard English control names from a translated tool.
//
// Written after the announcement gate turned out to be blind, so it looks at
// both quoting styles and carries its own calibration.
const copies = [
  'stem_lab/stem_tool_artstudio.js',
  'desktop/web-app/public/stem_lab/stem_tool_artstudio.js',
];
// A label whose value is a COMPLETE literal: the next thing after the closing
// quote is , } or ), never a + (that would be an assembled label).
const COMPLETE_BARE = /["']aria-label["']\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*[,}\)]/g;
const ASSEMBLED = /["']aria-label["']\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\+/g;
const wordy = (lit) => /[A-Za-z]{3}/.test(lit);

describe('Art Studio accessible names reach the translator', () => {
  for (const file of copies) {
    it(file + ' has no complete aria-label left as a bare literal', () => {
      const src = readFileSync(file, 'utf8');
      const bare = (src.match(COMPLETE_BARE) || []).filter(wordy);
      expect(bare).toEqual([]);
    });
  }

  it('is calibrated: it catches a bare label and ignores a keyed one', () => {
    const bare = (`{ "aria-label": "Save current study" }`.match(COMPLETE_BARE) || []).filter(wordy);
    expect(bare).toHaveLength(1);
    const keyed = (`{ "aria-label": __alloT('stem.artstudio.a11y_x', 'Save current study') }`.match(COMPLETE_BARE) || []).filter(wordy);
    expect(keyed).toHaveLength(0);
    // An assembled label is a different shape and is not counted as complete.
    const assembled = (`{ "aria-label": "Choose " + name }`.match(COMPLETE_BARE) || []).filter(wordy);
    expect(assembled).toHaveLength(0);
  });

  it('registers every keyed label in all three English registries', () => {
    const src = readFileSync(copies[0], 'utf8');
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.artstudio;
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_artstudio_en.json', 'utf8'));
    const keys = [...src.matchAll(/__alloT\('stem\.artstudio\.(a11y_[a-z0-9_]+)'\s*,/g)].map((m) => m[1]);
    expect(new Set(keys).size).toBeGreaterThanOrEqual(73);
    for (const key of new Set(keys)) {
      expect(section[key], key).toBeTruthy();
      expect(mirror[key], key).toBe(section[key]);
      expect(catalog[key], key).toBe(section[key]);
    }
  });

  it('records the labels still assembled from a prefix and a value', () => {
    const src = readFileSync(copies[0], 'utf8');
    const assembled = (src.match(ASSEMBLED) || []).filter(wordy);
    // What is left picks an English word inside the expression -- a 'near'
    // default, a running/paused ternary -- so each needs its own key on top of
    // a template. Lower the bound as they are done, and delete this test at
    // zero.
    expect(assembled.length).toBeGreaterThan(0);
    expect(assembled.length).toBeLessThanOrEqual(6);
  });

  it('keys the words it chooses, not just the sentence around them', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    // A state word and an enumerated member are both translatable.
    expect(section.a11y_state_paused).toBe('paused');
    expect(section.a11y_state_playing).toBe('playing');
    expect(section.a11y_depth_near).toBe('near');
    expect(section.a11y_tess_shape_hexagon).toBe('hexagon');
    // Optional clauses are their own strings, not glued fragments.
    expect(section.a11y_part_suffix_hidden).toBe(', hidden');
    expect(section.a11y_part_suffix_locked).toBe(', locked');
  });

  it('templates the labels that carry only values', () => {
    const src = readFileSync(copies[0], 'utf8');
    const templated = src.match(/["']aria-label["']\s*:\s*formatArtStudioLearningText\(/g) || [];
    expect(templated.length).toBeGreaterThanOrEqual(30);
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    expect(section.a11y_mixture_preview).toBe('Mixture preview: {value1}');
    expect(section.a11y_current_pigment_character).toBe('Current pigment character: {value1}');
  });
});
