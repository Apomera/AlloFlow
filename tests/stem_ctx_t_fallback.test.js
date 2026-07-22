// Regression: STEM tools call ctx.t(key, englishFallback) and expect the
// fallback when a key is missing. The app's real t() returns undefined for a
// missing key, so tools whose keys were never added to the lang packs rendered
// the literal text "undefined" — the Sim / Molecule / Circuit / Zoom shelves
// all showed "🔬 undefined" and blank buttons (2026-07-21 field report).
//
// The STEM render gate could not catch this: it mounts tools with a fallback t.
// So this test exercises the REAL ctx.t assembly against a production-shaped t
// (one that returns undefined for missing keys).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'stem_lab/stem_lab_module.js'), 'utf8');

// Pull the actual ctx.t function text out of the module and rebuild it with a
// closed-over app-level t — so we test the shipped code, not a paraphrase.
const m = src.match(/t: (function\(k, fb\) \{[\s\S]*?\n {12}\}),/);
if (!m) throw new Error('ctx.t assembly not found — did the shape change?');
const ctxTText = m[1];

// A production-shaped app t(): real value for known keys, UNDEFINED for missing,
// and it treats arg2 as params (never as a fallback string).
function makeCtxT(appT) {
  return new Function('t', 'return ' + ctxTText + ';')(appT);
}
const appT = (k, params) => {
  const pack = { 'stem.real.key': 'Real Translated Value' };
  return Object.prototype.hasOwnProperty.call(pack, k) ? pack[k] : undefined;
};

describe('STEM ctx.t is fallback-aware', () => {
  const t = makeCtxT(appT);

  it('a missing key with a string fallback returns the fallback (never undefined)', () => {
    expect(t('stem.simShelf.title', '🧪 Sim Shelf — predict first, then play')).toBe('🧪 Sim Shelf — predict first, then play');
    expect(t('stem.simShelf.note1', 'Predictions stay in the lab window.')).toBe('Predictions stay in the lab window.');
  });

  it('the exact field bug — emoji concatenation — no longer yields "undefined"', () => {
    expect('🔬 ' + t('stem.simShelf.note1', 'Nothing is saved or graded.')).toBe('🔬 Nothing is saved or graded.');
    expect(t('stem.simShelf.open', '🧪 Open Sim Shelf')).not.toContain('undefined');
  });

  it('a real key still returns its translation (fallback not blindly used)', () => {
    expect(t('stem.real.key', 'ignored fallback')).toBe('Real Translated Value');
  });

  it('a missing key with NO fallback returns the key, never undefined', () => {
    const r = t('stem.some.missing.key');
    expect(r).toBe('stem.some.missing.key');
    expect(r).not.toBe(undefined);
  });

  it('a params OBJECT is still forwarded (interpolation path preserved)', () => {
    let seen = null;
    const spyT = (k, p) => { seen = p; return 'X'; };
    const t2 = makeCtxT(spyT);
    t2('some.key', { count: 5 });
    expect(seen).toEqual({ count: 5 });
  });
});

describe('the shelf tools rely on this (guards the contract)', () => {
  for (const f of ['simshelf', 'moleculeshelf', 'circuitshelf', 'zoomgallery']) {
    it(`stem_tool_${f} calls t(key, englishFallback)`, () => {
      const tool = readFileSync(resolve(process.cwd(), `stem_lab/stem_tool_${f}.js`), 'utf8');
      // at least one t('key', 'Fallback…') call with a real English default
      expect(tool).toMatch(/t\('stem\.[a-zA-Z]+\.[a-zA-Z0-9_]+',\s*'[^']+'\)/);
    });
  }
});
