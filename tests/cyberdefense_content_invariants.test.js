// cyberDefense content invariants — machine-verifies the cipher decode
// challenges against the tool's own cipher implementations (a 2026-08-10 deep
// dive found two ciphertexts that did NOT decode to their expected answers:
// 'JVILY KLMLUZL' gave COBER DEFENSE and 'QRIRE ...' gave DEVER ...), checks
// the phishing bank keeps a balanced phish/legit ratio (a lopsided bank makes
// "always say phish" a winning strategy), and pins the scoped light-mode
// palette rebind (kitchenLab/archStudio class: hardcoded dark surface + theme
// text vars = 1.00:1 invisible in light theme without it).

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let pure;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_cyberdefense.js', 'cyberDefense');
  pure = window.__cyberDefensePure;
});

describe('cyberDefense — cipher decode challenges', () => {
  it('exposes the pure cipher functions and challenge bank', () => {
    expect(typeof pure.caesarCipher).toBe('function');
    expect(typeof pure.atbashCipher).toBe('function');
    expect(pure.CIPHER_CHALLENGES.length).toBeGreaterThanOrEqual(8);
  });

  it('every ciphertext decodes to its expected answer using the tool\'s own ciphers', () => {
    for (const c of pure.CIPHER_CHALLENGES) {
      let decoded;
      if (c.type === 'caesar') decoded = pure.caesarCipher(c.encoded, c.shift, false);
      else if (c.type === 'atbash') decoded = pure.atbashCipher(c.encoded);
      else throw new Error('unknown cipher type ' + c.type + ' in challenge: ' + c.encoded);
      expect(decoded, c.encoded).toBe(c.answer);
    }
  });

  it('answers are uppercase A-Z + single spaces, matching the input normalizer', () => {
    for (const c of pure.CIPHER_CHALLENGES) {
      expect(c.answer, c.encoded).toMatch(/^[A-Z]+( [A-Z]+)*$/);
      expect(typeof c.hintKey).toBe('string');
      expect(typeof c.hintFallback).toBe('string');
    }
  });

  it('encode/decode round-trips for both cipher families', () => {
    expect(pure.caesarCipher(pure.caesarCipher('Attack At Dawn', 9, true), 9, false)).toBe('Attack At Dawn');
    expect(pure.atbashCipher(pure.atbashCipher('Zebra crossing'))).toBe('Zebra crossing');
  });
});

describe('cyberDefense — phishing bank balance', () => {
  it('keeps the phish/legit ratio between 40% and 70% so "always phish" cannot win', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_cyberdefense.js', 'utf8');
    const phish = (src.match(/isPhish: true/g) || []).length;
    const legit = (src.match(/isPhish: false/g) || []).length;
    expect(phish).toBeGreaterThanOrEqual(3);
    expect(legit).toBeGreaterThanOrEqual(3);
    const share = phish / (phish + legit);
    expect(share).toBeGreaterThanOrEqual(0.4);
    expect(share).toBeLessThanOrEqual(0.7);
  });

  it('every difficulty tier has a real pool with both classes (no all-phish filter)', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_cyberdefense.js', 'utf8');
    const pairs = [...src.matchAll(/isPhish: (true|false), difficulty: '(easy|medium|hard)'/g)];
    expect(pairs.length).toBeGreaterThanOrEqual(18);
    const byTier = { easy: { p: 0, l: 0 }, medium: { p: 0, l: 0 }, hard: { p: 0, l: 0 } };
    for (const m of pairs) byTier[m[2]][m[1] === 'true' ? 'p' : 'l']++;
    for (const tier of ['easy', 'medium', 'hard']) {
      expect(byTier[tier].p + byTier[tier].l, tier + ' pool size').toBeGreaterThanOrEqual(5);
      expect(byTier[tier].p, tier + ' phish count').toBeGreaterThanOrEqual(2);
      expect(byTier[tier].l, tier + ' legit count').toBeGreaterThanOrEqual(2);
    }
  });
});

describe('cyberDefense — light-mode palette rebind', () => {
  it('renders the scoped palette pin on the tool root (with high-contrast override)', () => {
    const html = renderTool('cyberDefense', {});
    expect(html).toContain('id="cyber-defense-region"');
    expect(html).toContain('#cyber-defense-region{--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;--allo-stem-canvas:#0f172a;}');
    expect(html).toContain('.theme-contrast #cyber-defense-region{--allo-stem-text:#ffff00');
  });
});
