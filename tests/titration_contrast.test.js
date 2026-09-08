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

// Safety-briefing surfaces. Each station paints a four-stop gradient; the value here
// is its LIGHTEST stop, which is the worst case for light text on it.
const ST1 = '#3d1f00';                     // suit up (amber)
const ST2 = '#002240';                     // lab scan (cyan)
const ST3 = '#3d0f0f';                     // chemicals (red)
const ST4 = '#3d2000';                     // safety drill (orange)
const STEP = 'rgba(0,0,0,0.25)';           // the progress stepper strip
const MAP = '#0a1929';                     // the lab-map SVG ground
const BRIEF_BODY = 'rgba(226,232,240,0.88)';

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

  // ── The pre-lab safety briefing ───────────────────────────────────────────
  // The gate every student passes through before the lab exists, and it had no cover
  // here at all. Measured in a real browser first: the not-yet-reached stepper steps
  // came out at 1.2:1, the PPE descriptions at 3.2:1, and the four station intros
  // anywhere from 2.5:1 to 4.7:1 purely as a function of which accent hue the station
  // used. Each station paints a gradient; the LIGHTEST stop is the worst case for
  // light text, so that is what these composite against.
  ['briefing intro — PPE', BRIEF_BODY, [ST1], AA_NORMAL],
  ['briefing intro — lab scan', BRIEF_BODY, [ST2], AA_NORMAL],
  ['briefing intro — chemicals', BRIEF_BODY, [ST3], AA_NORMAL],
  ['briefing intro — drill', BRIEF_BODY, [ST4], AA_NORMAL],

  ['stepper label, reachable', 'rgba(255,255,255,0.82)', [STEP, ST1], AA_NORMAL],
  ['stepper label, locked', 'rgba(255,255,255,0.62)', [STEP, ST1], AA_NORMAL],
  ['stepper count, reachable', 'rgba(255,255,255,0.72)', [STEP, ST1], AA_NORMAL],
  ['stepper count, locked', 'rgba(255,255,255,0.58)', [STEP, ST1], AA_NORMAL],
  // Same steps on the darkest-accented station, which is the other end of the range.
  ['stepper label, locked on drill', 'rgba(255,255,255,0.62)', [STEP, ST4], AA_NORMAL],

  // Why each PPE item is required — "no glove protects against every chemical" is the
  // content of that card, not a caption on it.
  ['PPE description, unequipped', 'rgba(251,191,36,0.70)', ['rgba(0,0,0,0.3)', ST1], AA_NORMAL],
  ['PPE description, equipped', 'rgba(52,211,153,0.85)', ['rgba(16,185,129,0.12)', ST1], AA_NORMAL],

  // Lab-map furniture. The task on that station is finding equipment on the map, so
  // the labels naming what is already drawn on it are content.
  ['map label — fume hood', 'rgba(125,211,252,0.92)', ['rgba(56,189,248,0.08)', MAP], AA_NORMAL],
  ['map label — sink', 'rgba(125,211,252,0.92)', ['rgba(56,189,248,0.05)', MAP], AA_NORMAL],
  ['map label — bench', 'rgba(203,213,225,0.82)', ['rgba(148,163,184,0.1)', MAP], AA_NORMAL],
  ['map label — exit', 'rgba(203,213,225,0.92)', ['rgba(148,163,184,0.08)', MAP], AA_NORMAL],
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

// ── The blind spot this file has, pinned ────────────────────────────────────
// Everything above composites the colours the tool sets INLINE. A Tailwind opacity
// utility on an ancestor multiplies all of them and is invisible here, and that is not
// hypothetical: the briefing stepper's label was rgba(255,255,255,0.5), which composites
// to a perfectly respectable 5.1:1 — while the button around it carried opacity-30, so
// what a student actually saw was 1.2:1. The maths in this file said the colour was
// fine and it was unreadable on screen.
//
// So the stepper states its "locked" and "reachable" difference through the inline
// colour instead, and this asserts nobody quietly reintroduces the multiplier.
import fs from 'node:fs';
describe('inline colours are not silently multiplied by an ancestor', () => {
  const source = fs.readFileSync('stem_lab/stem_tool_titration.js', 'utf8');
  it('the safety-briefing stepper button carries no opacity utility', () => {
    const marker = 'isCurrent ? "scale-110" : canAccess ?';
    const at = source.indexOf(marker);
    expect(at, 'stepper className not found — this pin needs updating').toBeGreaterThan(-1);
    const clause = source.slice(at, at + 200);
    expect(clause, `stepper className reintroduces an opacity utility: ${clause}`)
      .not.toMatch(/[\s"]opacity-\d/);
  });
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
