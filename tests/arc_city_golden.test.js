// Arc City golden master (Phase 1 — Line District → Arc Heights).
//
// Pins the PURE game logic + screen-reader narration of stem_tool_arccity.js
// across all levels so geometry, adjudication, the family→mechanic mapping, and
// the words a screen-reader player hears can be refactored with a safety net.
// A diff here means a behavior change — re-baseline deliberately with `vitest -u`
// ONLY when the change is reviewed and expected.
//
// The SR narration IS a way to play the game (design §8.2), so these snapshots
// are treated as gameplay, not incidental strings. Importing the module under
// the (jsdom) test environment only registers the tool harmlessly; these
// snapshots exercise its pure, DOM-free core.

import { describe, it, expect } from 'vitest';
import * as ArcMod from '../stem_lab/stem_tool_arccity.js';

const arc = ArcMod.default || ArcMod;
const { LEVELS, levelById, classifyShot, describeResult, describeEquation, describeBoard, isLevelUnlocked } = arc;

// Representative authored functions per level, spanning every outcome class.
const CASES = {
  L1: [
    { label: 'solution slope (m=0.5,b=0)', p: { m: 0.5, b: 0 } },
    { label: 'starting shot, too shallow (m=0.1,b=0)', p: { m: 0.1, b: 0 } },
    { label: 'overshoot (m=1,b=0)', p: { m: 1, b: 0 } }
  ],
  L2: [
    { label: 'solution (m=-0.4,b=5.5)', p: { m: -0.4, b: 5.5 } },
    { label: 'starting flat, misses window (m=0,b=1)', p: { m: 0, b: 1 } },
    { label: 'in window but overshoots node (m=0,b=4)', p: { m: 0, b: 4 } }
  ],
  L3: [
    { label: 'solution (a=-0.5,h=5,k=5)', p: { a: -0.5, h: 5, k: 5 } },
    { label: 'starting shot, hits wall (a=-0.2,h=5,k=2)', p: { a: -0.2, h: 5, k: 2 } },
    { label: 'flat line blocked at gate (a=0,h=5,k=5)', p: { a: 0, h: 5, k: 5 } },
    { label: 'arc too tight (a=-0.9,h=5,k=5)', p: { a: -0.9, h: 5, k: 5 } }
  ]
};

describe('Arc City — module contract', () => {
  it('exposes the pure game-logic core', () => {
    expect(typeof classifyShot).toBe('function');
    expect(typeof describeResult).toBe('function');
    expect(typeof describeEquation).toBe('function');
    expect(typeof describeBoard).toBe('function');
    expect(typeof isLevelUnlocked).toBe('function');
    expect(Array.isArray(LEVELS)).toBe(true);
    expect(LEVELS.map(l => l.id)).toEqual(['L1', 'L2', 'L3']);
  });

  it('level geometry (snapshot)', () => {
    expect(LEVELS).toMatchSnapshot();
  });

  it('board readouts for screen readers (snapshot)', () => {
    const out = {};
    LEVELS.forEach(l => { out[l.id] = describeBoard(l); });
    expect(out).toMatchSnapshot();
  });
});

describe('Arc City — adjudication + SR narration per level (golden master)', () => {
  LEVELS.forEach(level => {
    it(`${level.id} (${level.title}) outcome + narration matrix (snapshot)`, () => {
      const out = {};
      CASES[level.id].forEach((c, i) => {
        const res = classifyShot(level, c.p);
        out[c.label] = {
          result: res.result,
          yAt: res.yAt == null ? null : arc.round1(res.yAt),
          nodeDist: res.nodeDist == null ? null : arc.round1(res.nodeDist),
          equation: describeEquation(level, c.p),
          narration: describeResult(level, res, i + 1)
        };
      });
      expect(out).toMatchSnapshot();
    });
  });
});

describe('Arc City — load-bearing invariants (the math IS the mechanic)', () => {
  it('every level has a solving author', () => {
    expect(classifyShot(levelById('L1'), { m: 0.5, b: 0 }).result).toBe('hit');
    expect(classifyShot(levelById('L2'), { m: -0.4, b: 5.5 }).result).toBe('hit');
    expect(classifyShot(levelById('L3'), { a: -0.5, h: 5, k: 5 }).result).toBe('hit');
  });

  it('every level\'s starting defaults are NOT a win (you must solve)', () => {
    LEVELS.forEach(l => {
      const def = {};
      l.paramOrder.forEach(n => { def[n] = l.params[n].default; });
      expect(classifyShot(l, def).result).not.toBe('hit');
    });
  });

  it('L2: a flat line that misses the window is gate-blocked', () => {
    expect(classifyShot(levelById('L2'), { m: 0, b: 1 }).result).toBe('gate');
  });

  it('L3: a flat line cannot win — blocked at the gate', () => {
    expect(classifyShot(levelById('L3'), { a: 0, h: 5, k: 5 }).result).toBe('gate');
  });

  it('hit narration says the node is lit and counts shots', () => {
    const res = classifyShot(levelById('L3'), { a: -0.5, h: 5, k: 5 });
    const msg = describeResult(levelById('L3'), res, 2);
    expect(msg).toMatch(/Lit!/);
    expect(msg).toMatch(/2 shots/);
  });

  it('wall narration gives an actionable, magnitude-aware hint', () => {
    const L3 = levelById('L3');
    const res = classifyShot(L3, { a: -0.2, h: 5, k: 2 });
    expect(res.result).toBe('wall');
    expect(describeResult(L3, res, 1)).toMatch(/raise the vertex height k/i);
  });

  it('miss narration reports the distance by which the node was missed', () => {
    const res = classifyShot(levelById('L3'), { a: -1.5, h: 4.75, k: 8 });
    expect(res.result).toBe('miss');
    expect(describeResult(levelById('L3'), res, 3)).toMatch(/missed it by [\d.]+ units/);
  });
});

describe('Arc City — completion-based unlocking (design §5.1)', () => {
  it('only the first level is open with no progress', () => {
    expect(isLevelUnlocked({}, 0)).toBe(true);
    expect(isLevelUnlocked({}, 1)).toBe(false);
    expect(isLevelUnlocked({}, 2)).toBe(false);
  });

  it('completing a level unlocks the next', () => {
    expect(isLevelUnlocked({ L1: { solved: true } }, 1)).toBe(true);
    expect(isLevelUnlocked({ L1: { solved: true } }, 2)).toBe(false);
    expect(isLevelUnlocked({ L1: { solved: true }, L2: { solved: true } }, 2)).toBe(true);
  });

  it('an unsolved (merely attempted) level does NOT unlock the next', () => {
    expect(isLevelUnlocked({ L1: { solved: false, shots: 9 } }, 1)).toBe(false);
  });
});

describe('Arc City — tiers + hidden-preview integrity gate (design §2.4 / §9.2)', () => {
  it('the three tiers are practice / guided / independent', () => {
    expect(arc.TIERS).toEqual(['practice', 'guided', 'independent']);
  });

  it('practice shows the preview; guided/independent hide it until Fire', () => {
    expect(arc.previewVisible('practice', false)).toBe(true);
    expect(arc.previewVisible('guided', false)).toBe(false);
    expect(arc.previewVisible('independent', false)).toBe(false);
    // firing reveals the result on every tier
    expect(arc.previewVisible('guided', true)).toBe(true);
    expect(arc.previewVisible('independent', true)).toBe(true);
  });

  it('only hidden-preview tiers count as an independent solve', () => {
    expect(arc.solveIsIndependent('practice')).toBe(false);
    expect(arc.solveIsIndependent('guided')).toBe(true);
    expect(arc.solveIsIndependent('independent')).toBe(true);
  });
});

describe('Arc City — action-named badges (design §9.4)', () => {
  const L1 = levelById('L1'), L3 = levelById('L3');

  it('no badge unless the shot is a hit', () => {
    const miss = classifyShot(L3, { a: -0.2, h: 5, k: 2 });
    expect(arc.badgesForSolve(L3, miss, 1, 'practice', [])).toEqual([]);
  });

  it('a first-shot parabola hit in practice earns arc-architect, window-threader, sharp-shooter — but not independent/first-light', () => {
    const hit = classifyShot(L3, { a: -0.5, h: 5, k: 5 });
    const earned = arc.badgesForSolve(L3, hit, 1, 'practice', []);
    expect(earned).toContain('arc-architect');
    expect(earned).toContain('window-threader');
    expect(earned).toContain('sharp-shooter');
    expect(earned).not.toContain('independent'); // practice tier
    expect(earned).not.toContain('first-light');  // L1 only
  });

  it('a hidden-preview hit earns the independent badge', () => {
    const hit = classifyShot(L1, { m: 0.5, b: 0 });
    const earned = arc.badgesForSolve(L1, hit, 2, 'independent', []);
    expect(earned).toContain('independent');
    expect(earned).toContain('first-light');       // L1
    expect(earned).not.toContain('sharp-shooter');  // took 2 shots
  });

  it('already-earned badges are not re-awarded', () => {
    const hit = classifyShot(L1, { m: 0.5, b: 0 });
    const earned = arc.badgesForSolve(L1, hit, 1, 'practice', ['first-light']);
    expect(earned).not.toContain('first-light');
    expect(earned).toContain('sharp-shooter');
  });

  it('badge labels are action-described, never mastery/ability claims', () => {
    arc.BADGES.forEach(b => {
      expect(b.label.toLowerCase()).not.toMatch(/master|mastery|proficient|ability|expert/);
    });
  });
});

describe('Arc City — drag↔equation binding (design §4.2)', () => {
  const L1 = levelById('L1'), L2 = levelById('L2'), L3 = levelById('L3');

  it('snapToRange clamps to bounds and snaps to the step grid', () => {
    expect(arc.snapToRange(0.53, { min: -1.5, max: 1.5, step: 0.05 })).toBe(0.55);
    expect(arc.snapToRange(99, { min: 0, max: 8, step: 0.25 })).toBe(8);
    expect(arc.snapToRange(-99, { min: 0, max: 8, step: 0.25 })).toBe(0);
  });

  it('dragging the parabola vertex snaps to {h,k} and clamps out-of-range', () => {
    expect(arc.parabolaVertexParams(5, 5, L3)).toEqual({ h: 5, k: 5 });
    expect(arc.parabolaVertexParams(999, 999, L3)).toEqual({ h: 10, k: 8 });
    expect(arc.parabolaVertexParams(-5, -5, L3)).toEqual({ h: 0, k: 0 });
  });

  it('drag↔solve: vertex at (5,5) + a=-0.5 lights the node', () => {
    const merged = Object.assign({}, arc.parabolaVertexParams(5, 5, L3), { a: -0.5 });
    expect(classifyShot(L3, merged).result).toBe('hit');
  });

  it('L1 line handle pivots about the origin — intercept stays locked at 0', () => {
    const params = arc.linePivotParams(8, 4, 0, 0, L1); // drag the x=8 point up to y=4
    expect(params.b).toBe(0);    // b is locked
    expect(params.m).toBe(0.5);  // slope = 4 / 8
    expect(classifyShot(L1, params).result).toBe('hit');
  });

  it('L2 two-point drag recomputes slope + intercept and can reach the solution', () => {
    // drag point A=(2, 4.7), anchored at B=(8, 2.3) → m=-0.4, b=5.5
    const params = arc.linePivotParams(2, 4.7, 8, 2.3, L2);
    expect(params.m).toBe(-0.4);
    expect(params.b).toBe(5.5);
    expect(classifyShot(L2, params).result).toBe('hit');
  });
});

describe('Arc City — theme-aware palette passes WCAG on every canvas (design §7.1)', () => {
  // WCAG relative luminance + contrast ratio (sRGB).
  function lum(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const ch = i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
  }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  const TEXT = ['accent', 'warn', 'danger'];        // used as text → need 4.5:1
  const GFX = ['nodeOff', 'nodeOn', 'gate', 'wall']; // graphical objects → need 3.0:1

  ['light', 'dark', 'contrast'].forEach(theme => {
    const pal = arc.arcPalette(theme);
    const canvas = arc.THEME_CANVAS[theme];

    it(`${theme}: text accents are >= 4.5:1 vs the canvas`, () => {
      TEXT.forEach(k => expect(ratio(pal[k], canvas)).toBeGreaterThanOrEqual(4.5));
    });
    it(`${theme}: graphical accents are >= 3.0:1 vs the canvas`, () => {
      GFX.forEach(k => expect(ratio(pal[k], canvas)).toBeGreaterThanOrEqual(3.0));
    });
    it(`${theme}: Fire-button text is >= 4.5:1 vs the accent button background`, () => {
      expect(ratio(pal.btnText, pal.accent)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('the default theme is light (matching :root / .theme-default canvas #ffffff)', () => {
    expect(arc.THEME_CANVAS.light).toBe('#ffffff');
  });
});
