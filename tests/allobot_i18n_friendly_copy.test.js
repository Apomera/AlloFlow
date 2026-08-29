import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const UI_STRINGS = resolve(ROOT, 'ui_strings.js');
const UI_STRINGS_MIRROR = resolve(ROOT, 'desktop/web-app/public/ui_strings.js');
const LOCALES = resolve(ROOT, 'lang');
const LOCALE_MIRRORS = resolve(ROOT, 'desktop/web-app/public/lang');
const I18N = resolve(ROOT, 'dev-tools/i18n');
const KEY = 'practice_across_alloflow_counts_here';
const FRIENDLY = 'Your practice across AlloFlow counts here. Even a single mission, problem, or drill in another tool will start unlocking spells here.';
const LEGACY_KEY = 'allobot_is_watching_your_progress_ever';
const LEGACY_COPY = 'AlloBot is watching your progress everywhere';

function readJson(file) {
  return readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function findValue(node) {
  if (!node || typeof node !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(node, KEY)) return node[KEY];
  for (const value of Object.values(node)) {
    const found = findValue(value);
    if (found !== undefined) return found;
  }
  return undefined;
}

function expectCanonicalCopySource(text, label, expectedKeyCount = 1) {
  expect(text, label).not.toContain(LEGACY_KEY);
  expect(text, label).not.toContain(LEGACY_COPY);
  expect(text.split('"' + KEY + '"').length - 1, label).toBe(expectedKeyCount);
}

describe('AlloBot friendly-copy translation contract', () => {
  it('uses friendly copy in the runtime dictionaries and every locale mirror', () => {
    const uiStringsText = readJson(UI_STRINGS);
    expect(readJson(UI_STRINGS_MIRROR)).toBe(uiStringsText);
    expectCanonicalCopySource(uiStringsText, 'ui_strings.js');
    const uiStrings = JSON.parse(uiStringsText);
    expect(findValue(uiStrings)).toBe(FRIENDLY);

    const locales = readdirSync(LOCALES).filter((name) => name.endsWith('.js')).sort();
    expect(locales).toHaveLength(63);
    for (const name of locales) {
      const rootText = readJson(resolve(LOCALES, name));
      expect(readJson(resolve(LOCALE_MIRRORS, name)), name).toBe(rootText);
      expectCanonicalCopySource(rootText, name);
      const rootPack = JSON.parse(rootText);
      const value = findValue(rootPack);
      expect(value, name).toEqual(expect.any(String));
      expect(value.trim(), name).not.toBe('');
      expect(value, name).not.toContain('AlloBot');
    }
  }, 30_000);

  it('keeps English authoring, translation memory, handoffs, and staleness hash aligned', () => {
    const englishSource = readJson(resolve(I18N, 'stem_allobotsage_en.json'));
    expectCanonicalCopySource(englishSource, 'stem_allobotsage_en.json');
    expect(findValue(JSON.parse(englishSource))).toBe(FRIENDLY);

    const memories = readdirSync(resolve(I18N, 'tm_allobotsage')).filter((name) => name.endsWith('.json'));
    expect(memories).toHaveLength(50);
    for (const name of memories) {
      const text = readJson(resolve(I18N, 'tm_allobotsage', name));
      expectCanonicalCopySource(text, name);
      expect(findValue(JSON.parse(text)), name).toBe(FRIENDLY);
    }

    const handoffs = readdirSync(I18N)
      .filter((name) => name.startsWith('handtl_allobotsage_') && name.endsWith('.json'));
    let coveredHandoffs = 0;
    const partialHandoffs = [];
    for (const name of handoffs) {
      const text = readJson(resolve(I18N, name));
      expect(text, name).not.toContain(LEGACY_KEY);
      expect(text, name).not.toContain(LEGACY_COPY);
      const value = findValue(JSON.parse(text));
      if (value === undefined) {
        partialHandoffs.push(name);
        expect(text.split('"' + KEY + '"').length - 1, name).toBe(0);
        continue;
      }
      coveredHandoffs += 1;
      expect(text.split('"' + KEY + '"').length - 1, name).toBe(1);
      expect(value.trim(), name).not.toBe('');
      expect(value, name).not.toContain('AlloBot');
    }
    expect(coveredHandoffs).toBe(58);
    expect(partialHandoffs).toEqual(['handtl_allobotsage_dari_afghan.json']);

    const baselineText = readJson(resolve(I18N, 'lang_source_baseline.json'));
    expect(baselineText).not.toContain(LEGACY_KEY);
    expect(baselineText).not.toContain(LEGACY_COPY);
    expect(baselineText.split(KEY).length - 1).toBe(1);
    const baseline = JSON.parse(baselineText);
    const expectedHash = createHash('sha1').update(FRIENDLY).digest('hex').slice(0, 12);
    expect(baseline['stem.allobotsage.' + KEY]).toBe(expectedHash);

    for (const file of ['stem_lab/stem_tool_allobotsage.js', 'desktop/web-app/public/stem_lab/stem_tool_allobotsage.js']) {
      const source = readJson(resolve(ROOT, file));
      expect(source, file).not.toContain(LEGACY_KEY);
      expect(source, file).not.toContain(LEGACY_COPY);
      expect(source.split(KEY).length - 1, file).toBe(1);
    }
  }, 30_000);
});
