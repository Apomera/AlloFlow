// Unit tests for the §2 reading-order + §3 per-span-language deterministic cores
// (2026-06-14). These are the CI-testable "code-executes / accept-or-revert" halves
// of Beat-Adobe-on-3; the vision passes that produce the order + the per-span lang
// are Canvas-only and wired into the pipeline later (not here).

import { describe, it, expect } from 'vitest';
import { isSingleColumn, simpleReadingOrder, validateReadingOrder, applyReadingOrder } from './lib/reading_order.js';
import { detectScripts, dominantScript, scriptLangHint, isRtlScript, isValidBcp47, reconcileSpanLang } from './lib/lang_dispatch.js';

const blk = (id, x, y, w, h) => ({ id, x, y, w, h });

describe('reading order — column gate', () => {
  it('a single stacked column is single-column', () => {
    const blocks = [blk('a', 0, 0, 100, 10), blk('b', 0, 20, 100, 10), blk('c', 0, 40, 100, 10)];
    expect(isSingleColumn(blocks, 100)).toBe(true);
  });
  it('two side-by-side columns are NOT single-column', () => {
    const blocks = [blk('L1', 0, 0, 40, 10), blk('L2', 0, 20, 40, 10), blk('R1', 60, 0, 40, 10), blk('R2', 60, 20, 40, 10)];
    expect(isSingleColumn(blocks, 100)).toBe(false);
  });
  it('a ragged single column (varying widths, no side-by-side) stays single-column', () => {
    const blocks = [blk('a', 0, 0, 80, 10), blk('b', 0, 20, 50, 10), blk('c', 0, 40, 95, 10)];
    expect(isSingleColumn(blocks, 100)).toBe(true);
  });
  it('fewer than 2 blocks is single-column', () => {
    expect(isSingleColumn([blk('a', 0, 0, 10, 10)], 100)).toBe(true);
    expect(isSingleColumn([], 100)).toBe(true);
  });
});

describe('reading order — fallback order + accept-or-revert', () => {
  it('simple order is top-to-bottom then left-to-right', () => {
    const blocks = [blk('c', 0, 40, 10, 10), blk('a', 0, 0, 10, 10), blk('b2', 50, 0, 10, 10), blk('b1', 0, 0, 10, 10)];
    expect(simpleReadingOrder(blocks)).toEqual(['a', 'b1', 'b2', 'c']);
  });
  it('validates a correct permutation', () => {
    expect(validateReadingOrder(['a', 'b', 'c'], ['c', 'b', 'a']).ok).toBe(true);
  });
  it('rejects missing / extra / duplicate / unknown ids', () => {
    expect(validateReadingOrder(['a', 'b'], ['a', 'b', 'c']).ok).toBe(false); // length
    expect(validateReadingOrder(['a', 'a', 'c'], ['a', 'b', 'c']).reason).toMatch(/duplicate/);
    expect(validateReadingOrder(['a', 'b', 'z'], ['a', 'b', 'c']).reason).toMatch(/unknown/);
    expect(validateReadingOrder('nope', ['a']).ok).toBe(false);
  });
  it('applies an order, dropping ids with no block', () => {
    const blocks = [blk('a', 0, 0, 10, 10), blk('b', 0, 10, 10, 10)];
    expect(applyReadingOrder(blocks, ['b', 'a']).map((x) => x.id)).toEqual(['b', 'a']);
    expect(applyReadingOrder(blocks, ['b', 'ghost', 'a']).map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('language — script detection', () => {
  it('detects scripts present', () => {
    expect(detectScripts('hello')).toEqual(['Latin']);
    expect(detectScripts('مرحبا')).toContain('Arabic');
    expect(detectScripts('مرحبا hello')).toEqual(expect.arrayContaining(['Arabic', 'Latin']));
  });
  it('dominantScript picks the most frequent', () => {
    expect(dominantScript('hello мир мир мир')).toBe('Cyrillic');
  });
  it('scriptLangHint only fires for ~1:1 scripts, null for ambiguous', () => {
    expect(scriptLangHint('안녕하세요')).toBe('ko');
    expect(scriptLangHint('สวัสดี')).toBe('th');
    expect(scriptLangHint('مرحبا')).toBe(null);   // Arabic script ≠ one language
    expect(scriptLangHint('hello')).toBe(null);   // Latin ≠ one language
  });
  it('isRtlScript flags Arabic/Hebrew', () => {
    expect(isRtlScript('مرحبا بالعالم')).toBe(true);
    expect(isRtlScript('hello world')).toBe(false);
  });
});

describe('language — BCP-47 validation', () => {
  it('accepts well-formed tags', () => {
    ['en', 'es', 'es-MX', 'zh-Hant', 'ar-EG', 'pt-BR'].forEach((t) => expect(isValidBcp47(t)).toBe(true));
  });
  it('rejects malformed tags', () => {
    ['e', 'english', '123', '', null, 'en_US'].forEach((t) => expect(isValidBcp47(t)).toBe(false));
  });
});

describe('language — GlotLID guardrail decision policy', () => {
  it('skips a sub-2-char span', () => {
    expect(reconcileSpanLang({ text: 'x', vlmLang: 'en' }).action).toBe('skip-too-short');
  });
  it('trusts the VLM on short spans (LID-unreliable zone)', () => {
    const r = reconcileSpanLang({ text: 'Bonjour', vlmLang: 'fr', lidLang: 'en', lidConfidence: 0.95 });
    expect(r.action).toBe('trust-vlm');
    expect(r.lang).toBe('fr');
  });
  it('splits a mixed-script line', () => {
    const r = reconcileSpanLang({ text: 'مرحبا بالعالم привет мир друзья', vlmLang: 'ar' });
    expect(r.action).toBe('split');
  });
  it('re-asks only on a LONG span where a CONFIDENT LID disagrees with the VLM', () => {
    const long = 'This is a sufficiently long English sentence for language identification.';
    expect(reconcileSpanLang({ text: long, vlmLang: 'en', lidLang: 'fr', lidConfidence: 0.95 }).action).toBe('reask');
    // agreement → trust
    expect(reconcileSpanLang({ text: long, vlmLang: 'en', lidLang: 'en', lidConfidence: 0.95 }).action).toBe('trust-vlm');
    // low-confidence LID disagreement → trust the VLM, do NOT re-ask
    expect(reconcileSpanLang({ text: long, vlmLang: 'en', lidLang: 'fr', lidConfidence: 0.4 }).action).toBe('trust-vlm');
  });
  it('falls back to a script hint when the VLM gave no lang', () => {
    const long = '안녕하세요 여러분 오늘은 정말 좋은 날입니다 함께 공부해요';
    const r = reconcileSpanLang({ text: long });
    expect(r.lang).toBe('ko');
    expect(r.action).toBe('trust-vlm');
  });
});
