import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Machine verification for the Function Grapher's math engine: the challenge
// generators (root / y-intercept / name-that-graph / myths), the root finder,
// and the render-surface guards. Everything is render-scope, so the functions
// are executed from source slices.

const src = fs.readFileSync('stem_lab/stem_tool_funcgrapher.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_funcgrapher.js', 'utf8');

// ── Challenge generators: slice from FG_LABELS through startChallenge ──
function makeQuizFactory(gradeBand) {
  const start = src.indexOf('var FG_LABELS =');
  const end = src.indexOf('// Start a challenge based on the current mode', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('gradeBand', 'd',
    src.slice(start, end) +
    '\nreturn { makeFgQuiz, makeRootQuiz, makeYIntQuiz, makeMythQuiz, mythBankForBand, evalQ, buildFeedback, fgShuffle, FG_LABELS, FG_BAND_TYPES, FG_MYTHS };'
  )(gradeBand, {});
}

describe('Find the Root generator', () => {
  const eng = makeQuizFactory('6-8');

  it('never offers a genuinely-correct root as a wrong option (regression pin)', () => {
    // Before the fix, quadratics graded only r1 correct while r2 (also a root)
    // could appear as a distractor — picking it printed "f(r2) = 0, not 0".
    // Linear answers are rounded to hundredths (4/3 → 1.33), so "is a root"
    // means |f| < 0.05; distractors are integer offsets, so |f| >= 1 there.
    for (let i = 0; i < 300; i++) {
      const q = eng.makeRootQuiz();
      for (const opt of q.opts) {
        const isRoot = Math.abs(eng.evalQ(q, opt)) < 0.05;
        const gradedCorrect = q.answers.indexOf(opt) >= 0;
        expect(gradedCorrect, q.type + ' a=' + q.a + ' b=' + q.b + ' c=' + q.c + ' opt=' + opt).toBe(isRoot);
      }
    }
  });

  it('every advertised answer really is a root, and options are 4 unique values', () => {
    for (let i = 0; i < 200; i++) {
      const q = eng.makeRootQuiz();
      for (const a of q.answers) expect(Math.abs(eng.evalQ(q, a))).toBeLessThan(0.05);
      expect(q.opts.length).toBe(4);
      expect(new Set(q.opts).size).toBe(4);
      expect(q.opts).toContain(q.answer);
    }
  });

  it('places the correct answer across all four slots without bias', () => {
    const slots = [0, 0, 0, 0];
    const N = 800;
    for (let i = 0; i < N; i++) {
      const q = eng.makeRootQuiz();
      slots[q.opts.indexOf(q.answer)]++;
    }
    expect(slots.filter((c) => c > 0).length).toBe(4);
    expect(Math.max(...slots) / N).toBeLessThan(0.5);
  });

  it('stays linear-only for the younger bands', () => {
    const young = makeQuizFactory('3-5');
    for (let i = 0; i < 60; i++) expect(young.makeRootQuiz().type).toBe('linear');
  });
});

describe('Y-Intercept generator', () => {
  const eng = makeQuizFactory('9-12');

  it('the answer is always f(0), distractors never are', () => {
    for (let i = 0; i < 300; i++) {
      const q = eng.makeYIntQuiz();
      expect(eng.evalQ(q, 0)).toBe(q.answer);
      for (const opt of q.opts) {
        if (opt !== q.answer) expect(opt).not.toBe(eng.evalQ(q, 0));
      }
    }
  });

  it('distributes the correct answer across all four slots', () => {
    const slots = [0, 0, 0, 0];
    const N = 800;
    for (let i = 0; i < N; i++) {
      const q = eng.makeYIntQuiz();
      slots[q.opts.indexOf(q.answer)]++;
    }
    expect(slots.filter((c) => c > 0).length).toBe(4);
    expect(Math.max(...slots) / N).toBeLessThan(0.5);
  });
});

describe('Name That Graph generator', () => {
  it('draws options from the band pool, unique, containing the answer', () => {
    for (const band of ['K-2', '3-5', '6-8', '9-12']) {
      const eng = makeQuizFactory(band);
      for (let i = 0; i < 100; i++) {
        const q = eng.makeFgQuiz();
        expect(q.opts).toContain(q.answer);
        expect(new Set(q.opts).size).toBe(q.opts.length);
        expect(q.opts.length).toBe(Math.min(4, eng.FG_BAND_TYPES[band].length));
        const poolLabels = eng.FG_BAND_TYPES[band].map((t) => eng.FG_LABELS[t]);
        for (const opt of q.opts) expect(poolLabels).toContain(opt);
      }
    }
  });
});

describe('myth bank', () => {
  it('served myths match their bank entry (statement, truth value, why)', () => {
    const eng = makeQuizFactory('9-12');
    for (let i = 0; i < 60; i++) {
      const q = eng.makeMythQuiz();
      const entry = eng.mythBankForBand()[q.mythIdx];
      expect(q.s).toBe(entry.s);
      expect(q.answer).toBe(entry.t);
      expect(q.why).toBe(entry.why);
    }
  });
});

describe('corrective feedback', () => {
  const eng = makeQuizFactory('6-8');
  const quadratic = { mode: 'root', type: 'quadratic', a: 1, b: -5, c: 6, answer: 2, answers: [2, 3] };

  it('a correct second root gets the correct-branch message, never "f(x) = 0, not 0"', () => {
    const fb = eng.buildFeedback(quadratic, 3, true);
    expect(fb).toContain('f(3) = 0');
    expect(fb).not.toContain('not 0');
  });

  it('a wrong root pick names the actual value and lists BOTH roots', () => {
    const fb = eng.buildFeedback(quadratic, 1, false);
    expect(fb).toContain('f(1) = 2');
    expect(fb).toContain('x = 2 or x = 3');
  });
});

// ── Root finder: slice the scan loop and drive it with injected functions ──
function findRoots(evalF, xR) {
  const start = src.indexOf('var roots = [];');
  const end = src.indexOf('// Critical points', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('evalF', 'xR', src.slice(start, end) + '\nreturn roots;')(evalF, xR);
}
const R = { xMin: -10, xMax: 10 };

describe('root finder', () => {
  it('does not report a root at a vertical asymptote (regression pin)', () => {
    // 1/x has NO roots, but its sign flip across x = 0 used to produce one.
    expect(findRoots((x) => 1 / x, R)).toEqual([]);
    expect(findRoots((x) => 2 / (x - 3), R)).toEqual([]);
  });

  it('still finds genuine roots, including alongside an asymptote', () => {
    const lin = findRoots((x) => 2 * x - 4, R);
    expect(lin.length).toBe(1);
    expect(lin[0]).toBeCloseTo(2, 2);

    const quad = findRoots((x) => x * x - 4, R);
    expect(quad.length).toBe(2);
    expect(quad[0]).toBeCloseTo(-2, 2);
    expect(quad[1]).toBeCloseTo(2, 2);

    // 1/x + 0.5: root at x = -2, asymptote at 0 — exactly one root, near -2.
    const rat = findRoots((x) => 1 / x + 0.5, R);
    expect(rat.length).toBe(1);
    expect(rat[0]).toBeCloseTo(-2, 2);
  });

  it('reports a sample-aligned root once, not per adjacent interval', () => {
    const hits = findRoots((x) => x, R);
    expect(hits.length).toBe(1);
    expect(hits[0]).toBeCloseTo(0, 2);
  });
});

describe('render-surface guards (source pins)', () => {
  it('derivative and comparison curves are break-aware segments, not single polylines', () => {
    expect(src).toContain('derivSegs.map(function (seg, si)');
    expect(src).toContain('compareSegs.map(function (seg, si)');
    expect(src).not.toContain('derivPts.join');
    expect(src).not.toContain('comparePts.join');
  });

  it('comparison curve and its equation label share one default for a2 = 0', () => {
    expect(src).not.toContain('d.compareA || 1');
    expect(src).not.toContain('d.compareA || 0');
    expect(src.split("typeof d.compareA === 'number'").length - 1).toBe(2);
  });

  it('the biased comparator shuffle is gone', () => {
    expect(src).not.toContain('sort(function () { return Math.random() - 0.5; })');
  });

  it('table of values never prints NaN, integral chip admits divergence', () => {
    expect(src).toContain("isFinite(fy) ? fy.toFixed(2) : 'undefined'");
    expect(src).toContain('integralDefined');
    expect(src).toContain('"diverges"');
  });

  it('keyboard shortcut label matches the nine families the handler accepts', () => {
    expect(src).toContain('1 through 9 pick a function type');
    expect(src).not.toContain('1 through 6');
  });

  it('the two AI panels no longer share one output key', () => {
    expect(src).toContain("d.aiTutorText || ''");
    // Exactly two writers: the clear-on-request and the response setter.
    expect(src.split("upd('aiTutorText',").length - 1).toBe(2);
    // The tutor panel must not read or write the button's aiExplain key anymore.
    expect(src.indexOf("var aiText = d.aiExplain")).toBe(-1);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
