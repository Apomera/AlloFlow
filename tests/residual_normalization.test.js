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
// Harness repair (2026-07-09): S7 (@34018900) single-sourced the normalizer — the inline
// `const _normTokenForDiff = (t) => …` became an alias to the module-level canonical
// `_alloNormTokenForDiff`. Extract THAT; the behavior under test is identical.
const _s = dp.indexOf('var _alloNormTokenForDiff = function (t) {');
const _tail = ".replace(/\\s+/g, '');\n};";
const _e = dp.indexOf(_tail, _s) + _tail.length;
if (_s === -1 || _e < _tail.length) throw new Error('extraction markers for _alloNormTokenForDiff missing');
const norm = new Function(dp.slice(_s, _e) + '\nreturn _alloNormTokenForDiff;')();
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

describe('anti-drift: the single-source wiring holds (S7) and dashes stay unfolded', () => {
  const fn = dp.slice(_s, _e);
  // Harness repair (2026-07-09): the old pin asserted \u-escape spelling on the INLINE copy;
  // S7's module-level canonical uses raw literals (legal chars — the escape rule exists for
  // NONCHARACTERS like U+FFFF, not ligatures). The behavioral folds above are the real guard;
  // here we pin only the alias wiring and the deliberate non-folds.
  it('the diff path aliases the canonical normalizer (no second copy to drift)', () => {
    expect(dp).toContain('const _normTokenForDiff = _alloNormTokenForDiff; // S7: single-sourced (module-level canonical copy)');
  });
  it('deliberately does NOT fold en/em-dash (resign vs re-sign class)', () => {
    expect(norm('re–sign')).not.toBe(norm('resign')); // en-dash kept distinct
    expect(norm('re—sign')).not.toBe(norm('resign')); // em-dash kept distinct
    expect(fn).not.toMatch(/[–—]/); // the fold classes never include them
  });
});
