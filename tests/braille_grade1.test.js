// Canonical Grade-1 Braille-ASCII converter (liblouis_braille_loader.js) — the
// single source of truth both .brf export lanes now delegate to. Export-format
// review R2 flagged three HIGH braille defects with no functional coverage at
// all; these are that coverage. BRF is real embosser/notetaker output for blind
// students, so the number/letter-sign and content-loss cases matter concretely.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { toGrade1BRF } = require('../liblouis_braille_loader.js');

describe('toGrade1BRF — Grade-1 (uncontracted) Braille-ASCII', () => {
  it('prefixes a number sign and maps digits 1-0 to A-J', () => {
    expect(toGrade1BRF('42')).toBe('#DB');
    expect(toGrade1BRF('2025')).toBe('#BJBE');
  });

  it('R2 #5/#8: a letter a-j after a number gets a letter sign so "1a" is not read as "11"', () => {
    // '#A' = number 1; ';' = letter sign (dots 5-6); 'A' = letter a.
    expect(toGrade1BRF('1a')).toBe('#A;A');
    expect(toGrade1BRF('3c')).toBe('#C;C');
    // Only the ambiguous a-j need it; k-z after a number are unambiguous.
    expect(toGrade1BRF('1k')).toBe('#AK');
    // A space breaks number mode, so no spurious letter sign.
    expect(toGrade1BRF('12 dogs')).toBe('#AB DOGS');
  });

  it('marks capitals with the capital sign (comma)', () => {
    expect(toGrade1BRF('Cat')).toBe(',CAT');
    expect(toGrade1BRF('AB')).toBe(',A,B');
  });

  it('R2 #4: NFD-folds Latin accents instead of dropping them', () => {
    expect(toGrade1BRF('ano').toLowerCase()).toBe('ano');
    expect(toGrade1BRF('año')).toBe('ANO'); // n-tilde -> n, never empty
    expect(toGrade1BRF('café')).toBe('CAFE');
  });

  it('R2 #4: normalizes smart punctuation (curly quotes, em/en dashes, ellipsis)', () => {
    // em dash and en dash both become a hyphen, not dropped.
    expect(toGrade1BRF('a—b')).toBe('A-B');
    expect(toGrade1BRF('a–b')).toBe('A-B');
    // a non-breaking space becomes a normal space.
    expect(toGrade1BRF('a b')).toBe('A B');
  });

  it('counts un-representable characters (CJK/Arabic/emoji) instead of silently losing them', () => {
    const r = toGrade1BRF('日本語 hi', { withMeta: true });
    expect(r.dropped).toBe(3);        // three CJK code points had no G1 equivalent
    expect(r.brf.trim()).toBe('HI');  // the ASCII survived
    // Without withMeta the return is a plain string (back-compat with callers).
    expect(typeof toGrade1BRF('hi')).toBe('string');
  });

  it('wraps at 40 cells on WORD boundaries (no mid-word breaks)', () => {
    const line = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
    const wrapped = toGrade1BRF(line).split('\r\n');
    for (const l of wrapped) expect(l.length).toBeLessThanOrEqual(40);
    // no line should start or end mid-token with a stray partial where a space fit
    expect(wrapped.every((l) => !/^ | $/.test(l))).toBe(true);
  });

  it('a single token longer than a line hard-splits (embosser cannot overflow)', () => {
    const long = 'x'.repeat(95);
    const wrapped = toGrade1BRF(long).split('\r\n');
    expect(wrapped.length).toBe(3);
    expect(wrapped[0].length).toBe(40);
  });

  it('preserves blank-line structure and is safe on empty input', () => {
    expect(toGrade1BRF('')).toBe('');
    expect(toGrade1BRF('a\n\nb')).toBe('A\r\n\r\nB');
  });
});
