// Two Probability Lab visuals that used to be wrong in ways no other test
// could see, because both failures are geometric rather than structural:
//
//  1. The die faces. d4 and d20 were the same up-pointing triangle and only
//     the fill colour told them apart, which is no signal at all for a
//     colour-blind student. The d10 was drawn as a rhombus, but a d10 is a
//     pentagonal trapezohedron and its faces are kites.
//  2. The "distribution shape discovery" widget. Three sliders drove nothing
//     but a text label, so "sweep and notice" had nothing to notice. It now
//     draws the expected distribution AND a live 60-draw sample.
//
// Both are pinned here by behaviour (distinct silhouettes, numerals inside
// their faces, sample tracks the weights) rather than by digest, so an
// intentional restyle doesn't fail but a regression to flat/identical does.

import fs from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = fs.readFileSync('stem_lab/stem_tool_probability.js', 'utf8');

// Lift the geometry out of the tool without booting it: polyPts + DIE_SHAPES
// are a self-contained block between the helper and the renderer.
function diceGeometry() {
  const start = SRC.indexOf('var polyPts = function');
  const end = SRC.indexOf('var diceFace = function');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const sandbox = { Math };
  vm.runInNewContext(SRC.slice(start, end) + '\nout = DIE_SHAPES;', sandbox);
  return sandbox.out;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const SIDES = [4, 8, 10, 12, 20];
const BOX = 80;

// Relative luminance / contrast ratio (WCAG 2.x).
const channel = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const luminance = (hex) => 0.2126 * channel(parseInt(hex.slice(1, 3), 16))
  + 0.7152 * channel(parseInt(hex.slice(3, 5), 16))
  + 0.0722 * channel(parseInt(hex.slice(5, 7), 16));
const contrastVsWhite = (hex) => 1.05 / (luminance(hex) + 0.05);

describe('Probability Lab die faces', () => {
  it('gives every die type its own silhouette, not just its own colour', () => {
    const shapes = diceGeometry();
    const signatures = SIDES.map((n) => {
      const s = shapes[n];
      return n + '=' + (s.points(BOX).length / 2) + 'v' + (s.ring ? '+ring' : '')
        + ':' + s.points(BOX).map((v) => Math.round(v)).join(',');
    });
    const bare = signatures.map((sig) => sig.slice(sig.indexOf('=') + 1));
    expect(new Set(bare).size).toBe(SIDES.length);
    // The d4/d20 collision specifically: same vertex count, so the d20 needs
    // its surrounding hexagon to stay tellable apart in greyscale.
    expect(shapes[20].ring).toBeTypeOf('function');
    expect(shapes[20].ring(BOX).length / 2).toBe(6);
    // A d10 face is a kite (4 vertices), not a triangle.
    expect(shapes[10].points(BOX).length / 2).toBe(4);
    // A d12 face is a pentagon.
    expect(shapes[12].points(BOX).length / 2).toBe(5);
  });

  it('keeps every face inside the box and every numeral inside its face', () => {
    const shapes = diceGeometry();
    for (const n of SIDES) {
      const shape = shapes[n];
      const pts = shape.points(BOX);
      for (let i = 0; i < pts.length; i++) {
        expect(pts[i], 'd' + n + ' vertex out of the viewBox').toBeGreaterThanOrEqual(-0.5);
        expect(pts[i], 'd' + n + ' vertex out of the viewBox').toBeLessThanOrEqual(BOX + 0.5);
      }
      // Widest numeral the die can roll, sized the way diceFace sizes it.
      const digits = String(n).length;
      const fontSize = BOX * (n >= 10 ? 0.32 : 0.42) * (shape.fontScale || 1);
      const baseline = BOX * shape.textCY + fontSize * 0.36;
      const halfWidth = (digits * fontSize * 0.62) / 2;
      const capTop = baseline - fontSize * 0.72;
      for (const [x, y] of [[BOX / 2 - halfWidth, baseline], [BOX / 2 + halfWidth, baseline],
        [BOX / 2 - halfWidth, capTop], [BOX / 2 + halfWidth, capTop]]) {
        expect(pointInPolygon(x, y, pts), 'numeral "' + n + '" spills outside the d' + n + ' face').toBe(true);
      }
    }
  });

  it('keeps the die palette legible as button text on white and as white numerals', () => {
    const shapes = diceGeometry();
    for (const n of [4, 6, 8, 10, 12, 20]) {
      // One colour serves both directions, so 4.5:1 against white covers the
      // die-type button label AND the white numeral painted on the face.
      expect(contrastVsWhite(shapes[n].fill), 'd' + n + ' fill ' + shapes[n].fill)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not dress an unexpected die size in the d20 face', () => {
    const shapes = diceGeometry();
    expect(shapes._).toBeTruthy();
    expect(shapes._.points(BOX)).not.toEqual(shapes[20].points(BOX));
  });
});

describe('Probability Lab fairness test', () => {
  // The chi-squared threshold was a five-branch lookup that fell back to the
  // d6's 11.07 for every df it didn't list, so a fair d20 (df=19, where the
  // statistic averages 19) read "Biased" 93% of the time.
  function criticalFn() {
    const start = SRC.indexOf('var CHI_05 =');
    const end = SRC.indexOf('var chiCritical = chiCriticalAt05(df);');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const sandbox = { Math };
    vm.runInNewContext(SRC.slice(start, end) + '\nout = chiCriticalAt05;', sandbox);
    return sandbox.out;
  }

  it('matches published chi-squared critical values at alpha = 0.05', () => {
    const crit = criticalFn();
    const published = { 1: 3.841, 2: 5.991, 3: 7.815, 5: 11.070, 6: 12.592, 7: 14.067,
      9: 16.919, 10: 18.307, 11: 19.675, 19: 30.144, 22: 33.924, 38: 53.384 };
    for (const [df, expected] of Object.entries(published)) {
      const got = crit(Number(df));
      expect(Math.abs(got - expected) / expected, 'df=' + df + ' gave ' + got).toBeLessThan(0.005);
    }
  });

  it('is defined and increasing for every df the tool can produce', () => {
    const crit = criticalFn();
    // d4..d20 single die => df 3..19; 2d4..2d20 sums => df 6..38.
    let prev = 0;
    for (let df = 1; df <= 40; df++) {
      const c = crit(df);
      expect(Number.isFinite(c), 'df=' + df + ' is not finite').toBe(true);
      expect(c, 'df=' + df + ' did not increase').toBeGreaterThan(prev);
      prev = c;
    }
  });

  it('does not call a fair die biased more than ~1 time in 10', () => {
    // The regression this guards: any df falling through to a d6 threshold.
    // Deterministic LCG so the rate is stable run to run.
    const crit = criticalFn();
    let seed = 12345;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      const trials = Math.max(600, sides * 5);
      let flagged = 0;
      const reps = 400;
      for (let r = 0; r < reps; r++) {
        const counts = new Array(sides).fill(0);
        for (let i = 0; i < trials; i++) counts[Math.floor(rnd() * sides)]++;
        const exp = trials / sides;
        let chi = 0;
        for (const c of counts) chi += ((c - exp) ** 2) / exp;
        if (chi >= crit(sides - 1)) flagged++;
      }
      expect(flagged / reps, 'fair d' + sides + ' flagged biased ' + (flagged / reps * 100).toFixed(1) + '% of the time')
        .toBeLessThan(0.10);
    }
  });

  it('withholds the verdict until every outcome expects ~5 hits', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    // 2d6: rarest sum is 1/36, so the test needs 180 trials.
    const thin = renderTool('probability', { probability: { mode: 'dice2', diceSides: 6, trials: 20, results: [7, 7, 6, 8, 7] } });
    expect(thin).toContain('Not yet');
    expect(thin).toMatch(/needs 180 trials/);
    expect(thin).not.toContain('✅ Fair');
    expect(thin).not.toContain('❌ Biased');
  });
});

describe('Probability Lab two-dice sum', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });

  it('draws the sample space for every die type, not just up to d10', () => {
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      const html = renderTool('probability', { probability: { mode: 'dice2', diceSides: sides, lastResult: sides + 1 } });
      const anchor = html.indexOf('sample space grid for two-dice sums');
      expect(anchor, 'd' + sides + ' renders no sample-space grid').toBeGreaterThan(-1);
      const svg = html.slice(html.lastIndexOf('<svg', anchor), html.indexOf('</svg>', anchor));
      expect((svg.match(/<rect/g) || []).length, 'd' + sides + ' cell count').toBe(sides * sides);
      // Exactly N pairs sum to the modal value N+1, and all of them highlight.
      expect((svg.match(/stroke="#0f172a"/g) || []).length, 'd' + sides + ' highlight').toBe(sides);
    }
  });

  it('survives a trial count with no results array', () => {
    // d.results.slice(-30) was the one unguarded read of results in the file.
    // A restored snapshot carrying trials without results took the whole tool
    // down on render — a blank pane, not a missing strip.
    for (const mode of ['coin', 'dice', 'dice2', 'spinner']) {
      expect(() => renderTool('probability', { probability: { mode, trials: 7 } }),
        mode + ' crashed with trials but no results').not.toThrow();
    }
  });

  it('tracks the modal sum in the convergence chart, not the rarest one', () => {
    for (const sides of [6, 20]) {
      const html = renderTool('probability', { probability: { mode: 'dice2', diceSides: sides, trials: 4, convergenceHistory: [{ t: 1, pct: 0 }, { t: 2, pct: 50 }] } });
      // The heading names the tracked sum and its probability: 1/N, not 1/N².
      // Scoped to that heading — the expected-probability table legitimately
      // lists P(2) as one of the sums.
      const heading = /Convergence to Expected \((.+?)\)</.exec(html);
      expect(heading, 'no convergence heading for d' + sides).toBeTruthy();
      expect(heading[1]).toBe('P(' + (sides + 1) + ')=' + (100 / sides).toFixed(1) + '%');
      // The dashed expected rule on the chart must agree with the heading.
      expect(html).toContain((100 / sides).toFixed(1) + '% expected');
    }
  });
});

describe('Probability Lab Monte Carlo pi', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });
  const estimate = (html) => Number((/pi estimate ([\d.]+)/.exec(html) || [])[1]);
  const points = (n, insideFraction) =>
    Array.from({ length: n }, (_, i) => ({ x: 0.1, y: 0.1, inside: i < n * insideFraction }));

  it('estimates pi from running totals, not the capped point array', () => {
    // _piPoints is capped at 1000 for rendering. Deriving the estimate from it
    // froze accuracy at the cap: 100,000 darts scored no better than 1,000.
    // The array here is deliberately stocked with an all-inside (pi = 4) mix so
    // a regression to reading it is unmistakable.
    const html = renderTool('probability', { probability: { mode: 'pi', trials: 50000,
      _piPoints: points(1000, 1.0), _piTotal: 50000, _piInside: 39270 } });
    expect(estimate(html)).toBeCloseTo(3.1416, 3);
  });

  it('still reads state saved before the counters existed', () => {
    const html = renderTool('probability', { probability: { mode: 'pi', trials: 800, _piPoints: points(800, 0.75) } });
    expect(estimate(html)).toBeCloseTo(3.0, 4);
  });

  it('reports the dart count it actually used', () => {
    const html = renderTool('probability', { probability: { mode: 'pi', trials: 50000,
      _piPoints: points(1000, 0.7854), _piTotal: 50000, _piInside: 39270 } });
    expect(html).toContain('of 50000 points inside');
  });
});

describe('Probability Lab identifier shadowing', () => {
  // check_free_vars catches a name that resolves to NOTHING. It cannot catch a
  // name that resolves to the WRONG thing. In a 3,800-line render closure, one
  // `for (var t = 0; ...)` hoists over its whole function and turns the next
  // t('key','English') anyone adds there into "t is not a function" — at runtime,
  // in the branch nobody rendered during review.
  const CRITICAL = ['t', 'd', 'h', 'React', 'upd', 'counts', 'expected'];

  function shadows() {
    const found = [];
    SRC.split(/\r?\n/).forEach((line, i) => {
      for (const name of CRITICAL) {
        const decl = new RegExp('(?:^|[;{(\\s])(?:var|let|const)\\s+' + name + '\\s*(?:=|of\\b|in\\b|;)');
        if (decl.test(line)) found.push({ line: i + 1, name, kind: 'decl' });
      }
      const fn = /function\s*[\w$]*\s*\(([^)]*)\)/g;
      let m;
      while ((m = fn.exec(line))) {
        for (const a of m[1].split(',').map((s) => s.trim())) {
          if (CRITICAL.includes(a)) found.push({ line: i + 1, name: a, kind: 'param' });
        }
      }
    });
    return found;
  }

  it('declares each critical identifier once, and shadows none of them', () => {
    const byName = {};
    for (const s of shadows()) byName[s.name] = (byName[s.name] || 0) + 1;
    // t and d are THE translation function and THE tool-data object. Exactly one
    // canonical declaration each, plus the questHooks callbacks that are handed
    // tool data as `d` by the host's own contract.
    expect(byName.t, 'something other than the canonical `var t` declares t').toBe(1);
    // The 8 legitimate `d` sightings: the canonical `var d = labToolData.probability`,
    // the module-scope probTone(f, d, ...) audio helper (render-scope d is not
    // visible there), and 3 questHooks rows x 2 callbacks each (check + progress),
    // which the host hands tool data as `d` by contract.
    expect(byName.d, 'unexpected shadow of the tool-data object `d`').toBe(8);
    // Named so a future failure says which lines to look at.
    const detail = shadows().filter((s) => s.name === 't' || s.name === 'd')
      .map((s) => s.name + '@' + s.line).join(' ');
    expect(detail, 'shadow set changed: ' + detail).toContain('t@');
  });

  it('has no loop counter or date named after a critical identifier', () => {
    expect(SRC, 'a loop counter named t shadows the translation function').not.toMatch(/for\s*\(\s*var\s+t\s*=/);
    expect(SRC, 'a Date named d shadows the tool-data object').not.toMatch(/var\s+d\s*=\s*new Date/);
    // h is React.createElement in render scope; a callback param named h shadows it.
    expect(SRC, 'callback parameter named h shadows the createElement alias')
      .not.toMatch(/function\s*\(\s*h\s*,/);
  });
});

describe('Probability Lab factual claims', () => {
  // Prose in a teaching tool is as load-bearing as its arithmetic. These pin the
  // claims that were wrong, plus the arithmetic behind the ones that are right,
  // so a future reword cannot quietly reintroduce them.

  it('explains Monopoly with the squares orange actually occupies', () => {
    // Orange is at board 16/18/19 and Jail is 10, so the rolls that reach it are
    // +6, +8, +9 — NOT the "6, 7, 8 most common sums" the old copy cited, since
    // 7 past Jail is Community Chest.
    const ways = (s) => { let n = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) n++; return n; };
    const orange = [6, 8, 9].reduce((acc, o) => acc + ways(o), 0);
    expect(orange).toBe(14);
    expect(Math.round((orange / 36) * 100)).toBe(39);
    expect(SRC).toMatch(/6, 8 and 9 steps past Jail/);
    expect(SRC).toMatch(/14 times in 36/);
    expect(SRC, 'the old, wrong Monopoly explanation is back').not.toMatch(/6, 7, 8 are the most common sums/);
  });

  it('does not have Bernoulli publishing eight years after his death', () => {
    expect(SRC, 'Bernoulli died in 1705; 1713 is the posthumous publication of Ars Conjectandi')
      .not.toMatch(/Bernoulli proved the Law of Large Numbers in 1713/);
    expect(SRC).toMatch(/Ars Conjectandi/);
    // The weak law gives convergence in probability, not "always".
    expect(SRC).not.toMatch(/proportion of heads will always converge/);
  });

  it('calls a running sample the Law of Large Numbers, not the CLT', () => {
    // The CLT describes the distribution of sample MEANS across repeated
    // samples. One sample settling onto its expected frequencies is the LLN.
    expect(SRC, 'running trials mislabelled as the Central Limit Theorem')
      .not.toMatch(/you're witnessing the Central Limit Theorem in action/);
    // The Galton board IS a genuine CLT demo, so that one keeps the name.
    expect(SRC).toMatch(/histogram becomes a bell curve — the Central Limit Theorem in action/);
  });

  it('keeps the sports figures consistent between card and hint', () => {
    // The card said 77% while the hint said 75% for the same free throw.
    const card = /NBA average free throw percentage is ~(\d+)%/.exec(SRC);
    const hint = /Free-throw (\d+)%/.exec(SRC);
    expect(card, 'free-throw card copy missing').toBeTruthy();
    expect(hint, 'free-throw hint copy missing').toBeTruthy();
    expect(hint[1], 'hint disagrees with the card').toBe(card[1]);
    // And both must match the probability the simulation actually uses.
    const prob = /id: 'freethrow'[\s\S]{0,400}?probs: \[([\d.]+)/.exec(SRC);
    expect(Math.round(Number(prob[1]) * 100)).toBe(Number(card[1]));
  });

  it('states the dimension figures the geometry actually gives', () => {
    // 2D: pi/4. 3D: pi/6. 10D: ball volume pi^5/5! over a cube of side 2.
    expect((Math.PI / 4 * 100).toFixed(1)).toBe('78.5');
    expect((Math.PI / 6 * 100).toFixed(1)).toBe('52.4');
    const tenD = Math.pow(Math.PI, 5) / 120 / Math.pow(2, 10);
    expect(Math.round(1 / tenD)).toBe(402);           // copy says "about 1 in 400"
    expect(SRC).toMatch(/78\.5% of its square/);
    expect(SRC).toMatch(/52\.4% of its cube/);
    expect(SRC).toMatch(/1 dart in 400/);
  });

  it('withholds the fairness verdict when draws are not independent', () => {
    // Without replacement a full pass returns the bag exactly, so chi-squared is
    // 0.000 forever — the tool used to read that as a confident "Fair".
    const bagState = (extra) => ({ probability: Object.assign({
      mode: 'marbleBag', trials: 100, results: ['Red', 'Blue'],
      customOutcomes: [{ label: 'Red', count: 5, color: '#ef4444' }, { label: 'Blue', count: 5, color: '#3b82f6' }]
    }, extra) });
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const without = renderTool('probability', bagState({ mbWithoutReplacement: true }));
    expect(without).toContain('N/A here');
    expect(without).not.toContain('✅ Fair');
    expect(without).not.toContain('❌ Biased');
    expect(without).toMatch(/assumes each draw is independent/);
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const with_ = renderTool('probability', bagState({ mbWithoutReplacement: false }));
    expect(with_, 'the verdict should still appear when draws ARE independent').toMatch(/✅ Fair|❌ Biased/);
  });
});

describe('Probability Lab 3D Monte Carlo volume', () => {
  // The shapes live in a 1x1x1 box, so a shape's hit rate IS its volume. That
  // identity is the entire lesson, which makes these numbers load-bearing: if
  // inside() ever stops matching the stated exact volume, the simulation is
  // teaching a wrong number with total confidence.
  function shapes() {
    const start = SRC.indexOf('function _v3BlobRadius');
    const end = SRC.indexOf('// Imperative 3D handle');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const sandbox = { Math };
    vm.runInNewContext(SRC.slice(start, end) + '\nout = { S: V3_SHAPES, blobR: _v3BlobRadius };', sandbox);
    return sandbox.out;
  }

  it('samples to the exact volume for every shape that has a formula', () => {
    const { S } = shapes();
    let seed = 987654321;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const N = 300000;
    for (const s of S) {
      if (s.exact == null) continue;
      let hits = 0;
      for (let i = 0; i < N; i++) {
        if (s.inside(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5)) hits++;
      }
      const mc = hits / N;
      // 4 standard errors — generous enough not to flake, tight enough that a
      // geometry mistake (wrong radius, unrotated pyramid base) fails loudly.
      const tol = 4 * Math.sqrt((s.exact * (1 - s.exact)) / N);
      expect(Math.abs(mc - s.exact), s.id + ': sampled ' + mc.toFixed(5) + ' vs exact ' + s.exact.toFixed(5))
        .toBeLessThan(tol);
    }
  });

  // Compute-heavy, and it shares a machine with the Playwright suite. An
  // explicit budget beats inheriting the 5s default and flaking under load —
  // this once failed at 5593ms while asserting nothing different.
  it('keeps every shape strictly inside the box', () => {
    // A solid poking through a wall would be clipped by the sampler but not by
    // the mesh: darts could never reach the part sticking out, silently biasing
    // the estimate low while the picture showed a shape that fit.
    const { S, blobR } = shapes();
    for (const s of S) {
      for (let i = 0; i < 12000; i++) {
        const x = (i % 37) / 36 - 0.5, y = ((i * 7) % 41) / 40 - 0.5, z = ((i * 13) % 43) / 42 - 0.5;
        if (s.inside(x, y, z)) {
          expect(Math.max(Math.abs(x), Math.abs(y), Math.abs(z)), s.id + ' claims a point outside the box')
            .toBeLessThanOrEqual(0.5);
        }
      }
    }
    // Potato: sweep directions for the true maximum radius, not a random sample.
    // 120 steps is 1.5° resolution, far finer than this smooth function varies.
    let maxR = 0;
    for (let i = 0; i <= 120; i++) {
      for (let j = 0; j <= 120; j++) {
        const th = (Math.PI * i) / 120, ph = (2 * Math.PI * j) / 120;
        maxR = Math.max(maxR, blobR(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)));
      }
    }
    expect(maxR, 'potato radius ' + maxR.toFixed(4) + ' would poke through the box wall').toBeLessThan(0.5);
  }, 20000);

  it('claims no exact volume for the shape that has none', () => {
    const { S } = shapes();
    const blob = S.find((s) => s.exact == null);
    expect(blob, 'the no-formula shape is the pedagogical payoff — do not remove it').toBeTruthy();
    expect(blob.formula).toBeNull();
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const html = renderTool('probability', { probability: { mode: 'volume3d', v3Shape: blob.id, _v3Engine: 'ready', v3Total: 9000, v3Inside: 2033 } });
    expect(html).toContain('No volume formula');
    expect(html, 'invented an exact value for a shape that has none').not.toContain('Exact volume');
  });

  it('renders in every engine state, and never strands the student without numbers', () => {
    for (const engine of [undefined, 'loading', 'ready', 'failed', 'webgl-failed']) {
      for (const shape of ['sphere', 'cone', 'pyramid', 'blob']) {
        resetStemLab();
        loadTool('stem_lab/stem_tool_probability.js', 'probability');
        let html;
        expect(() => { html = renderTool('probability', { probability: {
          mode: 'volume3d', v3Shape: shape, _v3Engine: engine, v3Total: 8000, v3Inside: 4187 } }); },
          shape + ' / ' + String(engine) + ' threw').not.toThrow();
        // The experiment is arithmetic, not graphics: the readout survives a
        // blocked CDN or a device with no WebGL.
        expect(html, 'no estimate for ' + shape + ' / ' + String(engine)).toContain('Estimated volume');
      }
    }
  });

  it('describes the scene in words for anyone who cannot see it', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const html = renderTool('probability', { probability: { mode: 'volume3d', v3Shape: 'sphere', _v3Engine: 'ready', v3Total: 8000, v3Inside: 4187 } });
    const label = (/aria-label="(A 1 by 1[^"]*)"/.exec(html) || [])[1];
    expect(label, 'canvas has no text equivalent').toBeTruthy();
    expect(label).toContain('8,000 darts');
    expect(label).toContain('4,187 landed inside');
    expect(label).toMatch(/estimated volume is 0\.5234/);
  });

  it('does not show the 2D trial machinery in 3D mode', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const html = renderTool('probability', { probability: { mode: 'volume3d', trials: 500, results: ['inside', 'outside'], v3Total: 500, v3Inside: 262 } });
    for (const leak of ['Fairness (α=0.05)', 'Last 30 Results', 'Convergence to Expected']) {
      expect(html, 'leaked into 3D mode: ' + leak).not.toContain(leak);
    }
  });

  it('leaves all twelve original modes rendering', () => {
    for (const mode of ['coin', 'dice', 'dice2', 'spinner', 'sports', 'marbleBag', 'custom', 'tree', 'pi', 'birthday', 'monty', 'galton']) {
      resetStemLab();
      loadTool('stem_lab/stem_tool_probability.js', 'probability');
      expect(() => renderTool('probability', { probability: { mode, trials: 40, results: ['H', 'T'] } }), mode + ' threw').not.toThrow();
    }
  });

  it('is reachable and steerable by keyboard', () => {
    // OrbitControls is pointer-only. Without a focusable canvas and a key
    // handler, a keyboard user cannot turn the solid at all — and turning it is
    // the whole reason the cloud is in 3D rather than a number.
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
    const html = renderTool('probability', { probability: { mode: 'volume3d', _v3Engine: 'ready', v3Total: 100, v3Inside: 52 } });
    const tag = /<canvas[^>]*>/.exec(html);
    expect(tag, 'no canvas rendered').toBeTruthy();
    expect(tag[0], 'canvas is not focusable').toMatch(/tabindex="0"/i);
    expect(tag[0], 'keyboard shortcuts not advertised to AT').toMatch(/aria-keyshortcuts=/i);
    expect(SRC, 'key handler not wired').toMatch(/onKeyDown:\s*_v3Keys/);
    // The handler must stop arrow keys scrolling the page out from under the view.
    const fn = SRC.slice(SRC.indexOf('function _v3Keys'), SRC.indexOf('function _v3Reduced'));
    expect(fn).toMatch(/preventDefault/);
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      expect(fn, key + ' not handled').toContain(key);
    }
  });

  it('orbits without drifting the camera or flipping at the poles', () => {
    const start = SRC.indexOf('function _v3Orbit');
    const end = SRC.indexOf('function _v3Keys');
    const cam = { position: { x: 1.45, y: 1.05, z: 1.6, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, lookAt() {} };
    const sandbox = { Math, _v3: { camera: cam, controls: null } };
    vm.runInNewContext(SRC.slice(start, end) + '\nout = { orbit: _v3Orbit, zoom: _v3Zoom };', sandbox);
    const radius = () => Math.sqrt(cam.position.x ** 2 + cam.position.y ** 2 + cam.position.z ** 2);
    const r0 = radius();
    // Rotating must not creep the camera toward or away from the solid.
    for (let i = 0; i < 200; i++) sandbox.out.orbit(0.18, 0.18);
    expect(Math.abs(radius() - r0), 'camera drifted while orbiting').toBeLessThan(1e-9);
    expect(Math.abs(Math.asin(cam.position.y / radius())), 'pitch reached the pole and the view flips').toBeLessThan(1.4501);
    for (let i = 0; i < 200; i++) sandbox.out.orbit(-0.18, -0.18);
    expect(Math.abs(Math.asin(cam.position.y / radius()))).toBeLessThan(1.4501);
    // Zoom stays inside the same bounds OrbitControls enforces for the mouse.
    for (let i = 0; i < 40; i++) sandbox.out.zoom(1 / 1.15);
    expect(radius()).toBeCloseTo(1.1, 6);
    for (let i = 0; i < 80; i++) sandbox.out.zoom(1.15);
    expect(radius()).toBeCloseTo(5, 6);
  });

  it('is offered by the guided routes and has an earnable badge', () => {
    // A mode absent from every route is a mode students find only by scanning
    // the full button row.
    expect(SRC, 'volume3d is in no route').toMatch(/modes: \['pi', 'volume3d', 'tree'\]/);
    // And the badge must be improvable by throwing more darts — the failure mode
    // of the old Pi Hunter, which capped out as a coin flip.
    expect(SRC).toMatch(/id:'volumeSurveyor'/);
    const P = { sphere: Math.PI / 6, cone: Math.PI / 12, pyramid: 1 / 3 };
    for (const p of Object.values(P)) {
      const seAt5k = Math.sqrt((p * (1 - p)) / 5000);
      const seAt20k = Math.sqrt((p * (1 - p)) / 20000);
      expect(0.01 / seAt5k, 'badge trivially easy at the 5,000-dart floor').toBeLessThan(2);
      expect(0.01 / seAt20k, 'badge does not become reliable with more darts').toBeGreaterThan(2.5);
    }
  });

  it('mounts 3D through a stable module-scope ref, never an inline arrow', () => {
    // An inline ref is a new function identity every render, and React tears
    // down and re-runs a ref whose identity changed — the scene would be rebuilt
    // on every state change. Also: no hooks, since a hook inside a conditional
    // mode branch crashes the host on navigation.
    expect(SRC).toMatch(/ref:\s*_v3Attach/);
    expect(SRC).toMatch(/function _v3Attach/);
    const branch = SRC.slice(SRC.indexOf("d.mode === 'volume3d' && (function"), SRC.indexOf("d.mode === 'birthday' && (function"));
    expect(branch.length).toBeGreaterThan(500);
    expect(branch, 'React hook inside the 3D mode branch').not.toMatch(/React\.use[A-Z]/);
    // display:block on the canvas — inline is a line box, and measuring it to
    // size the renderer grows the parent every frame.
    expect(SRC).toMatch(/canvas\.style\.display\s*=\s*'block'/);
  });
});

describe('Probability Lab screen-reader equivalents', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });

  it('never puts an aria-label on a roleless generic element', () => {
    // A bare div is role=generic, and ARIA prohibits an accessible name there —
    // the label is dropped outright. These strips are colour squares with no
    // text, so the label being dropped left nothing at all for AT.
    const GENERIC = ['div', 'span', 'p', 'ul', 'ol', 'li', 'td', 'tr', 'tbody', 'thead', 'table', 'label'];
    const re = /createElement\(\s*['"](\w+)['"]\s*,\s*\{/g;
    const offenders = [];
    let m;
    while ((m = re.exec(SRC))) {
      if (!GENERIC.includes(m[1])) continue;
      let depth = 0, end = re.lastIndex - 1;
      for (let i = re.lastIndex - 1; i < SRC.length; i++) {
        if (SRC[i] === '{') depth++;
        else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      const props = SRC.slice(m.index, end + 1);
      if (/'aria-label'|"aria-label"/.test(props) && !/\brole\s*:/.test(props) && !/aria-hidden/.test(props)) {
        offenders.push('<' + m[1] + '> at char ' + m.index);
      }
    }
    expect(offenders, 'aria-label on roleless generic element(s): ' + offenders.join('; ')).toEqual([]);
  });

  it('describes the Monty Hall outcome strips with real counts', () => {
    const html = renderTool('probability', { probability: { mode: 'monty',
      monty: { stage: 'pick', prizeDoor: 0, picked: null, revealed: null, finalChoice: null, won: false },
      montyStats: { switchWins: 6, switchN: 9, stayWins: 2, stayN: 7 },
      montyStrip: { stay: [true, false, false], switch: [true, true, false, true] } } });
    expect(html).toMatch(/Last 3 manual Stay plays: 1 win, 2 losses/);
    expect(html).toMatch(/Last 4 manual Switch plays: 3 wins, 1 loss/);
    expect(html).toContain('Most recent last: win, loss, loss.');
  });

  it('names the recent-outcomes strip with the outcomes themselves', () => {
    const html = renderTool('probability', { probability: { mode: 'dice', diceSides: 6, trials: 4, results: [3, 1, 6, 2] } });
    expect(html).toContain('Last 4 outcomes, oldest first: 3, 1, 6, 2');
  });
});

describe('Probability Lab distribution shape discovery', () => {
  const render = (distribHunt) =>
    renderTool('probability', { probability: { distribHunt: Object.assign({ sampleNonce: 0, log: [] }, distribHunt) } });
  const summary = (html) => (/aria-label="Expected versus observed: ([^"]+)"/.exec(html) || [])[1];
  const observed = (html) => [...summary(html).matchAll(/(\d+) of 60/g)].map((m) => Number(m[1]));

  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_probability.js', 'probability');
  });

  it('draws expected rules, observed bars and the raw draws', () => {
    const html = render({ pLow: 33, pMid: 34, pHigh: 33 });
    expect((html.match(/border-top:2px dashed/g) || []).length).toBe(3);
    expect((html.match(/width:8px;height:8px/g) || []).length).toBe(60);
    expect(summary(html)).toMatch(/low \d+ of 60/);
  });

  it('redraws the sample when a weight moves — not just the label', () => {
    const flat = render({ pLow: 33, pMid: 34, pHigh: 33 });
    const peaked = render({ pLow: 10, pMid: 80, pHigh: 10 });
    expect(summary(flat)).not.toBe(summary(peaked));
    expect(observed(peaked)[1]).toBeGreaterThan(observed(flat)[1]);
  });

  it('is deterministic per setting, and re-rolls only on New sample', () => {
    const a = render({ pLow: 20, pMid: 60, pHigh: 20 });
    const b = render({ pLow: 20, pMid: 60, pHigh: 20 });
    const c = render({ pLow: 20, pMid: 60, pHigh: 20, sampleNonce: 1 });
    expect(summary(a)).toBe(summary(b));
    expect(summary(c)).not.toBe(summary(a));
  });

  it('tracks the weights monotonically across a sweep', () => {
    const mids = [0, 25, 50, 75, 100].map((pMid) => observed(render({ pLow: 25, pMid, pHigh: 25 }))[1]);
    expect(mids[0]).toBeLessThan(mids[4]);
    expect(mids[4]).toBeGreaterThan(30);
    expect(mids[0]).toBeLessThan(5);
    // Every sample is exactly 60 draws, whatever the weights.
    for (const pMid of [0, 40, 100]) {
      expect(observed(render({ pLow: 25, pMid, pHigh: 25 })).reduce((a, b) => a + b, 0)).toBe(60);
    }
  });
});
