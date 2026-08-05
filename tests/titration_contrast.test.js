// Titration Lab — WCAG contrast for the colours the tool sets INLINE.
//
// Why this exists as its own file: the axe suite next door has colour-contrast
// switched off, because jsdom has no Tailwind stylesheet and the Playwright harness
// does not load one either — axe there would be grading unstyled text and reporting
// nonsense. Contrast therefore has no automated cover at all from either of them.
//
// What CAN be checked without a browser is the set of colours the tool hard-codes in
// `style={{ color: … }}` against backgrounds it also hard-codes. That is precisely the
// set most likely to be wrong, because each one was picked by eye. This file composites
// the real alpha stack and applies the WCAG 2.1 ratio.
//
// It does NOT cover Tailwind utility colours (text-slate-400 and friends) — those need
// a real stylesheet, and claiming otherwise would be worse than leaving them uncovered.

import { describe, it, expect } from 'vitest';

// ── WCAG 2.1 relative luminance and contrast ratio ──────────────────────────
function parse(c) {
  // Already-parsed colours pass straight through: compositing a stack feeds the
  // running result back in, and String()-ing that gave "[object Object]".
  if (c && typeof c === 'object') return c;
  c = String(c).trim();
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  const p = m[1].split(',').map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
}
// Source-over compositing: what the eye actually receives through a translucent layer.
function over(fg, bg) {
  const f = parse(fg), b = parse(bg);
  return {
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  };
}
function lum({ r, g, b }) {
  const ch = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
function ratio(fg, bgStack) {
  // bgStack is outermost-last; composite it down to one opaque colour first.
  let base = parse(bgStack[bgStack.length - 1]);
  for (let i = bgStack.length - 2; i >= 0; i--) base = over(bgStack[i], base);
  const f = over(fg, base);
  const [hi, lo] = [lum(f), lum(base)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// The app's dark surface, under every panel below. The tool's own cards are painted
// over this, so it is the bottom of every stack here.
const PAGE = '#0f172a';
const CARD = 'rgba(3,25,40,0.85)';        // the tab's card
const PANEL = 'rgba(15,23,42,0.55)';      // inner observation panel
const READOUT = 'rgba(15,23,42,0.6)';     // the burette / pH readout box
const RESULT = 'rgba(15,23,42,0.7)';      // graded result panel

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;                      // >=18.66px bold or >=24px

// [label, colour, background stack (inner -> outer), threshold]
const CASES = [
  // Redox potentiometry readout (large bold number)
  ['redox readout, pre-endpoint', '#fde68a', [READOUT, CARD, PAGE], AA_LARGE],
  ['redox readout, past endpoint', '#e879f9', [READOUT, CARD, PAGE], AA_LARGE],

  // Graded run: the flask observation ladder (small text)
  ['observation — none', '#94a3b8', [PANEL, CARD, PAGE], AA_NORMAL],
  ['observation — flash', '#fbbf24', [PANEL, CARD, PAGE], AA_NORMAL],
  ['observation — endpoint', '#4ade80', [PANEL, CARD, PAGE], AA_NORMAL],
  ['observation — overshot', '#f87171', [PANEL, CARD, PAGE], AA_NORMAL],

  // The burette reading and its parallax caption
  ['burette reads, level', '#4ade80', [READOUT, CARD, PAGE], AA_NORMAL],
  ['burette reads, off-level', '#fbbf24', [READOUT, CARD, PAGE], AA_NORMAL],

  // Precision / accuracy tiles
  ['precision tile, pass', '#4ade80', ['rgba(22,101,52,0.15)', RESULT, CARD, PAGE], AA_NORMAL],
  ['precision tile, fail', '#f87171', ['rgba(127,29,29,0.15)', RESULT, CARD, PAGE], AA_NORMAL],

  // The precise-but-not-accurate banner — the single most important message the
  // graded mode produces, so it had better be readable.
  ['systematic-error banner', '#fde68a', ['rgba(120,53,15,0.28)', RESULT, CARD, PAGE], AA_NORMAL],

  // Grade bands
  ['band — excellent', '#4ade80', [RESULT, CARD, PAGE], AA_NORMAL],
  ['band — good', '#a3e635', [RESULT, CARD, PAGE], AA_NORMAL],
  ['band — fair', '#fbbf24', [RESULT, CARD, PAGE], AA_NORMAL],
  ['band — poor', '#f87171', [RESULT, CARD, PAGE], AA_NORMAL],

  // Redox explainer block
  ['redox explainer body', '#f5d0fe', ['rgba(112,26,117,0.30)', CARD, PAGE], AA_NORMAL],
  ['redox explainer equations', '#f0abfc', ['rgba(112,26,117,0.30)', CARD, PAGE], AA_NORMAL],

  // Glassware bench punchline
  ['bench punchline', '#a7f3d0', ['rgba(15,23,42,0.4)', CARD, PAGE], AA_NORMAL],
];

describe('inline colour choices meet WCAG AA', () => {
  for (const [label, fg, stack, threshold] of CASES) {
    it(`${label} — ${fg}`, () => {
      const r = ratio(fg, stack);
      expect(r, `${label}: ${fg} gives ${r.toFixed(2)}:1, needs ${threshold}:1`)
        .toBeGreaterThanOrEqual(threshold);
    });
  }
});

describe('the contrast maths itself', () => {
  // Anchors from the WCAG spec, so a broken implementation cannot quietly pass
  // everything above.
  it('matches known reference ratios', () => {
    expect(ratio('#ffffff', ['#000000'])).toBeCloseTo(21, 5);
    expect(ratio('#000000', ['#000000'])).toBeCloseTo(1, 5);
    expect(ratio('#767676', ['#ffffff'])).toBeGreaterThanOrEqual(4.5);   // AA boundary grey
    expect(ratio('#777777', ['#ffffff'])).toBeLessThan(4.6);
  });

  it('accounts for alpha rather than ignoring it', () => {
    // Half-opaque white over black must land between black and white.
    const mid = ratio('#ffffff', ['rgba(255,255,255,0.5)', '#000000']);
    expect(mid).toBeGreaterThan(1);
    expect(mid).toBeLessThan(21);
  });
});
