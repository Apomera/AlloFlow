import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Art Studio's SCREEN-READER channel has had a registry gate for a while
 * (tests/artstudio_sr_announcements_i18n.test.js) and it earned its keep -- it
 * caught two keys shipped with an English fallback but no registry entry on
 * 2026-09-21. The VISIBLE toast channel had no such gate, which is part of how
 * 58 of its 63 calls came to hold bare English in the first place.
 *
 * An unregistered key is invisible in English forever: __alloT returns the
 * fallback, so the tool looks correct while every other language gets English.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const REGISTRIES = [
  ['ui_strings.js', (j) => j.stem.artstudio],
  ['desktop/web-app/public/ui_strings.js', (j) => j.stem.artstudio],
  ['dev-tools/i18n/stem_artstudio_en.json', (j) => j],
];

const src = fs.readFileSync(SOURCE, 'utf8');

// Each registry is ~8.7 MB. Parsing them per-test put this file within range
// of the vitest 5000ms default -- measured 618-1441ms normally, but 5284ms under
// load, which failed the run. Parse once at module scope instead; that fixes
// the cost rather than raising a timeout around it.
const LOADED = REGISTRIES.map(([file, pick]) => ({
  file,
  section: pick(JSON.parse(fs.readFileSync(path.join(process.cwd(), file), 'utf8'))),
}));
const ROOT_SECTION = LOADED[0].section;
const used = [...new Set([...src.matchAll(/stem\.artstudio\.(toast_[a-z0-9_]+)/g)].map((m) => m[1]))];

describe('Art Studio toast keys reach the translator', () => {
  it('finds the toast keys at all (the gate is not vacuous)', () => {
    // If a refactor renames the key prefix, this file must fail loudly
    // rather than quietly checking an empty list.
    expect(used.length).toBeGreaterThan(40);
  });

  for (const { file, section } of LOADED) {
    it('registers every toast key in ' + file, () => {
      const missing = used.filter((k) => !section[k]);
      expect(missing, 'these keys render their English fallback in every language').toEqual([]);
    });
  }

  it('keeps the three registries in agreement on every toast string', () => {
    const [root, mirror, catalog] = LOADED.map((entry) => entry.section);
    for (const key of used) {
      expect(mirror[key], key + ' disagrees between root and the web-app mirror').toBe(root[key]);
      expect(catalog[key], key + ' disagrees between root and the translator catalog').toBe(root[key]);
    }
  });

  it('formats every placeholder toast through formatArtStudioLearningText', () => {
    // A {value1} that never reaches the formatter ships to the student
    // literally -- "Keyframe {value1} captured!" on screen.
    const root = ROOT_SECTION;
    const placeholder = used.filter((k) => /\{value\d+\}/.test(root[k] || ''));
    expect(placeholder.length, 'no placeholder toasts found -- gate would be vacuous').toBeGreaterThan(0);
    const unformatted = [];
    for (const key of placeholder) {
      const needle = "stem.artstudio." + key;
      let at = src.indexOf(needle);
      while (at !== -1) {
        if (!src.slice(Math.max(0, at - 60), at).includes('formatArtStudioLearningText')) unformatted.push(key);
        at = src.indexOf(needle, at + 1);
      }
    }
    expect([...new Set(unformatted)], 'a raw {value1} would be shown to the student').toEqual([]);
  });

  it('has no registered toast key that nothing uses', () => {
    // An orphan is translation work spent on a string no student will see,
    // and usually means a call site was deleted or a key was renamed.
    const root = ROOT_SECTION;
    const usedSet = new Set(used);
    const orphans = Object.keys(root).filter((k) => k.startsWith('toast_') && !usedSet.has(k));
    expect(orphans).toEqual([]);
  });
});
