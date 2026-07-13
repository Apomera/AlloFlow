// Restore + alt hardening (Batch 5, 2026-07-03).
//   H2 — dual-OCR word restore: normalize curly apostrophes to straight so a dropped "doesn't" matches the
//        source index (the caller's _arNorm produces straight), and NEVER default posForCtx to 0 (which
//        recorded srcWordsRaw[0] — the doc's FIRST word — as the missing word). Record the actual targetWord.
//   L2 — _applyImageIntel only overwrites a PLACEHOLDER alt, not a short-but-real one ("pH scale") or a real
//        caption starting with "Figure"/"Photo".
//   L4 — the fix loop only claims "axe-only clean" when axe ACTUALLY ran this pass (reAxe non-null); a null
//        audit is not "0 clean violations".
// (H1 STEM-image-timing and L3 sentence-substring were deferred for maintainer review — see report.)
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('H2 — dual-OCR restore: curly-normalize + no wrong-word appendix', () => {
  it('normalizes curly apostrophes in the source index and never defaults posForCtx to 0', () => {
    expect(src).toContain('normalize curly apostrophes to straight FIRST');
    expect(src).toContain('const _hasPos = positions.length > 0;');
    expect(src).toContain('const origWord = _hasPos ? (srcWordsRaw[posForCtx] || targetWord) : targetWord;');
  });
  it('mirror: a curly "doesn’t" normalizes to straight "doesn\'t" (kept, not stripped)', () => {
    const norm = (w) => w.toLowerCase().replace(/[‘’ʼ´`]/g, "'").replace(/[^a-z0-9'-]/g, '');
    expect(norm('doesn’t')).toBe("doesn't");
    expect(norm("doesn't")).toBe("doesn't");
  });
  it('mirror: an unindexed word records targetWord, NOT srcWordsRaw[0] (the doc first word)', () => {
    const pick = (positions, srcWordsRaw, targetWord) => {
      const hasPos = positions.length > 0;
      const posForCtx = hasPos ? positions[0] : -1;
      return hasPos ? (srcWordsRaw[posForCtx] || targetWord) : targetWord;
    };
    expect(pick([], ['Chapter', 'one', 'intro'], "doesn't")).toBe("doesn't"); // NOT 'Chapter'
    expect(pick([3], ['a', 'b', 'c', "doesn't"], "doesn't")).toBe("doesn't");
  });
});

describe('L2 — alt overwrite only replaces a placeholder', () => {
  it('gates the overwrite on a whole-string placeholder pattern', () => {
    expect(src).toContain('const _isPlaceholderAlt = !existingAlt ||');
    expect(src).toContain('if (newAlt && _isPlaceholderAlt) im.setAttribute');
  });
  it('mirror: "pH scale" and a real "Figure 3: ..." caption are NOT placeholders; "Figure 3"/"image" are', () => {
    const isPlaceholder = (alt) => !alt || /^(image|figure|photo|img|picture|graphic|illustration|diagram)\s*\d*\.?$/i.test(alt);
    expect(isPlaceholder('pH scale')).toBe(false);
    expect(isPlaceholder('Figure 3: Photosynthesis process')).toBe(false);
    expect(isPlaceholder('Figure 3')).toBe(true);
    expect(isPlaceholder('image')).toBe(true);
    expect(isPlaceholder('')).toBe(true);
  });
});

describe('L4 — "axe-only clean" requires axe to have actually run', () => {
  it('gates the clean claim + log on reAxe being non-null', () => {
    expect(src).toContain('if (reAxe && newAxeViolations === 0 && addToast)');
    expect(src).toContain('axe ALSO unavailable this pass');
  });
  it('mirror: a null axe result is not treated as "clean"', () => {
    const claimClean = (reAxe, newAxe) => !!(reAxe && newAxe === 0);
    expect(claimClean(null, 0)).toBe(false);
    expect(claimClean({ totalViolations: 0 }, 0)).toBe(true);
  });
});
