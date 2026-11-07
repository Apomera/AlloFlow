// Cellular Automaton Lab stage B (2026-11-03): rule families, von Neumann
// neighbourhoods, the spaceship detector, Langton's ant and the K-5 glider
// mission, all checked by RUNNING the pure engines the tool exports.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
// CELLULAR_TOOL_FILE lets the suite run against the pre-stage-B backup to prove each gate can fail.
const TOOL_FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';

let P;
beforeAll(() => {
  resetStemLab();
  loadTool(TOOL_FILE, 'cellularLab');
  P = window.__alloCellularPure;
});
const flat = (rows) => Uint8Array.from(rows.flat());
const toRows = (cells, n) => Array.from({ length: n }, (_, r) => Array.from(cells.slice(r * n, r * n + n)));

describe('rule families engine', () => {
  it('Life on the family engine equals the Life engine generation by generation', () => {
    let g = P.soupGrid(30, 30, 0.35, 7), cells = flat(g);
    const life = P.famRule('3', '23', 2, 'moore');
    for (let i = 0; i < 40; i++) {
      cells = P.famStep(cells, 30, 30, life, true); g = P.stepLife(g, true, '3', '23');
      expect(Array.from(cells).join(''), 'gen ' + (i + 1)).toBe(g.flat().join(''));
    }
  });
  it('Brian’s Brain: alive -> dying -> empty, and dying cells are not counted as live neighbours', () => {
    const brain = P.famRule('2', '', 3, 'moore'), n = 7;
    let c = new Uint8Array(n * n); c[3 * n + 3] = 1;
    c = P.famStep(c, n, n, brain, false); expect(c[3 * n + 3]).toBe(2);
    c = P.famStep(c, n, n, brain, false); expect(c[3 * n + 3]).toBe(0);
    // An empty cell beside two DYING cells stays empty; beside two ALIVE cells it is born.
    const d = new Uint8Array(n * n); d[2 * n + 2] = 2; d[2 * n + 4] = 2;
    expect(P.famStep(d, n, n, brain, false)[2 * n + 3]).toBe(0);
    const a = new Uint8Array(n * n); a[2 * n + 2] = 1; a[2 * n + 4] = 1;
    expect(P.famStep(a, n, n, brain, false)[2 * n + 3]).toBe(1);
  });
  it('Seeds: no cell survives, and a cell with exactly 2 live neighbours is born', () => {
    const seeds = P.famRule('2', '', 2, 'moore'), n = 6, c = new Uint8Array(n * n);
    c[2 * n + 2] = 1; c[2 * n + 3] = 1;
    const next = P.famStep(c, n, n, seeds, false);
    expect(next[2 * n + 2]).toBe(0); expect(next[2 * n + 3]).toBe(0);
    expect(next[1 * n + 2]).toBe(1); expect(next[3 * n + 3]).toBe(1);
  });
  it('von Neumann counts only the 4 side neighbours (diagonals do not count)', () => {
    const n = 5, c = new Uint8Array(n * n); c[1 * n + 1] = 1; c[1 * n + 3] = 1; c[3 * n + 1] = 1; // three diagonal neighbours of (2,2)
    expect(P.famStep(c, n, n, P.famRule('3', '23', 2, 'moore'), false)[2 * n + 2]).toBe(1);
    expect(P.famStep(c, n, n, P.famRule('3', '23', 2, 'vn'), false)[2 * n + 2]).toBe(0);
    const s = new Uint8Array(n * n); s[1 * n + 2] = 1; s[2 * n + 1] = 1; s[2 * n + 3] = 1; // three side neighbours
    expect(P.famStep(s, n, n, P.famRule('3', '23', 2, 'vn'), false)[2 * n + 2]).toBe(1);
  });
  it('rules are normalised: no B0, no counts above 4 with 4 neighbours, Golly-style names', () => {
    const r = P.famRule('0368', '2357', 2, 'vn');
    expect(r.birth).toBe('3'); expect(r.survive).toBe('23');
    expect(P.famRuleName(r)).toBe('B3/S23V');
    expect(P.famRuleName(P.famRule('2', '', 3, 'moore'))).toBe('B2/S/C3');
    expect(P.famRuleName(P.famRule('36', '23', 2, 'moore'))).toBe('B36/S23');
  });
});

describe('measuring a rule (the classifier the predictions are checked against)', () => {
  const size = 48;
  const place = (cells) => { const c = new Uint8Array(size * size); cells.forEach(([r, k]) => { c[(20 + r) * size + 20 + k] = 1; }); return c; };
  const life = () => P.famRule('3', '23', 2, 'moore');
  it('a glider is a spaceship moving 1 diagonal cell per 4 generations; a block settles; a blinker repeats every 2; one cell dies', () => {
    const g = P.famMeasure(life(), 1, { cells: place([[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]]) });
    expect(g.outcome).toBe('spaceship');
    expect(g.ship.period).toBe(4); expect(Math.abs(g.ship.dr)).toBe(1); expect(Math.abs(g.ship.dc)).toBe(1); expect(g.ship.cells).toBe(5);
    const b = P.famMeasure(life(), 1, { cells: place([[0, 0], [0, 1], [1, 0], [1, 1]]) });
    expect(b.outcome).toBe('settles'); expect(b.period).toBe(1);
    const bl = P.famMeasure(life(), 1, { cells: place([[0, 0], [0, 1], [0, 2]]) });
    expect(bl.outcome).toBe('settles'); expect(bl.period).toBe(2);
    expect(P.famMeasure(life(), 1, { cells: place([[0, 0]]) }).outcome).toBe('dies');
  });
  it('nothing outruns light: a shape that jumps 5 cells in one generation is not a spaceship', () => {
    const shape = [[0, 0], [0, 1], [1, 0]];
    const frame = (dc) => { const c = new Uint8Array(size * size); shape.forEach(([r, k]) => { c[(10 + r) * size + 10 + k + dc] = 1; }); return c; };
    expect(P.famFindSpaceship([frame(0), frame(5), frame(10)], size, size, 1, 'moore')).toBeNull();
    expect(P.famFindSpaceship([frame(0), frame(1), frame(2)], size, size, 1, 'moore')).toEqual({ period: 1, dr: 0, dc: 1, cells: 3 });
    // With 4 neighbours a diagonal step of (1,1) needs at least 2 generations.
    const diag = (k) => { const c = new Uint8Array(size * size); shape.forEach(([r, q]) => { c[(10 + r + k) * size + 10 + q + k] = 1; }); return c; };
    expect(P.famFindSpaceship([diag(0), diag(1), diag(2)], size, size, 1, 'vn')).toBeNull();
    expect(P.famFindSpaceship([diag(0), diag(1), diag(2)], size, size, 1, 'moore')).not.toBeNull();
  });
  it('the three families behave differently on the same 10 seeded patches', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const lifeM = P.famMeasureMany(life(), seeds), seeds2 = P.famMeasureMany(P.famRule('2', '', 2, 'moore'), seeds), brain = P.famMeasureMany(P.famRule('2', '', 3, 'moore'), seeds);
    expect(lifeM.tally.explodes).toBe(0); expect(lifeM.tally.settles).toBeGreaterThan(0); expect(lifeM.tally.spaceship).toBeGreaterThan(0);
    expect(seeds2.top).toBe('explodes');
    expect(brain.top).toBe('spaceship');
    // The same Brian's Brain rule with 4 neighbours cannot sustain itself.
    expect(P.famMeasureMany(P.famRule('2', '', 3, 'vn'), seeds).top).toBe('dies');
  });
  it('rule-space neighbours: 16 one-change rules around Life, several of which still carry spaceships', () => {
    const nbs = P.famNeighbourRules(life()), names = nbs.map(P.famRuleName);
    expect(nbs.length).toBe(16);
    expect(new Set(names).size).toBe(16);
    expect(names).toContain('B36/S23');
    const ships = nbs.filter((r) => P.famMeasureMany(r, [1, 2, 3]).ship).map(P.famRuleName);
    expect(ships.length).toBeGreaterThanOrEqual(3);
    expect(ships).toContain('B36/S23');
  });
  it('random rules never include B0, and noLowBirth leaves out B1 and B2', () => {
    const rnd = P.seededRng(9, 1);
    for (let i = 0; i < 200; i++) {
      const r = P.famRandomRule(rnd, 'moore', { noLowBirth: true });
      expect(r.B[0]).toBe(0); expect(r.B[1]).toBe(0); expect(r.B[2]).toBe(0); expect(r.birth.length).toBeGreaterThan(0);
      const v = P.famRandomRule(rnd, 'vn', {});
      expect(v.max).toBe(4); expect(/[5-8]/.test(v.birth + v.survive)).toBe(false);
    }
  });
});

describe('Langton’s ant', () => {
  it('follows the rule: right on white, left on black, flip, step', () => {
    const st = P.antInit();
    const seen = [];
    for (let i = 0; i < 5; i++) { P.antAdvance(st, 1); seen.push([st.r, st.c, st.dir]); }
    expect(seen).toEqual([[0, 1, 1], [1, 1, 2], [1, 0, 3], [0, 0, 0], [0, -1, 3]]);
    expect(st.blackCount).toBe(3);
  });
  it('the highway is measured: from step 9,977 every move repeats 104 steps later, carrying the ant 2 squares diagonally', () => {
    const hw = P.antHighway();
    expect(hw.onset).toBe(9977); expect(hw.period).toBe(104);
    expect(Math.abs(hw.dr)).toBe(2); expect(Math.abs(hw.dc)).toBe(2);
    const p0 = P.antAt(hw.onset);
    for (const k of [1, 5, 15]) { const pk = P.antAt(hw.onset + 104 * k); expect([pk.r - p0.r, pk.c - p0.c]).toEqual([k * hw.dr, k * hw.dc]); }
    // Before the onset the walk does not yet repeat with that displacement.
    const q0 = P.antAt(5000), q1 = P.antAt(5104);
    expect([q1.r - q0.r, q1.c - q0.c]).not.toEqual([hw.dr, hw.dc]);
  });
  it('generated position problems: the key is the real run, and each wrong idea gets its own tag', () => {
    let sawExtra = false;
    for (let s = 1; s <= 30; s++) {
      for (const band of ['g68', 'g912']) {
        const pr = P.makeAntProblem(s, band), truth = P.antAt(pr.target);
        expect(pr.base).toBeGreaterThanOrEqual(P.antHighway().onset + 104);
        expect([pr.r, pr.c]).toEqual([truth.r, truth.c]);
        expect(P.gradeAntProblem(pr, pr.c, pr.r)).toEqual({ correct: true, tag: null });
        expect(P.gradeAntProblem(pr, pr.baseC + pr.dc, pr.baseR + pr.dr).tag).toBe('one_period');
        expect(P.gradeAntProblem(pr, pr.baseC - pr.k * pr.dc, pr.baseR - pr.k * pr.dr).tag).toBe('direction');
        expect(P.gradeAntProblem(pr, pr.baseC, pr.baseR).tag).toBe('no_move');
        if (band === 'g68') expect(pr.extra).toBe(0);
        if (pr.extra) { sawExtra = true; expect(P.gradeAntProblem(pr, pr.baseC + pr.k * pr.dc, pr.baseR + pr.k * pr.dr).tag).toBe('extra'); }
      }
    }
    expect(sawExtra).toBe(true);
  });
});

describe('K-5 glider mission', () => {
  it('each heading really flies that way, and reaches only its own corner star (at generation 16)', () => {
    for (const hd of ['nw', 'ne', 'sw', 'se']) {
      expect(P.gliderMeasure(hd).heading).toBe(hd);
      for (const star of ['nw', 'ne', 'sw', 'se']) expect(P.gliderReaches(hd, P.GLIDER_STARS[star], 24), hd + '->' + star).toBe(hd === star ? 16 : null);
    }
  });
  it('rounds are seeded, and a wrong guess is named by which half was wrong', () => {
    expect(P.makeGliderRound(42)).toEqual(P.makeGliderRound(42));
    const heads = new Set(); for (let s = 1; s <= 40; s++) heads.add(P.makeGliderRound(s).heading);
    expect(heads.size).toBe(4);
    expect(P.gliderPickTag('se', 'se')).toBeNull();
    expect(P.gliderPickTag('se', 'nw')).toBe('opposite');
    expect(P.gliderPickTag('se', 'ne')).toBe('updown');
    expect(P.gliderPickTag('se', 'sw')).toBe('leftright');
  });
});
