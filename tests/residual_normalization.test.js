// Residual-diff normalization (2026-06-23): the round-trip "residual missing" count drives the Tier-B
// "Re-run with restoration" UI. _normTokenForDiff folds COSMETIC rendering variants (the same word
// rendered with different code points) so they aren't false-flagged "missing" — shrinking the residual
// count and the NEED to restore, with ZERO document change (this is measurement only). This extracts the
// real _normTokenForDiff and proves it folds the safe classes (ligatures, zero-width, smart quotes, hyphen
// variants) WITHOUT merging genuinely distinct words (the resign/re-sign / en-em-dash exclusions).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('const _normTokenForDiff = (t) => String(t');
const _tail = ".replace(/\\s+/g, '');";
const _e = dp.indexOf(_tail, _s) + _tail.length;
if (_s === -1 || _e < _tail.length) throw new Error('extraction markers for _normTokenForDiff missing');
const norm = new Function(dp.slice(_s, _e) + '\nreturn _normTokenForDiff;')();
const C = (n) => String.fromCharCode(n);

describe('_normTokenForDiff folds cosmetic rendering variants (shrinks FALSE residuals)', () => {
  it('ligatures decompose: "ﬁle" matches "file"', () => {
    expect(norm(C(0xfb01) + 'le')).toBe(norm('file'));
    expect(norm('a' + C(0xfb02) + 'oat')).toBe(norm('afloat'));   // fl ligature
  });
  it('smart apostrophe/quotes fold to straight: "don’t" matches "don\'t"', () => {
    expect(norm('don' + C(0x2019) + 't')).toBe(norm("don't"));
    expect(norm(C(0x201c) + 'quoted' + C(0x201d))).toBe(norm('"quoted"'));
  });
  it('zero-width chars + BOM are stripped: "he<ZWSP>llo" matches "hello"', () => {
    expect(norm('he' + C(0x200b) + 'llo')).toBe(norm('hello'));
    expect(norm(C(0xfeff) + 'word')).toBe(norm('word'));
  });
  it('hyphen-variant line-break splits fold: "co‑operate" (U+2010) matches "cooperate"', () => {
    expect(norm('co' + C(0x2010) + 'operate')).toBe(norm('cooperate'));
    expect(norm('co' + C(0x2011) + 'operate')).toBe(norm('cooperate')); // non-breaking hyphen
  });
});

describe('_normTokenForDiff does NOT merge genuinely distinct tokens (the deliberate exclusions)', () => {
  it('distinct words stay distinct', () => {
    expect(norm('cat')).not.toBe(norm('dog'));
    expect(norm('enrollment')).not.toBe(norm('graduation'));
  });
  it('en/em-dashes are NOT folded (they join distinct tokens, not line-break hyphens)', () => {
    // "re—sign" with an em-dash must NOT collapse to "resign"
    expect(norm('re' + C(0x2014) + 'sign')).not.toBe(norm('resign'));
    expect(norm('re' + C(0x2013) + 'sign')).not.toBe(norm('resign')); // en-dash
  });
});

describe('anti-drift: the folds use \\u escapes (no fragile invisible literals) on the live path', () => {
  const fn = dp.slice(_s, _e);
  it('ligature + zero-width + smart-quote + hyphen-variant folds are present as \\u escapes', () => {
    expect(fn).toMatch(/\\ufb01/); expect(fn).toMatch(/\\ufb04/); // ligatures
    expect(fn).toMatch(/\\u200b/); expect(fn).toMatch(/\\ufeff/); // zero-width + BOM
    expect(fn).toMatch(/\\u2018\\u2019/);                          // smart quotes
    expect(fn).toMatch(/\\u00ad\\u2010\\u2011/);                   // hyphen variants in the fold class
  });
  it('deliberately does NOT fold en/em-dash or numeric separators', () => {
    expect(fn).not.toMatch(/\\u2013/); // en-dash
    expect(fn).not.toMatch(/\\u2014/); // em-dash
  });
});
