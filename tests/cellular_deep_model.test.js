// Cellular Automaton Lab deep pass (2026-11-03): the model, run not read.
// Every gallery claim, challenge verdict, practice generator and real-world
// model is checked by running the pure helpers the tool exports.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the pre-pass backup to prove each gate can fail.
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';

let P;
beforeAll(() => {
  resetStemLab();
  loadTool(TOOL_FILE, 'cellularLab');
  P = window.__alloCellularPure;
});
const centred = (size, key) => { const pat = P.patterns[key]; return P.stampPattern(P.emptyGrid(size, size), key, Math.floor((size - pat.h) / 2), Math.floor((size - pat.w) / 2)); };

describe('gallery patterns behave as their kind and blurb say', () => {
  it('MWSS has 11 cells and HWSS 13 (the stray [2,0] cell is gone)', () => {
    expect(P.patterns.mwss.cells.length).toBe(11);
    expect(P.patterns.hwss.cells.length).toBe(13);
    expect(P.patterns.mwss.cells.some((c) => c[0] === 2 && c[1] === 0)).toBe(false);
    expect(P.patterns.hwss.cells.some((c) => c[0] === 2 && c[1] === 0)).toBe(false);
  });
  it('every spaceship keeps its shape and moves every 4 generations', () => {
    for (const k of ['glider', 'lwss', 'mwss', 'hwss']) {
      let g = centred(60, k); const f0 = P.shapeFingerprint(g);
      g = P.lifeJump(g, 4, false, '3', '23'); const f1 = P.shapeFingerprint(g);
      expect(f1.signature, k).toBe(f0.signature);
      expect(Math.abs(f1.minR - f0.minR) + Math.abs(f1.minC - f0.minC), k).toBeGreaterThan(0);
      expect(P.countPop(g), k).toBe(P.patterns[k].cells.length);
    }
  });
  it('the Patterns tab classifier labels each pattern as its kind, with the stated periods', () => {
    const expected = { block: ['still'], beehive: ['still'], loaf: ['still'], boat: ['still'], blinker: ['oscillator', 2], toad: ['oscillator', 2], beacon: ['oscillator', 2], pulsar: ['oscillator', 3], glider: ['spaceship', 4], lwss: ['spaceship', 4], mwss: ['spaceship', 4], hwss: ['spaceship', 4], rpentomino: ['evolving'], acorn: ['evolving'], diehard: ['evolving'], pihept: ['evolving'], gosperGun: ['evolving'] };
    for (const [k, [kind, period]] of Object.entries(expected)) {
      const j = P.analyzePatternJourney(P.patterns[k], 16);
      expect(j.kind, k).toBe(kind);
      if (period) expect(j.period, k).toBe(period);
    }
  });
  it('Diehard dies at generation 130 on every grid size and edge type', () => {
    for (const size of [40, 60, 80, 120]) for (const wrap of [true, false]) {
      const r = P.lifeRun(centred(size, 'diehard'), { wrap, maxGen: 400 });
      expect([r.end, r.lifetime], size + ' ' + wrap).toEqual(['extinct', 130]);
    }
  });
  it('Pi-heptomino settles after 173 generations on every grid of 60 x 60 or larger', () => {
    for (const size of [60, 80, 120]) for (const wrap of [true, false]) expect(P.lifeRun(centred(size, 'pihept'), { wrap, maxGen: 1000 }).lifetime, size + ' ' + wrap).toBe(173);
  });
  it('R-pentomino reproduces 1,103 on 120 x 120 with fixed edges (its "fits" setting), not on the old 40 x 40 wrap', () => {
    expect(P.patterns.rpentomino.fits).toEqual({ size: 120, wrap: false });
    expect(P.lifeRun(centred(120, 'rpentomino'), { wrap: false, maxGen: 3000 }).lifetime).toBe(1103);
    expect(P.lifeRun(centred(40, 'rpentomino'), { wrap: true, maxGen: 3000 }).lifetime).not.toBe(1103);
  });
  it('Acorn cannot reach its endless-plane 5,206 here (the blurb says so)', () => {
    for (const [size, wrap] of [[120, false], [120, true], [40, true]]) {
      const r = P.lifeRun(centred(size, 'acorn'), { wrap, maxGen: 6000 });
      expect(r.lifetime, size + ' ' + wrap).toBeLessThan(5206);
    }
  });
  it('Gosper gun: one new glider (5 cells) every 30 generations on a big grid', () => {
    let g = centred(120, 'gosperGun'); const pops = [P.countPop(g)];
    for (let i = 1; i <= 4; i++) { g = P.lifeJump(g, 30, false, '3', '23'); pops.push(P.countPop(g)); }
    expect(pops).toEqual([36, 41, 46, 51, 56]);
  });
  it('Gosper gun keeps firing with fixed edges on every size; with wrapping edges on 40 x 40 it is wrecked', () => {
    for (const size of [40, 60, 80, 120]) {
      const r = P.lifeRun(centred(size, 'gosperGun'), { wrap: false, maxGen: 2000 });
      expect(r.end, String(size)).toBe('cycle');
      expect(r.period % 30, String(size)).toBe(0);
    }
    const wrapped = P.lifeRun(centred(40, 'gosperGun'), { wrap: true, maxGen: 2000 });
    expect(wrapped.end).toBe('still');
  });
});

describe('fast engine', () => {
  it('matches the reference stepLife on soups, rules and both edge types', () => {
    for (const wrap of [true, false]) for (const [b, s] of [['3', '23'], ['36', '23'], ['2', ''], ['3678', '34678']]) for (let seed = 1; seed < 4; seed++) {
      let g = P.soupGrid(17, 23, 0.37, seed); const fast = P.lifeJump(g, 13, wrap, b, s);
      for (let i = 0; i < 13; i++) g = P.stepLife(g, wrap, b, s);
      expect(P.gridSignature(fast)).toBe(P.gridSignature(g));
    }
  });
  it('detects still lifes, cycles and extinction with the generation they start', () => {
    expect(P.lifeRun(centred(20, 'block'), { maxGen: 10 })).toMatchObject({ end: 'still', lifetime: 0, period: 1 });
    expect(P.lifeRun(centred(20, 'blinker'), { maxGen: 10 })).toMatchObject({ end: 'cycle', lifetime: 0, period: 2 });
    expect(P.lifeRun(P.emptyGrid(5, 5), { maxGen: 10 })).toMatchObject({ end: 'extinct', lifetime: 0 });
  });
});

describe('seeded soups', () => {
  it('same seed gives the same soup; different seeds differ; density is respected', () => {
    expect(P.gridSignature(P.soupGrid(40, 40, 0.3, 7))).toBe(P.gridSignature(P.soupGrid(40, 40, 0.3, 7)));
    expect(P.gridSignature(P.soupGrid(40, 40, 0.3, 7))).not.toBe(P.gridSignature(P.soupGrid(40, 40, 0.3, 8)));
    for (const d of [0.1, 0.3, 0.7]) expect(Math.abs(P.countPop(P.soupGrid(60, 60, d, 3)) / 3600 - d)).toBeLessThan(0.03);
    // the old randomGrid ignored any seed: identical soup every press
    expect(P.gridSignature(P.randomGrid(40, 40, 0.3))).toBe(P.gridSignature(P.randomGrid(40, 40, 0.3)));
  });
  it('the elementary-CA random row is seeded, not tied to the rule number', () => {
    expect(P.seededRow(81, 0.5, 4).join('')).toBe(P.seededRow(81, 0.5, 4).join(''));
    expect(P.seededRow(81, 0.5, 4).join('')).not.toBe(P.seededRow(81, 0.5, 5).join(''));
  });
});

describe('rule-number field parsing', () => {
  it('accepts 0-255 whole numbers and rejects drafts instead of snapping', () => {
    expect(P.parseRuleNumber('9')).toBe(9);
    expect(P.parseRuleNumber('255')).toBe(255);
    expect(P.parseRuleNumber('0')).toBe(0);
    for (const bad of ['', '256', '309', '-1', '1.5', 'abc', '1000']) expect(P.parseRuleNumber(bad), bad).toBeNull();
  });
});

describe('challenge verdicts', () => {
  const v = (id, s) => P.challengeVerdict(id, Object.assign({ gen: 1, initialSig: 'A', initialPop: 4, sig: 'A', pop: 4, peak: 4, repeatOf: null }, s));
  it('Oscillator: a still life (unchanged at gen 1) fails; returning at gen >= 2 passes', () => {
    expect(v('oscillator', { gen: 1, sig: 'A' })).toMatchObject({ status: 'fail', code: 'osc_is_still' });
    expect(v('oscillator', { gen: 2, sig: 'A' })).toMatchObject({ status: 'success', values: { period: 2 } });
    expect(v('oscillator', { gen: 1, sig: 'B' })).toBeNull();
  });
  it('Methuselah: settling (a repeat) before generation 50 fails; still changing at 50 passes', () => {
    expect(v('methuselah', { gen: 1, repeatOf: 0, initialPop: 4 })).toMatchObject({ status: 'fail', code: 'meth_settled' });
    expect(v('methuselah', { gen: 50, sig: 'Z', initialPop: 5 })).toMatchObject({ status: 'success' });
    expect(v('methuselah', { gen: 3, initialPop: 6 })).toMatchObject({ code: 'meth_too_many' });
  });
  it('Extinction: fewer than 4 cells or dying in one step is refused', () => {
    expect(v('extinction', { initialPop: 1, pop: 0 })).toMatchObject({ status: 'fail', code: 'ext_need4' });
    expect(v('extinction', { initialPop: 4, pop: 0, gen: 1 })).toMatchObject({ status: 'fail', code: 'ext_too_fast' });
    expect(v('extinction', { initialPop: 4, pop: 0, gen: 3 })).toMatchObject({ status: 'success' });
    expect(v('extinction', { initialPop: 4, gen: 5, repeatOf: 2, sig: 'Q' })).toMatchObject({ code: 'ext_settled' });
  });
  it('Population Boom needs real growth', () => {
    expect(v('maxpop', { initialPop: 5, gen: 50, peak: 5 })).toMatchObject({ status: 'fail' });
    expect(v('maxpop', { initialPop: 5, gen: 50, peak: 9 })).toMatchObject({ status: 'success' });
  });
  it('the R-pentomino really is still changing at generation 50 (the methuselah answer exists)', () => {
    const r = P.lifeRun(centred(40, 'rpentomino'), { wrap: true, maxGen: 50 });
    expect(r.end).toBe('unsettled');
  });
});

describe('generated practice', () => {
  it('next-generation boards scale by band and always contain a birth, a death and a survival', () => {
    for (const [band, size] of [['k5', 4], ['g68', 5], ['g912', 6]]) for (let seed = 1; seed <= 25; seed++) {
      const p = P.makeNextGenProblem(seed, band);
      expect(p.size).toBe(size);
      const n = P.stepLifeDetailed(p.board, null, false, p.birth, p.survive);
      expect(P.gridSignature(n.grid)).toBe(P.gridSignature(p.next));
      expect(n.born > 0 && n.died > 0 && n.survived > 0, band + seed).toBe(true);
    }
  });
  it('grading accepts the true next generation and names the misconception behind each wrong cell', () => {
    const p = P.makeNextGenProblem(5, 'g68');
    expect(P.gradeNextGen(p, p.next).correct).toBe(true);
    const copy = P.gradeNextGen(p, p.board); // "nothing changes" answer
    expect(copy.correct).toBe(false);
    const sum = Object.values(copy.tags).reduce((a, b) => a + b, 0);
    expect(sum).toBe(copy.wrong);
    // an all-alive answer must flag false births for empty cells that are not born
    const all = P.gradeNextGen(p, p.board.map((r) => r.map(() => 1)));
    expect(all.tags.false_birth + all.tags.overcrowd + all.tags.lonely).toBeGreaterThan(0);
  });
  it('the Wolfram class bank agrees with measured behaviour (classes 1-3)', () => {
    for (const rule of P.CLASS_BANK[1]) for (const seed of [1, 2, 3]) expect(P.caMeasure(rule, seed).kind, 'rule ' + rule).toBe('uniform');
    for (const rule of P.CLASS_BANK[2]) for (const seed of [1, 2, 3]) expect(P.caMeasure(rule, seed).kind, 'rule ' + rule).toBe('periodic');
    for (const rule of P.CLASS_BANK[3]) for (const seed of [1, 2, 3]) expect(P.caMeasure(rule, seed).kind, 'rule ' + rule).toBe('irregular');
    expect(P.CLASS_BANK[4]).toEqual([110, 124, 137, 193]);
    const seen = new Set(); for (let s = 1; s < 60; s++) seen.add(P.makeClassProblem(s).cls);
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('predict-check-explain evidence comes from runs', () => {
  it('bigger start: the 5-cell R-pentomino outlasts the 36-cell square', () => {
    const e = P.pceEvidence('bigger');
    expect(e).toMatchObject({ smallCells: 5, bigCells: 36, smallLife: 1103, answer: 'small' });
    expect(e.bigLife).toBeLessThan(20);
  });
  it('glider: cells are born and die; none makes the whole trip', () => {
    const e = P.pceEvidence('glider');
    expect(e.answer).toBe('reborn');
    expect(e.sameShape).toBe(true);
    expect(e.oldest).toBeLessThan(5);
  });
  it('soup: random soups thin out (checked over many seeds)', () => {
    for (let s = 1; s <= 30; s++) {
      const e = P.pceEvidence('soup', s);
      expect(e.answer, 'seed ' + s).toBe('sparse');
      expect(e.endDensity, 'seed ' + s).toBeLessThan(e.startDensity);
    }
  });
  it('edges: only the fixed-edge gun is still firing', () => {
    expect(P.pceEvidence('edges').answer).toBe('fixed_only');
  });
  it('rules: Rule 30 from one cell looks random', () => {
    const e = P.pceEvidence('rules');
    expect(e.answer).toBe('random');
    expect(e.bits.startsWith('11011100110001011001')).toBe(true);
  });
  it('every card answer is one of its options', () => {
    for (const card of P.PCE_CARDS) expect(card.options, card.id).toContain(P.pceEvidence(card.id, 3).answer);
  });
});

describe('real-world models', () => {
  it('forest fire: rarely crosses below 50% trees, almost always above 70%', () => {
    const rate = (d) => { let k = 0; for (let s = 1; s <= 15; s++) if (P.forestRun(30, d, s).summary.crossed) k++; return k / 15; };
    expect(rate(0.45)).toBeLessThanOrEqual(0.1);
    expect(rate(0.75)).toBeGreaterThanOrEqual(0.9);
  });
  it('Rule 184 traffic: flow equals min(density, 1 - density) after the warm-up', () => {
    for (const d of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const r = P.trafficRun(80, d, 4, 200, 100);
      expect(r.flow).toBeCloseTo(Math.min(r.density, 1 - r.density), 2);
    }
  });
  it('Rule 184 traffic conserves cars', () => {
    const r = P.trafficRun(80, 0.6, 2, 60, 0);
    const counts = new Set(r.rows.map((row) => row.reduce((a, b) => a + b, 0)));
    expect([...counts]).toEqual([r.cars]);
  });
  it('epidemic: high vaccination keeps outbreaks small, low vaccination does not', () => {
    const mean = (v) => { let a = 0; for (let s = 1; s <= 8; s++) a += P.epidemicRun(40, v, s).summary.attackRate; return a / 8; };
    expect(mean(0.7)).toBeLessThan(0.1);
    expect(mean(0.3)).toBeGreaterThan(0.5);
  });
});

describe('CSV export', () => {
  it('quotes commas and quotes, and neutralises spreadsheet formulas', () => {
    const csv = P.buildCsv(['a', 'b'], [['x,y', 'say "hi"'], ['=SUM(A1)', 3]]);
    expect(csv).toBe('a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),3');
  });
});
