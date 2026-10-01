// Unit tests for window.AlloLangMatcher (language_matcher_module.js).
//
// The matcher canonicalizes free-text language input ("spanis", "soomaali",
// "中文", "Spanish (Latin America)") into a pack slug + display name before the
// runtime fetches a translation pack. A bug here means a user gets the wrong
// pack or no translation at all — so it's worth pinning.
//
// `match()` is async only because it lazy-loads /lang/manifest.json over the
// network. We stub `fetch` to reject so the manifest stays empty and the
// matcher works deterministically on its built-in ALIASES table (which is the
// path that matters for the alias-exact / display-exact / fuzzy cases below).

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let M;
beforeAll(() => {
  // Force offline so _loadManifest() falls back to ALIASES-only (no real network).
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline-test')));
  loadAlloModule('language_matcher_module.js');
  M = window.AlloLangMatcher;
  if (!M) throw new Error('AlloLangMatcher failed to register');
});
afterAll(() => { vi.unstubAllGlobals(); });

describe('_normalize', () => {
  it('lowercases, trims, and collapses whitespace/hyphens/underscores to single spaces', () => {
    expect(M._normalize('  French - Canadian ')).toBe('french canadian');
    expect(M._normalize('French_Canadian')).toBe('french canadian');
    expect(M._normalize('SPANISH')).toBe('spanish');
  });
  it('strips punctuation but keeps letters (including accented + non-Latin scripts)', () => {
    expect(M._normalize('Español!')).toBe('español');
    expect(M._normalize('中文')).toBe('中文');
    expect(M._normalize('kreyòl,')).toBe('kreyòl');
  });
  it('handles null / empty input', () => {
    expect(M._normalize(null)).toBe('');
    expect(M._normalize(undefined)).toBe('');
    expect(M._normalize('')).toBe('');
  });
});

describe('_slugify', () => {
  it('lowercases, drops parentheses, and underscores spaces', () => {
    expect(M._slugify('Spanish (Latin America)')).toBe('spanish_latin_america');
    expect(M._slugify('Chinese (Simplified)')).toBe('chinese_simplified');
    expect(M._slugify('Haitian Creole')).toBe('haitian_creole');
    expect(M._slugify('Portuguese (Brazil)')).toBe('portuguese_brazil');
  });
});

describe('_lev (Levenshtein distance)', () => {
  it('is zero for identical strings', () => {
    expect(M._lev('abc', 'abc')).toBe(0);
    expect(M._lev('', '')).toBe(0);
  });
  it('equals the other string length when one is empty', () => {
    expect(M._lev('', 'abc')).toBe(3);
    expect(M._lev('abc', '')).toBe(3);
  });
  it('matches the classic kitten→sitting distance', () => {
    expect(M._lev('kitten', 'sitting')).toBe(3);
    expect(M._lev('flaw', 'lawn')).toBe(2);
  });
});

describe('match() — alias-exact', () => {
  it('maps an English name to its canonical pack with full confidence', async () => {
    const r = await M.match('Spanish');
    expect(r).toMatchObject({
      slug: 'spanish_latin_america',
      display: 'Spanish (Latin America)',
      confidence: 1.0,
      source: 'alias-exact',
    });
  });
  it('is case-insensitive', async () => {
    expect((await M.match('SPANISH')).slug).toBe('spanish_latin_america');
    expect((await M.match('french')).display).toBe('French');
  });
  it('resolves endonyms and native-script names', async () => {
    expect((await M.match('soomaali')).display).toBe('Somali');
    expect((await M.match('kreyòl')).display).toBe('Haitian Creole');
    expect((await M.match('中文')).display).toBe('Chinese (Simplified)');
    expect((await M.match('Mandarin')).display).toBe('Chinese (Simplified)');
    expect((await M.match('日本語')).display).toBe('Japanese');
  });
  it('resolves common misspellings', async () => {
    expect((await M.match('spanis')).display).toBe('Spanish (Latin America)');
    expect((await M.match('portugese')).display).toBe('Portuguese (Brazil)');
    expect((await M.match('somolian')).display).toBe('Somali');
  });
  it('disambiguates locale variants of the same language', async () => {
    expect((await M.match('Castilian')).display).toBe('Spanish (Castilian)');
    expect((await M.match('Mexican Spanish')).display).toBe('Spanish (Latin America)');
    expect((await M.match('Quebecois')).display).toBe('French (Canadian)');
    expect((await M.match('Traditional Chinese')).display).toBe('Chinese (Traditional)');
  });
});

describe('match() — display-name exact', () => {
  it('accepts the canonical display name typed verbatim', async () => {
    const r = await M.match('Spanish (Latin America)');
    expect(r.slug).toBe('spanish_latin_america');
    expect(r.confidence).toBe(1.0);
    expect(r.source).toBe('display-exact');
  });
});

describe('match() — fuzzy fallback', () => {
  it('catches a near-miss typo above the 0.7 similarity threshold', async () => {
    const r = await M.match('frenchh');
    expect(r).not.toBeNull();
    expect(r.display).toBe('French');
    expect(r.source).toBe('fuzzy');
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
    expect(r.confidence).toBeLessThan(1.0);
  });
});

describe('match() — no match / input guards', () => {
  it('returns null for gibberish below threshold', async () => {
    expect(await M.match('xyzqwrtzzz')).toBeNull();
  });
  it('returns null for empty, whitespace, or non-string input', async () => {
    expect(await M.match('')).toBeNull();
    expect(await M.match('   ')).toBeNull();
    expect(await M.match(null)).toBeNull();
    expect(await M.match(undefined)).toBeNull();
    expect(await M.match(42)).toBeNull();
  });
});

describe('knownDisplayNames', () => {
  it('returns a sorted, de-duplicated, non-empty list of canonical names', () => {
    const names = M.knownDisplayNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(50);
    expect(names).toContain('Spanish (Latin America)');
    expect(names).toContain('Somali');
    expect(names).toContain('Haitian Creole');
    expect(names).toEqual([...names].sort()); // sorted
    expect(new Set(names).size).toBe(names.length); // de-duplicated
  });
});

describe('availableSlugs', () => {
  it('resolves to an array (empty when the manifest is unavailable offline)', async () => {
    const slugs = await M.availableSlugs();
    expect(Array.isArray(slugs)).toBe(true);
  });
});
