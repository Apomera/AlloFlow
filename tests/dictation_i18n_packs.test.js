// Wave 3 + Wave 4 + Wave 5 localization contract for Dictation Studio & Read-Along
// Handoff strings across ALL 63/63 repo lang/*.js packs (63 × 77 = 4,851 entries).
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();

const ALL_PACKS = readdirSync(resolve(ROOT, 'lang'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => name.slice(0, -3))
  .sort();

const CJK_PACKS = new Set(['chinese_simplified', 'chinese_traditional', 'japanese']);

const REGIONAL_PAIRS = [
  ['spanish_latin_america', 'spanish_castilian'],
  ['french', 'french_canadian'],
  ['chinese_simplified', 'chinese_traditional'],
  ['dari', 'farsi'],
  ['chin_falam', 'chin_hakha'],
  ['portuguese_portugal', 'portuguese_angola'],
  ['portuguese_portugal', 'portuguese_brazil'],
];

const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const WAVE_KEY_PATTERNS = [
  /^dictation\./,
  /^input\.dictate_or_record$/,
  /^input\.actions\.dictate_hint$/,
  /^wizard\.dictate_/,
  /^wizard\.words_dictated_unit$/,
  /^source_view\.(dictate|close_dictate|send_read_along|upload_verify_banner|clear_audio)$/,
  /^large_file\.engine_legend$/,
  /^toasts\.(sent_to_read_along|read_along_handoff_failed|read_along_no_text)$/,
];

function flatten(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj || {})) {
    const id = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, id, out);
    } else {
      out.set(id, value);
    }
  }
  return out;
}

function extractPlaceholders(text) {
  return (String(text).match(/\{[^{}]+\}/g) || []).sort();
}

function sha256File(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

const englishRaw = readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8');
const englishFlat = flatten(JSON.parse(englishRaw));
const waveKeys = [...englishFlat.keys()].filter(
  (id) => typeof englishFlat.get(id) === 'string' && WAVE_KEY_PATTERNS.some((re) => re.test(id))
);

const loadedPacks = new Map();
function getPackFlat(slug) {
  if (!loadedPacks.has(slug)) {
    const raw = readFileSync(resolve(ROOT, 'lang', `${slug}.js`), 'utf8');
    loadedPacks.set(slug, flatten(JSON.parse(raw)));
  }
  return loadedPacks.get(slug);
}

describe('63-Language Dictation Studio & Read-Along Handoff i18n parity', () => {
  it('discovers all 63 lang/*.js packs and extracts the full 77-key English set (4,851 entries)', () => {
    const dictationKeys = waveKeys.filter((k) => k.startsWith('dictation.'));
    expect(dictationKeys).toHaveLength(61);
    expect(waveKeys).toHaveLength(77);
    expect(ALL_PACKS).toHaveLength(63);
    expect(ALL_PACKS.length * waveKeys.length).toBe(4851);
    for (const key of waveKeys) {
      expect(typeof englishFlat.get(key), key).toBe('string');
      expect(englishFlat.get(key).trim().length, key).toBeGreaterThan(0);
    }
  });

  it.each(ALL_PACKS)(
    'lang/%s.js parses cleanly and localizes 100% of Wave 1 & Wave 2 keys with exact placeholder parity',
    (slug) => {
      const pack = getPackFlat(slug);

      const missing = [];
      const empty = [];
      const sameAsEnglish = [];
      const placeholderMismatch = [];
      const unbalancedBraces = [];
      const cjkPeriodStubs = [];

      for (const key of waveKeys) {
        const enVal = englishFlat.get(key);
        const val = pack.get(key);
        if (typeof val !== 'string') {
          missing.push(key);
          continue;
        }
        if (!val.trim()) {
          empty.push(key);
          continue;
        }
        if (val.trim() === enVal.trim()) {
          sameAsEnglish.push(key);
        }
        const enPh = extractPlaceholders(enVal).join('|');
        const locPh = extractPlaceholders(val).join('|');
        if (enPh !== locPh) {
          placeholderMismatch.push(`${key}: expected [${enPh}] got [${locPh}]`);
        }
        const openCount = (val.match(/\{/g) || []).length;
        const closeCount = (val.match(/\}/g) || []).length;
        if (openCount !== closeCount) {
          unbalancedBraces.push(key);
        }
        if (CJK_PACKS.has(slug) && val === `${enVal}。`) {
          cjkPeriodStubs.push(key);
        }
      }

      expect(missing, `${slug} missing keys`).toEqual([]);
      expect(empty, `${slug} empty strings`).toEqual([]);
      expect(sameAsEnglish, `${slug} untranslated English stubs`).toEqual([]);
      expect(placeholderMismatch, `${slug} placeholder mismatch`).toEqual([]);
      expect(unbalancedBraces, `${slug} unbalanced braces`).toEqual([]);
      expect(cjkPeriodStubs, `${slug} CJK English+full-stop stubs`).toEqual([]);
    }
  );

  it.each(REGIONAL_PAIRS)(
    'differentiates regional language variants (%s vs %s)',
    (slugA, slugB) => {
      const packA = getPackFlat(slugA);
      const packB = getPackFlat(slugB);
      const distinct = waveKeys.filter((k) => packA.get(k) !== packB.get(k));
      expect(distinct.length).toBeGreaterThanOrEqual(25);
    }
  );

  it.each(ALL_PACKS)(
    'lang/%s.js matches all 3 desktop mirror destinations byte-for-byte (4/4 SHA-256 parity)',
    (slug) => {
      const rel = `lang/${slug}.js`;
      const rootHash = sha256File(resolve(ROOT, rel));
      let checkedMirrors = 0;
      for (const dir of MIRROR_DIRS) {
        const dest = resolve(ROOT, dir, rel);
        expect(existsSync(resolve(ROOT, dir)), `missing mirror root ${dir}`).toBe(true);
        expect(existsSync(dest), `missing mirror ${dir}/${rel}`).toBe(true);
        expect(sha256File(dest), `mirror drift in ${dir}/${rel}`).toBe(rootHash);
        checkedMirrors++;
      }
      expect(checkedMirrors).toBe(MIRROR_DIRS.length);
    }
  );
});
