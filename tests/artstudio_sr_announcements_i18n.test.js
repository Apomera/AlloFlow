import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Art Studio announced 51 screen-reader messages as bare English literals
// while the visible UI was translated, so a blind learner working in another
// language heard English. Static announcements now go through __alloT with
// their English as the fallback, which is why the strings other suites pin
// still read the same.
//
// The 30 announcements built by concatenation ("... at column " + n) need
// placeholder keys and are a separate pass; this gate deliberately allows
// them so it stays honest about what is done.
const copies = [
  'stem_lab/stem_tool_artstudio.js',
  'desktop/web-app/public/stem_lab/stem_tool_artstudio.js',
];
const STATIC_BARE = /announceToSR\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g;
const CONCATENATED = /announceToSR\(\s*'((?:[^'\\]|\\.)*)'\s*\+/g;

describe('Art Studio screen-reader announcements reach the translator', () => {
  for (const file of copies) {
    it(file + ' has no static announcement that skips __alloT', () => {
      const src = readFileSync(file, 'utf8');
      const bare = src.match(STATIC_BARE) || [];
      expect(bare, 'bare static announcements').toEqual([]);
    });
  }

  it('routes every static announcement through a stem.artstudio key', () => {
    const src = readFileSync(copies[0], 'utf8');
    const wrapped = src.match(/announceToSR\(__alloT\('stem\.artstudio\.[a-z0-9_]+'/g) || [];
    expect(wrapped.length).toBeGreaterThanOrEqual(51);
  });

  it('registers every announcement key in all three English registries', () => {
    const src = readFileSync(copies[0], 'utf8');
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.artstudio;
    const catalog = JSON.parse(readFileSync('dev-tools/i18n/stem_artstudio_en.json', 'utf8'));
    const keys = [...src.matchAll(/announceToSR\(__alloT\('stem\.artstudio\.([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(51);
    for (const key of new Set(keys)) {
      expect(section[key], key).toBeTruthy();
      expect(mirror[key], key).toBe(section[key]);
      expect(catalog[key], key).toBe(section[key]);
    }
  });

  it('interpolates value-only announcements through the translator', () => {
    const src = readFileSync(copies[0], 'utf8');
    const formatted = src.match(/announceToSR\(formatArtStudioLearningText\(__alloT\('stem\.artstudio\.[a-z0-9_]+'/g) || [];
    expect(formatted.length).toBeGreaterThanOrEqual(19);
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.artstudio;
    // Templates keep their placeholders, or the value would never appear.
    expect(section.sr_watercolor_cursor_at_column_row).toBe('Watercolor cursor at column {value1}, row {value2}.');
    expect(section.sr_pixel_row_column).toBe('Pixel row {value1}, column {value2}.');
  });

  it('records the announcements that still splice English words', () => {
    const src = readFileSync(copies[0], 'utf8');
    const concat = src.match(CONCATENATED) || [];
    // These pick an English word with a ternary ("hidden"/"locked",
    // "larger"/"smaller", " part."/" parts."), so each needs its own key.
    // Lower the bound as they are done; at zero, delete this test.
    expect(concat.length).toBeGreaterThan(0);
    expect(concat.length).toBeLessThanOrEqual(11);
  });
});
