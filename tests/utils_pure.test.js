// Unit tests for window.AlloModules.UtilsPure.
//
// utils_pure_module exports 14 utilities; these tests cover the pure ones
// (no async / no DOM-fetch). The async fetchers and storageDB IDB wrapper
// are out of scope (would need full network/IDB mocking).

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let UP;
beforeAll(() => {
  loadAlloModule('utils_pure_module.js');
  UP = window.AlloModules.UtilsPure;
  if (!UP) throw new Error('UtilsPure failed to register');
});

describe('safeJsonParse', () => {
  it('returns null for empty / non-string inputs', () => {
    expect(UP.safeJsonParse(null)).toBeNull();
    expect(UP.safeJsonParse(undefined)).toBeNull();
    expect(UP.safeJsonParse('')).toBeNull();
    expect(UP.safeJsonParse(42)).toBeNull();
    expect(UP.safeJsonParse({})).toBeNull();
  });

  it('parses a clean JSON object', () => {
    expect(UP.safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON wrapped in ```json fences (the AI default)', () => {
    expect(UP.safeJsonParse('```json\n{"x": 5}\n```')).toEqual({ x: 5 });
    expect(UP.safeJsonParse('```\n{"y": "hi"}\n```')).toEqual({ y: 'hi' });
  });

  it('parses JSON with extra prose before/after (AI rambling)', () => {
    expect(UP.safeJsonParse('Here you go: {"ok": true}. Hope that helps!')).toEqual({ ok: true });
  });

  it('returns null on unparseable garbage', () => {
    expect(UP.safeJsonParse('this is not json at all')).toBeNull();
  });

  it('returns null on empty object string', () => {
    // cleanJson collapses these to "{}" which then parses to {}, BUT the
    // contract is: empty cleaned ("{}" only) returns null.
    expect(UP.safeJsonParse('{}')).toBeNull();
  });

  it('parses arrays at top level', () => {
    expect(UP.safeJsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('handles trailing commas (common AI mistake)', () => {
    expect(UP.safeJsonParse('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
    expect(UP.safeJsonParse('[1, 2, 3,]')).toEqual([1, 2, 3]);
  });
});

describe('cleanJson', () => {
  it('returns "{}" for empty / falsy inputs', () => {
    expect(UP.cleanJson('')).toBe('{}');
    expect(UP.cleanJson(null)).toBe('{}');
    expect(UP.cleanJson(undefined)).toBe('{}');
  });

  it('strips ```json fences', () => {
    expect(UP.cleanJson('```json\n{"a":1}\n```')).toContain('"a"');
    expect(UP.cleanJson('```json\n{"a":1}\n```')).not.toContain('```');
  });

  it('extracts JSON from text with surrounding prose', () => {
    const r = UP.cleanJson('Here is the result: {"key": "value"} done.');
    expect(JSON.parse(r)).toEqual({ key: 'value' });
  });

  it('removes trailing commas inside objects and arrays', () => {
    expect(JSON.parse(UP.cleanJson('{"a":1,}'))).toEqual({ a: 1 });
    expect(JSON.parse(UP.cleanJson('[1,2,]'))).toEqual([1, 2]);
  });

  it('quotes unquoted keys', () => {
    // AI sometimes outputs JS-style { key: 1 }; cleanJson upgrades to JSON.
    expect(JSON.parse(UP.cleanJson('{a: 1, b: 2}'))).toEqual({ a: 1, b: 2 });
  });

  it('returns "{}" when no JSON-looking content present', () => {
    expect(UP.cleanJson('just some prose with no braces')).toBe('{}');
  });
});

describe('calculateTextEntropy', () => {
  it('returns 0 for empty / non-string inputs', () => {
    expect(UP.calculateTextEntropy('')).toBe(0);
    expect(UP.calculateTextEntropy(null)).toBe(0);
    expect(UP.calculateTextEntropy(123)).toBe(0);
  });

  it('returns 1.0 for entirely unique words', () => {
    expect(UP.calculateTextEntropy('the quick brown fox jumps')).toBe(1);
  });

  it('returns 0.5 for half-repeated words', () => {
    // 4 tokens: cat, dog, cat, dog → 2 unique / 4 total = 0.5
    expect(UP.calculateTextEntropy('cat dog cat dog')).toBe(0.5);
  });

  it('strips punctuation before counting', () => {
    // "hello! hello?" → "hello hello" → 1 unique / 2 = 0.5
    expect(UP.calculateTextEntropy('hello! hello?')).toBe(0.5);
  });
});

describe('validateDraftQuality', () => {
  it('rejects too-short drafts', () => {
    const r = UP.validateDraftQuality('short');
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/short/i);
  });

  it('rejects spammy/repetitive text (entropy < 0.4)', () => {
    // "spam spam spam spam spam spam spam spam spam spam" — 1 unique / 10 = 0.1
    const r = UP.validateDraftQuality('spam spam spam spam spam spam spam spam spam spam spam');
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/repetitive|spammy/i);
  });

  it('accepts reasonable prose', () => {
    const r = UP.validateDraftQuality('The quick brown fox jumps over the lazy dog and runs away into the forest.');
    expect(r.isValid).toBe(true);
    expect(r.error).toBeNull();
  });
});

describe('getAssetManifest', () => {
  it('returns the empty-state placeholder when no assets', () => {
    const r = UP.getAssetManifest([]);
    expect(r).toMatch(/no specific assets/i);
  });

  it('skips lesson-plan, udl-advice, alignment-report, gemini-bridge', () => {
    const r = UP.getAssetManifest([
      { type: 'lesson-plan', title: 'LP1', id: 'a' },
      { type: 'udl-advice', title: 'UA1', id: 'b' },
      { type: 'alignment-report', title: 'AR1', id: 'c' },
      { type: 'gemini-bridge', title: 'GB1', id: 'd' },
    ]);
    expect(r).toMatch(/no specific assets/i);
  });

  it('formats each asset with type tag, title, id, and usage descriptor', () => {
    const r = UP.getAssetManifest([
      { type: 'glossary', title: 'Vocab Set 1', id: 'glos1' },
      { type: 'quiz', title: 'Unit Quiz', id: 'q1' },
    ]);
    expect(r).toContain('[GLOSSARY]');
    expect(r).toContain('"Vocab Set 1"');
    expect(r).toContain('glos1');
    expect(r).toContain('Vocabulary Support');
    expect(r).toContain('[QUIZ]');
    expect(r).toContain('Assessment / Closure');
  });

  it("uses the 'Untitled Resource' fallback when title is missing", () => {
    const r = UP.getAssetManifest([{ type: 'image', id: 'img1' }]);
    expect(r).toContain('Untitled Resource');
  });
});

describe('chunkObject', () => {
  it('chunks an object into pieces of at most maxKeys keys', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
    const r = UP.chunkObject(obj, 2);
    expect(r).toHaveLength(3);
    expect(Object.keys(r[0])).toHaveLength(2);
    expect(Object.keys(r[1])).toHaveLength(2);
    expect(Object.keys(r[2])).toHaveLength(1);
  });

  it('returns one chunk when object fits in maxKeys', () => {
    const obj = { a: 1, b: 2 };
    expect(UP.chunkObject(obj, 5)).toHaveLength(1);
  });

  it('preserves all keys across the chunks', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const chunks = UP.chunkObject(obj, 2);
    const merged = Object.assign({}, ...chunks);
    expect(merged).toEqual(obj);
  });
});

describe('flattenObject + unflattenObject (round-trip)', () => {
  it('flattens nested objects with dot notation', () => {
    const r = UP.flattenObject({ a: { b: { c: 1 } }, d: 2 });
    expect(r).toEqual({ 'a.b.c': 1, d: 2 });
  });

  it('does not flatten arrays', () => {
    const r = UP.flattenObject({ list: [1, 2, 3], n: 5 });
    expect(r.list).toEqual([1, 2, 3]);
    expect(r.n).toBe(5);
  });

  it('round-trips: flatten → unflatten yields original shape', () => {
    const original = { a: { b: { c: 'deep' } }, x: 'top' };
    const r = UP.unflattenObject(UP.flattenObject(original));
    expect(r).toEqual(original);
  });

  it('unflattens a dot-notation map', () => {
    const r = UP.unflattenObject({ 'foo.bar': 1, 'foo.baz': 2, 'top': 3 });
    expect(r).toEqual({ foo: { bar: 1, baz: 2 }, top: 3 });
  });
});

describe('isGoogleRedirect / isYouTubeUrl', () => {
  it('isGoogleRedirect detects google.com/url? redirect URLs', () => {
    expect(UP.isGoogleRedirect('https://www.google.com/url?q=https://example.com')).toBe(true);
    expect(UP.isGoogleRedirect('https://example.com')).toBe(false);
    expect(UP.isGoogleRedirect('')).toBe(false);
  });

  it('isYouTubeUrl detects YouTube watch + youtu.be URLs', () => {
    expect(UP.isYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
    expect(UP.isYouTubeUrl('https://youtu.be/xyz789')).toBe(true);
    expect(UP.isYouTubeUrl('https://example.com')).toBe(false);
  });
});
