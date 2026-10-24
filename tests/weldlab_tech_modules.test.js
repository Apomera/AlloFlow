// Lane TECH: Heat Input bead preview, Underwater (one cooling model, hydrogen
// index, predict-first, decisions), Robotics (teach-pendant checker, sorter) and
// Consumables (decoder, tungsten chart, gas bars, cost calculator, scenario fixes).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const readSrc = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');
const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i + a.length); return s.slice(i, j); };
// Comments record the old wording on purpose; negative scans read code only.
const code = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
const core = () => window.__WeldLabCore;
const tech = () => window.__WeldLabCore.tech2;
const render = (state) => renderTool('weldLab', { weldLab: Object.assign({}, state) });
const decode = (html) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
// Student-facing text only: the Teacher Notes quote misconceptions verbatim.
const studentText = (html) => text(html.replace(/<details class="weldlab-teacher-notes[\s\S]*?<\/details>/g, ' '));
const MENU_SIGNATURE = 'Core Simulators';

let realMatchMedia;
beforeEach(() => {
  try { delete window.__alloflowWeldLab; } catch (e) { window.__alloflowWeldLab = undefined; }
  try { localStorage.clear(); } catch (e) {}
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

// ───────────────────────── Heat Input → bead ─────────────────────────
describe('Heat Input bead preview', () => {
  const cases = [
    { hi_V: 22, hi_A: 180, hi_TS: 12, hi_process: 'mig', tech2_hi_th: 0.25 },
    { hi_V: 26, hi_A: 240, hi_TS: 8, hi_process: 'stick', tech2_hi_th: 0.1875 },
    { hi_V: 14, hi_A: 120, hi_TS: 6, hi_process: 'tig', tech2_hi_th: 0.125 },
    { hi_V: 30, hi_A: 320, hi_TS: 5, hi_process: 'mig', tech2_hi_th: 0.375 },
  ];
  cases.forEach((c) => {
    it('shows beadGeometry\'s own numbers at ' + JSON.stringify(c), () => {
      const g = core().beadGeometry(c.hi_V, c.hi_A, c.hi_TS, c.hi_process, 'steel', c.tech2_hi_th);
      const t = text(render(Object.assign({ view: 'heatInput' }, c)));
      expect(t).toContain('What this heat input does to a bead');
      const pct = Math.round(100 * g.penetration / c.tech2_hi_th);
      expect(t).toContain(g.width.toFixed(3) + '"');
      expect(t).toContain(g.reinf.toFixed(3) + '"');
      expect(t).toContain(g.penetration.toFixed(3) + '" (' + pct + '%)');
      expect(t).toContain(Math.round(g.toeAngle) + '°');
      // the aria-label carries the same numbers
      expect(t.length).toBeGreaterThan(0);
      const html = render(Object.assign({ view: 'heatInput' }, c));
      expect(decode(html)).toContain(g.width.toFixed(3) + ' inch wide');
    });
  });

  it('gives the burn-through verdict exactly when the model melts through the plate', () => {
    const c = { hi_V: 30, hi_A: 320, hi_TS: 5, hi_process: 'mig', tech2_hi_th: 0.125 };
    const g = core().beadGeometry(30, 320, 5, 'mig', 'steel', 0.125);
    expect(g.penetration).toBeGreaterThanOrEqual(0.125);
    expect(text(render(Object.assign({ view: 'heatInput' }, c)))).toContain('Melts all the way through this plate');
    const d = text(render({ view: 'heatInput' }));
    expect(d).not.toContain('Melts all the way through this plate');
    expect(d).toContain('Close to the Bead Lab target');
  });

  it('snaps a saved thickness to the Bead Lab\'s four plates and survives a hostile process', () => {
    const t = text(render({ view: 'heatInput', tech2_hi_th: 99, hi_process: '__proto__', hi_V: 'abc' }));
    expect(t).toContain('What this heat input does to a bead');
    expect(t).toContain('On 3/8" plate');
    expect(t).toContain('Arc efficiency: 80%');
    expect(t).not.toContain('NaN');
  });

  it('carries the calculator settings into the Bead Lab and links back to it', () => {
    const calc = between(readSrc(), 'function HeatInputCalculator(', 'function WeldBeadLab(');
    expect(calc).toMatch(/upd\('bl_V', V\); upd\('bl_A', A\); upd\('bl_TS', TS\); upd\('bl_process', P\);/);
    expect(calc).toContain("goto('beadLab')");
    expect(calc).toMatch(/var hiBead = beadGeometry\(V, A, TS, P, 'steel', hiTH\);/);
    // tier messages are translatable now
    ['tech2_hi_tier_low', 'tech2_hi_tier_medium', 'tech2_hi_tier_high', 'tech2_hi_tier_excessive'].forEach((k) => expect(calc).toContain("'stem.weldlab." + k + "'"));
  });
});

// ───────────────────────── Underwater ─────────────────────────
describe('Underwater: one cooling model', () => {
  it('runs several times to an order of magnitude for wet, near air for dry', () => {
    const T = tech();
    expect(T.coolingMultiple('air', 100)).toBe(1);
    let prev = 0;
    for (let d = 0; d <= 300; d += 10) {
      const w = T.coolingMultiple('wet', d), y = T.coolingMultiple('dry', d);
      expect(w).toBeGreaterThanOrEqual(4);
      expect(w).toBeLessThanOrEqual(10);
      expect(w).toBeGreaterThanOrEqual(prev);
      expect(y).toBeGreaterThanOrEqual(1);
      expect(y).toBeLessThanOrEqual(2);
      expect(w).toBeGreaterThan(y);
      prev = w;
    }
    expect(T.coolingMultiple('wet', 'junk')).toBe(T.coolingMultiple('wet', 0));
  });

  it('draws curves whose 800→500 °C time is exactly t8/5 = T85_AIR / multiple', () => {
    const T = tech();
    [1, 1.4, 4, 7.3, 10].forEach((m) => {
      expect(T.timeAt(m, 500) - T.timeAt(m, 800)).toBeCloseTo(T.t85(m), 9);
      expect(T.t85(m) * m).toBeCloseTo(T.T85_AIR, 9);
      expect(T.coolTemp(m, T.timeAt(m, 800))).toBeCloseTo(800, 6);
      expect(T.coolTemp(m, 0)).toBeCloseTo(T.T_PEAK, 9);
    });
  });

  const states = [];
  [0, 30, 100, 150, 300].forEach((d) => ['wet', 'dry'].forEach((tq) => states.push({ uw_depth: d, uw_tech: tq, from: 30 })));
  states.forEach((s) => {
    it('every cooling multiple on screen comes from the model (' + s.uw_tech + ', ' + s.uw_depth + ' ft)', () => {
      const T = tech();
      const html = render({ view: 'underwater', uw_view: 'pressure', uw_depth: s.uw_depth, uw_tech: s.uw_tech, tech2_uw_pred: 'faster', tech2_uw_pred_from: s.from });
      // The independent gas-law reference uses multiplication signs for its
      // pressure/volume formulas. Keep this cooling-rate invariant on every
      // original lesson element; the reference has its own geometry/math suite.
      const coolingContent = document.createElement('div');
      coolingContent.innerHTML = html;
      const gasReferences = coolingContent.querySelectorAll('[data-uw-gas-bench]');
      expect(gasReferences).toHaveLength(1);
      gasReferences[0].remove();
      const t = studentText(coolingContent.innerHTML);
      expect(t).toContain('Why wet welds harden');
      const allowed = new Set([1, T.coolingMultiple('wet', s.uw_depth), T.coolingMultiple('dry', s.uw_depth), T.coolingMultiple('wet', s.from)].map((v) => v.toFixed(1)));
      const shown = [...t.matchAll(/(\d+(?:\.\d+)?)\s?×/g)].map((m) => Number(m[1]).toFixed(1));
      expect(shown.length).toBeGreaterThanOrEqual(4);
      shown.forEach((v) => expect(allowed.has(v), 'unexplained multiple ' + v + '×').toBe(true));
      // the readout card is the technique's own multiple
      expect(t).toContain('Cooling Rate ' + T.coolingMultiple(s.uw_tech, s.uw_depth).toFixed(1) + '×');
      // and no hand-typed "N times faster" figure anywhere a student reads
      // (the model's own "N.N×" figures are checked above; ranges and "N times" are hand-typed)
      expect(t).not.toMatch(/\d+\s*(?:-|to)\s*\d+\s*(?:times|×)/i);
      expect(t).not.toMatch(/\d+\s*times\s+(?:faster|more)/i);
      expect(t).toContain('several times to an order of magnitude');
      // t8/5 card
      expect(t).toContain(T.t85(T.coolingMultiple(s.uw_tech, s.uw_depth)).toFixed(1));
    });
  });

  it('the hero and intro carry no hard-coded multiple either', () => {
    const t = studentText(render({ view: 'underwater' }));
    expect(t).toContain('several times to an order of magnitude faster than air');
    expect(t).not.toMatch(/5-8 times/);
    const src = code(between(readSrc(), '// MODULE 9: UNDERWATER WELDING', '// MODULE 10:'));
    expect(src).not.toMatch(/clamp\(5 \+ depth \* 0\.025/);
    expect(src).not.toContain('25× more efficiently');
    expect(src).toContain('var coolingMult = tech2CoolingMultiple(technique, depth);');
  });

  it('shows a relative hydrogen index with its model, not a percentage', () => {
    const T = tech();
    const t = studentText(render({ view: 'underwater', uw_view: 'pressure', uw_depth: 99, uw_tech: 'wet', tech2_uw_pred: 'skip' }));
    expect(t).toContain('Hydrogen index ' + T.hydrogenIndex('wet', 99).toFixed(1));
    expect(T.hydrogenIndex('wet', 0)).toBeCloseTo(1, 9);
    expect(T.hydrogenIndex('wet', 99)).toBeCloseTo(Math.sqrt(4), 9);
    expect(T.hydrogenIndex('dry', 99)).toBeCloseTo(0.2, 9);
    expect(t).toContain('not a probability');
    expect(t).not.toMatch(/Hydrogen Risk/i);
    expect(t).not.toMatch(/\d+% embrittlement/);
  });

  it('gates the slider behind a prediction and then compares it with the model', () => {
    const before = studentText(render({ view: 'underwater', uw_view: 'pressure' }));
    expect(before).toContain('Predict first');
    expect(before).not.toContain('Cooling Rate');
    const waiting = studentText(render({ view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'same', tech2_uw_pred_from: 30, uw_depth: 50 }));
    expect(waiting).toContain('at least 60 ft away from 30 ft');
    const wrong = studentText(render({ view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'same', tech2_uw_pred_from: 30, uw_depth: 150 }));
    expect(wrong).toContain('Not what the model shows');
    expect(wrong).toContain('at 150 ft, ' + tech().coolingMultiple('wet', 150).toFixed(1) + '×');
    const right = studentText(render({ view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'faster', tech2_uw_pred_from: 30, uw_depth: 150 }));
    expect(right).toContain('Matches the model');
  });

  it('fixes the attribution, AC and fatality facts', () => {
    const intro = studentText(render({ view: 'underwater', uw_view: 'intro' }));
    expect(intro).toContain('Class B under AWS D3.6M');
    expect(intro).not.toMatch(/US Navy spec/);
    expect(intro).toContain('heliox');
    expect(intro).not.toMatch(/inert gas \(argon-helium mix\)/);
    const safety = studentText(render({ view: 'underwater', uw_view: 'safety' }));
    expect(safety).not.toMatch(/illegal/i);
    expect(safety).toContain('normally electrode-negative');
    expect(safety).toContain('AC is avoided because it is a greater shock hazard');
    expect(safety).not.toMatch(/\d+\s*-?\s*\d*\s*× higher/);
    const all = text(render({ view: 'underwater', uw_view: 'safety' }));
    expect(all).not.toMatch(/roughly 10× higher/);
  });

  it('decision set: balanced slots, a whyNot for every wrong option, honest first-pick score', () => {
    const region = between(readSrc(), 'var uwDecisions = [', 'var uwDec = (function');
    const answers = [...region.matchAll(/answer: (\d)/g)].map((m) => Number(m[1]));
    expect(answers).toEqual([0, 1, 2, 3]);
    const blocks = region.split(/answer: \d/).slice(1);
    blocks.forEach((b) => {
      const wn = between(b, 'whyNot: [', ']\n');
      expect((wn.match(/null/g) || []).length).toBe(1);
      expect((wn.match(/__alloT|__alloFill/g) || []).length).toBeGreaterThanOrEqual(3);
    });
    const t = studentText(render({ view: 'underwater', uw_view: 'decide', tech2_uw_dec: { 0: 1, 1: 1, 2: 0, 3: 3 } }));
    expect(t).toContain('Score 2 / 4');
    expect(t).toContain('Why not B:');
    expect(t).toContain('Why not A:');
    expect(t).toContain(tech().t85(tech().coolingMultiple('wet', 50)).toFixed(1) + ' s');
  });

  it('decision options carry no length tell', () => {
    const html = render({ view: 'underwater', uw_view: 'decide' });
    const groups = [...html.matchAll(/role="radiogroup"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => [...m[1].matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((b) => text(b[1]).trim().replace(/^[A-D]\.\s*/, '')));
    expect(groups.length).toBe(4);
    const keys = [0, 1, 2, 3];
    groups.forEach((opts, i) => {
      const lens = opts.map((o) => o.length);
      const max = Math.max(...lens);
      const uniqueLongest = lens[keys[i]] === max && lens.filter((l) => l === max).length === 1;
      expect(uniqueLongest, 'question ' + (i + 1) + ' key is uniquely longest').toBe(false);
    });
  });

  it('cross-links to Metallurgy and Career Pathways', () => {
    const src = between(readSrc(), '// MODULE 9: UNDERWATER WELDING', '// MODULE 10:');
    expect(src).toContain("goto('metallurgy')");
    expect(src).toContain("goto('careerPaths')");
  });
});

// ───────────────────────── Robotics ─────────────────────────
describe('Robotics: teach-pendant checker', () => {
  const GOOD = [
    { x: 4, y: 6, m: 'J', w: false },
    { x: 12, y: 6, m: 'L', w: true },
    { x: 12, y: 1, m: 'J', w: false },
    { x: 1, y: 1, m: 'J', w: false },
  ];
  it('passes a correct program', () => {
    const r = tech().checkProgram(GOOD);
    expect(r.issues).toEqual([]);
    expect(r.pass).toBe(true);
    expect(r.coverage).toBe(1);
  });
  it('fails arc ON during an air move', () => {
    const p = GOOD.map((q) => Object.assign({}, q));
    p[2].w = true; p[2].m = 'L';            // leave the seam with the arc on
    const r = tech().checkProgram(p);
    expect(r.pass).toBe(false);
    expect(r.issues.map((i) => i.type)).toContain('weld_air');
  });
  it('fails welding the seam with a joint move', () => {
    const p = GOOD.map((q) => Object.assign({}, q));
    p[1].m = 'J';
    const r = tech().checkProgram(p);
    expect(r.issues.map((i) => i.type)).toEqual(expect.arrayContaining(['weld_joint', 'seam_gap']));
  });
  it('fails a straight-home move through the clamp, joint or linear', () => {
    ['J', 'L'].forEach((m) => {
      const r = tech().checkProgram([GOOD[0], GOOD[1], { x: 1, y: 1, m: m, w: false }]);
      expect(r.issues.map((i) => i.type), m).toContain('collision');
    });
  });
  it('a joint move whose bow clears the clamp still fails if its straight chord crosses it', () => {
    // (14,4) -> (2,4): the chord runs along row 4 through the clamp; the bow
    // swings down to row ~4.75 and misses it. The arm may sweep either way.
    const P = [{ x: 14, y: 1, m: 'L', w: false }, { x: 14, y: 4, m: 'L', w: false }, { x: 2, y: 4, m: 'J', w: false }];
    const path = tech().movePath({ x: 14, y: 4 }, { x: 2, y: 4 }, 'J');
    const bowHits = path.some((p, i) => i > 0 && tech().FIXTURES.some((f) => tech().segHitsRect(path[i - 1], p, f)));
    expect(bowHits).toBe(false);
    const r = tech().checkProgram(P);
    expect(r.issues.filter((i) => i.type === 'collision').map((i) => i.seg)).toEqual([2]);
    // the same move as LINEAR is a plain straight-line hit too
    const r2 = tech().checkProgram([P[0], P[1], { x: 2, y: 4, m: 'L', w: false }]);
    expect(r2.issues.filter((i) => i.type === 'collision').map((i) => i.seg)).toEqual([2]);
  });
  it('fails a partial seam, and only for the gap', () => {
    const r = tech().checkProgram([GOOD[0], { x: 8, y: 6, m: 'L', w: true }, { x: 8, y: 9, m: 'J', w: false }]);
    expect(r.pass).toBe(false);
    expect(r.coverage).toBeCloseTo(0.5, 9);
    expect(r.issues).toEqual([{ type: 'seam_gap', coverage: 0.5 }]);
    // two overlapping halves cover it
    const r2 = tech().checkProgram([GOOD[0], { x: 9, y: 6, m: 'L', w: true }, { x: 7, y: 6, m: 'L', w: true }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 9, m: 'J', w: false }]);
    expect(r2.coverage).toBe(1);
    expect(r2.pass).toBe(true);
  });
  it('a 5 mm shift fails without seam tracking and passes with it', () => {
    const shift = { dx: 0, dy: 1 };
    expect(tech().CELL.mm).toBe(5);
    const off = tech().checkProgram(GOOD, { shift, track: false });
    expect(off.pass).toBe(false);
    expect(off.issues.map((i) => i.type)).toEqual(expect.arrayContaining(['weld_air', 'seam_gap']));
    const on = tech().checkProgram(GOOD, { shift, track: true });
    expect(on.issues).toEqual([]);
    expect(on.pass).toBe(true);
    // tracking moved only the arc-touched points
    expect(on.points[1]).toMatchObject({ x: 4, y: 7 });
    expect(on.points[4]).toMatchObject({ x: 1, y: 1 });
  });
  it('treats a saved program as untrusted', () => {
    const N = tech().normProgram;
    expect(N('junk')).toEqual([]);
    expect(N([null, 5, { x: 'a', y: 2 }, { x: 99, y: 2 }, { x: '3', y: 4.4, m: 'L', w: 'yes' }])).toEqual([{ x: 3, y: 4, m: 'L', w: false }]);
    expect(N(Array.from({ length: 50 }, () => ({ x: 1, y: 1 }))).length).toBe(20);
  });
  it('renders the workcell, listing and verdict wiring', () => {
    const t = studentText(render({ view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD }));
    expect(t).toContain('Teach the robot to weld the seam');
    expect(t).toContain('Program listing');
    expect(t).toContain('60, 30');
    const html = render({ view: 'robotic', rob_sect: 'pendant' });
    expect(html).toContain('role="application"');
    expect(html).toMatch(/aria-describedby="tech2-rob-help"/);
  });
});

describe('Robotics: facts, sorter, links', () => {
  it('paints ABB white/grey, KUKA orange, FANUC yellow', () => {
    const t = studentText(render({ view: 'robotic', rob_sect: 'brands' }));
    expect(t).toMatch(/ABB[^.]*White\/grey robots/);
    expect(t).not.toMatch(/ABB[^.]{0,80}Orange robots/);
    expect(t).toContain('The orange robots');
    expect(t).toContain('Yellow-painted robots');
  });
  it('sorter scores first picks and explains each job', () => {
    const t = studentText(render({ view: 'robotic', rob_sect: 'sorter', tech2_rob_sort: { 0: 'robot', 1: 'robot', 5: 'manual' } }));
    expect(t).toContain('Score 2 / 3');
    expect(t).toContain('Not this time.');
    const src = between(readSrc(), 'var robJobs = [', 'var robSort = (function');
    const robots = [...src.matchAll(/robot: (true|false)/g)].map((m) => m[1]);
    expect(robots.length).toBe(6);
    expect(robots.filter((r) => r === 'true').length).toBe(3);
  });
  it('links the programming tab to the challenge and careers to Career Pathways', () => {
    const src = between(readSrc(), '// MODULE 15: ROBOTIC + AUTOMATED WELDING', '// MODULE 16:');
    expect(src).toContain("setSect('pendant')");
    expect(src).toContain("goto('careerPaths')");
  });
});

// ───────────────────────── Consumables ─────────────────────────
describe('Consumables: classification decoder', () => {
  const D = (s) => tech().decode(s);
  it('E7018: 70 ksi, all positions, low-hydrogen potassium + iron powder, AC/DC+', () => {
    const r = D('E7018');
    expect(r).toMatchObject({ ok: true, kind: 'smaw', spec: 'A5.1', strength: 70, position: 'all', coating: 'lowh_k_iron', current: 'ac_dcep', code: '18' });
    expect(r.parts.map((p) => p.seg)).toEqual(['E', '70', '1', '8']);
  });
  it('E6010: 60 ksi, all positions, cellulose sodium, DC+ only', () => {
    expect(D('E6010')).toMatchObject({ ok: true, strength: 60, position: 'all', coating: 'cellulose_na', current: 'dcep' });
  });
  it('E7024: flat + horizontal fillets, heavy iron powder, AC or DC', () => {
    expect(D('E7024')).toMatchObject({ ok: true, strength: 70, position: 'flat_hfillet', coating: 'iron_titania_heavy', current: 'ac_dc' });
  });
  it('ER70S-6: solid wire, 70 ksi, chemistry 6', () => {
    const r = D('ER70S-6');
    expect(r).toMatchObject({ ok: true, kind: 'solid', spec: 'A5.18', strength: 70, chem: '6' });
    expect(r.parts.map((p) => p.role)).toEqual(['er', 'tensile', 'solid', 'chem']);
    expect(D('er70s6')).toMatchObject({ ok: true, chem: '6' });
  });
  it('E71T-1: flux-cored, all positions, gas-shielded DC+ multi-pass', () => {
    const r = D('E71T-1');
    expect(r).toMatchObject({ ok: true, kind: 'fcaw', spec: 'A5.20', strength: 70, usability: '1', gasShielded: true });
    expect(r.parts.find((p) => p.role === 'fcaw_position').value).toBe('all');
    expect(D('E71T-11')).toMatchObject({ ok: true, usability: '11', gasShielded: false });
    expect(D('E71T-1C').parts.find((p) => p.role === 'gas').value).toBe('C');
  });
  it('reads suffixes: H4, R, -1, M, low-alloy designators', () => {
    const r = D('E7018-1 H4R');
    expect(r.parts.map((p) => p.role)).toEqual(['electrode', 'tensile', 'position', 'coating', 'toughness', 'hydrogen', 'moisture']);
    expect(r.parts.find((p) => p.role === 'hydrogen').value).toBe(4);
    expect(D('E8018-B2')).toMatchObject({ ok: true, spec: 'A5.5', strength: 80 });
    expect(D('E8018-B2').parts.find((p) => p.role === 'alloy').value).toBe('crmo');
    expect(D('E11018-M')).toMatchObject({ ok: true, strength: 110 });
    expect(D('E7018M').parts.map((p) => p.role)).toContain('military');
    expect(D('ER308L')).toMatchObject({ ok: true, kind: 'alloyfiller', metal: 'stainless' });
    expect(D('ER4043')).toMatchObject({ ok: true, kind: 'alloyfiller', metal: 'aluminium' });
  });
  it('rejects junk with a reason', () => {
    const bad = { '': 'empty', 'hello': 'pattern', 'E7': 'pattern', 'E5018': 'strength', 'E7019': 'coating', 'E7038': 'position',
      'E70188': 'strength', 'ER70S-9': 'solid_chem', 'E71T-11C': 'self_shielded_gas', 'E91T-1': 'strength', 'E7018-Q7': 'suffix', 'X7018': 'pattern' };
    Object.keys(bad).forEach((k) => {
      const r = D(k);
      expect(r.ok, k).toBe(false);
      expect(r.error, k).toBe(bad[k]);
    });
    expect(D(undefined).ok).toBe(false);
    expect(D({}).ok).toBe(false);
    expect(D('E'.repeat(40)).ok).toBe(false);
  });
  it('renders a decoded classification and an invalid-classification message', () => {
    const ok = studentText(render({ view: 'consumables', cons_sect: 'decoder', tech2_cons_code: 'E7018-H4R' }));
    expect(ok).toContain('E7018-H4R: Stick electrode, AWS A5.1.');
    expect(ok).toContain('At least 70,000 psi (70 ksi) tensile strength');
    expect(ok).toContain('low-hydrogen potassium coating with iron powder; current: AC or DC electrode-positive');
    expect(ok).toContain('Diffusible hydrogen at most 4 mL per 100 g');
    const wire = studentText(render({ view: 'consumables', cons_sect: 'decoder', tech2_cons_code: 'E71T-1C' }));
    expect(wire).toContain('Usability: gas-shielded, DC electrode-positive, multi-pass.');
    const bad = studentText(render({ view: 'consumables', cons_sect: 'decoder', tech2_cons_code: 'E7019' }));
    expect(bad).toContain('is not a classification this decoder knows');
  });
});

describe('Consumables: rendering, facts, scenarios', () => {
  const SECTS = ['overview', 'sticks', 'mig_wires', 'decoder', 'tig_rods', 'gases', 'storage', 'cost'];
  const SIG = { overview: 'Quick consumable map by process', sticks: 'decoding AWS A5.1', mig_wires: 'AWS A5.18 / A5.20', decoder: 'Classification decoder',
    tig_rods: 'Inspect the paint, read the box', gases: 'TriMix: 90% Helium', storage: 'Damp E7018', cost: 'Cost per foot of fillet weld' };

  it('no state renders "[object Object]"', () => {
    SECTS.forEach((s) => {
      const t = text(render({ view: 'consumables', cons_sect: s }));
      expect(t, s).toContain(SIG[s]);
      expect(t, s).not.toContain('[object Object]');
    });
    for (let i = 0; i < 8; i++) {
      [null, 0, 1, 2, 3].forEach((p) => {
        const t = text(render({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: i, cons_sc_picked: p }));
        expect(t).toContain('Scenario ' + (i + 1) + ' of 8');
        expect(t).not.toContain('[object Object]');
      });
    }
    ['E7018', 'ER70S-6', 'E71T-1', 'junk', ''].forEach((c) => {
      expect(text(render({ view: 'consumables', cons_sect: 'decoder', tech2_cons_code: c }))).not.toContain('[object Object]');
    });
  });

  it('stick cards read "Coating: … · Position: …"', () => {
    const t = text(render({ view: 'consumables', cons_sect: 'sticks' }));
    expect(t).toContain('Coating: High-cellulose sodium · Position: All positions');
    expect(t).toMatch(/E6011 60 ksi · AC, DC\+ /);
  });

  it('scenarios: balanced slots, a whyNot per wrong option, no length tell', () => {
    const region = between(readSrc(), 'var consScenarios = [', 'var consN = consScenarios.length;');
    const answers = [...region.matchAll(/answer: (\d)/g)].map((m) => Number(m[1]));
    expect(answers.length).toBe(8);
    [0, 1, 2, 3].forEach((s) => expect(answers.filter((a) => a === s).length).toBe(2));
    region.split(/answer: \d/).slice(1).forEach((b) => {
      const wn = between(b, 'whyNot: [', ']\n');
      expect((wn.match(/null/g) || []).length).toBe(1);
    });
    for (let i = 0; i < 8; i++) {
      const html = render({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: i });
      const grp = /role="radiogroup"[^>]*>([\s\S]*?)<\/div>/.exec(html)[1];
      const opts = [...grp.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((b) => text(b[1]).trim().replace(/^[A-D]\.\s*/, ''));
      expect(opts.length).toBe(4);
      const lens = opts.map((o) => o.length);
      const max = Math.max(...lens);
      expect(lens[answers[i]] === max && lens.filter((l) => l === max).length === 1, 'scenario ' + (i + 1)).toBe(false);
    }
    // a wrong pick shows ITS reason, then the key's
    const t = studentText(render({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 0, cons_sc_picked: 1 }));
    expect(t).toContain('Why not B:');
    expect(t).toContain('wind strips away');
  });

  it('corrects 5G, TriMix, ER70S-2/-6, short-circuit deposition, the rebar scenario and EWZr-1', () => {
    const s1 = studentText(render({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 0 }));
    expect(s1).toContain('fixed in 5G: horizontal, and it cannot be rolled');
    expect(s1).not.toMatch(/rolled by hand/);
    const gases = studentText(render({ view: 'consumables', cons_sect: 'gases' }));
    expect(gases).not.toMatch(/2% O2 \(TriMix\)/);
    expect(gases).toContain('Not TriMix.');
    const wires = studentText(render({ view: 'consumables', cons_sect: 'mig_wires' }));
    expect(wires).toMatch(/ER70S-2 Triple-deoxidized[^.]*\. Often recommended for rusty or contaminated steel and for TIG root passes/);
    expect(wires).toMatch(/ER70S-6 The most manganese and silicon[^.]*\. Handles mill scale and light surface rust/);
    const src = readSrc();
    const cons = code(between(src, '// MODULE 17: CONSUMABLES DEEP-DIVE', '// MODULE 18:'));
    expect(cons).not.toMatch(/8-15 lb\/hr/);
    expect(cons).not.toMatch(/'4-10 lb\/hr'/);
    expect(tech().CONS_PROC.find((p) => p.id === 'gmaw_sc').dep).toEqual([2, 8]);
    const s8 = studentText(render({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 7, cons_sc_picked: 2 }));
    expect(s8).toContain('2-8 lb/hr for short-circuit MIG');
    const cost = studentText(render({ view: 'consumables', cons_sect: 'cost' }));
    expect(cost).toContain('Rate: 2-8 lb/hr');
    expect(cons).not.toMatch(/Grade 60/);
    const tig = studentText(render({ view: 'consumables', cons_sect: 'tig_rods' }));
    expect(tig).toMatch(/Zirconiated \(EWZr-1\) Tip colour: brown/);
    // Current CK/Miller charts use gray EWCe-2. The former AWS-orange/ISO-gray
    // paragraph is replaced by product/edition context, including maker-specific EWG colors.
    expect(tig).toContain('EWCe-2/WC20 as gray (formerly orange)');
    expect(tig).toContain('EWG blends can use maker-specific colors');
    expect(tig).not.toMatch(/0\.8% Zirconiated \(EWZr-1\)/);
  });

  it('cost calculator shows its formula with the table\'s own numbers', () => {
    const c = tech().costPerFoot('fcaw', 0.375, 80);
    expect(c.W).toBeCloseTo((0.375 * 0.375 / 2) * 12 * 0.283, 12);
    expect(c.filler).toBeCloseTo(c.W * 3.75 / 0.85, 12);
    expect(c.labor).toBeCloseTo(c.W * 80 / (19 * 0.4), 12);
    const t = studentText(render({ view: 'consumables', cons_sect: 'cost', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80 }));
    expect(t).toContain('= ' + c.W.toFixed(3) + ' lb/ft');
    expect(t).toContain('= $' + c.filler.toFixed(2) + '/ft');
    expect(t).toContain('= $' + c.labor.toFixed(2) + '/ft');
    expect(t).toContain('Total ≈ $' + c.total.toFixed(2) + ' per foot');
    // per-lb and per-foot are one model: cost/ft = W x cost/lb
    expect(c.perLb * c.W).toBeCloseTo(c.total, 12);
    // every "≈ per lb" in the table, worked out here from the raw table ranges
    // (not by calling the function under test, which would grade itself)
    const mid = (r) => (r[0] + r[1]) / 2;
    tech().CONS_PROC.forEach((p) => {
      const v = mid(p.price) / mid(p.eff) + 80 / (mid(p.dep) * p.of);
      expect(t).toContain('≈ $' + (v >= 100 ? Math.round(v) : v.toFixed(2)) + ' per lb deposited');
    });
  });

  it('every quiz radiogroup that locks on first pick opts out of arrow-select', () => {
    const src = readSrc();
    ['// MODULE 9: UNDERWATER WELDING', '// MODULE 15: ROBOTIC + AUTOMATED WELDING', '// MODULE 17: CONSUMABLES DEEP-DIVE'].forEach((start) => {
      const end = start.replace(/\d+/, (n) => String(Number(n) + 1)).split(':')[0] + ':';
      const r = between(src, start, end);
      const locking = r.split('\n').filter((l) => /role: 'radiogroup'/.test(l) && /data-arrow-select/.test(l));
      expect(locking.length, start).toBeGreaterThanOrEqual(1);
      locking.forEach((l) => expect(l).toContain("'data-arrow-select': 'false'"));
    });
  });
});

// ───────────────────────── Hostile saved state ─────────────────────────
describe('Hostile saved values never crash and never fall back to the menu', () => {
  const H = [
    [{ view: 'heatInput', hi_process: { a: 1 }, hi_V: 'abc', hi_A: null, hi_TS: [], tech2_hi_th: '__proto__', hi_inquiry: 'x' }, 'What this heat input does to a bead'],
    [{ view: 'underwater', uw_view: { x: 1 }, uw_depth: 'deep', uw_tech: 7 }, 'Wet Welding'],
    [{ view: 'underwater', uw_view: 'pressure', uw_depth: -50, tech2_uw_pred: ['faster'], tech2_uw_pred_from: 'x' }, 'Predict first'],
    [{ view: 'underwater', uw_view: 'pressure', uw_depth: 9999, tech2_uw_pred: 'faster', tech2_uw_pred_from: NaN }, 'Why wet welds harden'],
    [{ view: 'underwater', uw_view: 'decide', tech2_uw_dec: 'zzz' }, 'Score 0 / 0'],
    [{ view: 'underwater', uw_view: 'decide', tech2_uw_dec: { 0: 99, 1: '2', 2: -1, 3: { a: 1 } } }, 'Score 0 / 1'],
    [{ view: 'robotic', rob_sect: ['pendant'] }, 'What robots do better than humans'],
    [{ view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: 'junk', tech2_rob_mode: 9, tech2_rob_arc: 'yes', tech2_rob_shift: 'true', tech2_rob_track: {} }, 'Teach the robot to weld the seam'],
    [{ view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: [null, { x: 'a' }, { x: 3, y: 99 }, { x: 5, y: 5, m: 'Z', w: 1 }] }, 'Program listing'],
    [{ view: 'robotic', rob_sect: 'sorter', tech2_rob_sort: [1, 2] }, 'Score 0 / 0'],
    [{ view: 'consumables', cons_sect: 42, cons_mode: {} }, 'Quick consumable map by process'],
    [{ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 999, cons_sc_score: 'NaN', cons_sc_picked: 'b' }, 'Scenario 1 of 8'],
    [{ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 3, cons_sc_score: 50, cons_sc_picked: 7 }, 'Score: 8 / 8'],
    [{ view: 'consumables', cons_sect: 'decoder', tech2_cons_code: { a: 1 } }, 'E7018: Stick electrode'],
    [{ view: 'consumables', cons_sect: 'cost', tech2_cons_proc: '__proto__', tech2_cons_leg: 'x', tech2_cons_rate: -5 }, 'Cost per foot of fillet weld'],
  ];
  H.forEach(([state, sig]) => {
    it(JSON.stringify(state).slice(0, 110), () => {
      const t = text(render(state));
      expect(t).toContain(sig);
      expect(t).not.toContain(MENU_SIGNATURE);
      expect(t).not.toMatch(/NaN|undefined|\[object Object\]/);
    });
  });
});

// ───────────────────────── Mounted interaction ─────────────────────────
describe('Mounted interaction', () => {
  let host, root, latest;
  beforeEach(() => {
    // Reduced motion ON at module load, so Run finishes instantly (no RAF in jsdom).
    realMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    resetStemLab();
    loadTool(SRC, 'weldLab');
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    root = null; host = null;
    window.matchMedia = realMatchMedia;
  });
  async function mount(initial) {
    const cfg = window.StemLab._registry.weldLab;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ weldLab: initial });
      latest = data;
      const update = (tool, key, val) => setData((prev) => Object.assign({}, prev, { [tool]: Object.assign({}, prev[tool], { [key]: val }) }));
      return cfg.render(makeCtx({ toolData: data, update }));
    }
    await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  }
  const button = (label) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim().startsWith(label));
  const click = async (el) => { await act(async () => { el.click(); await Promise.resolve(); }); };
  const key = async (el, k) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); await Promise.resolve(); }); };

  it('consumables: the last scenario wraps to scenario 1 with the score reset', async () => {
    await mount({ view: 'consumables', cons_mode: 'scenarios', cons_sc_idx: 7, cons_sc_score: 6, cons_sc_picked: null });
    expect(host.textContent).toContain('Score: 6 / 8');
    const radios = () => Array.from(host.querySelectorAll('[role="radio"]'));
    await click(radios()[2]);                         // key C
    expect(host.textContent).toContain('Score: 7 / 8');
    expect(host.textContent).toContain('Round complete: 7 of 8');
    await click(radios()[0]);                         // locked: ignored
    expect(host.textContent).toContain('Score: 7 / 8');
    await click(button('Start a new round'));
    expect(latest.weldLab.cons_sc_idx).toBe(0);
    expect(latest.weldLab.cons_sc_score).toBe(0);
    expect(host.textContent).toContain('Scenario 1 of 8');
    expect(host.textContent).toContain('Score: 0 / 8');
  });

  it('teach pendant: keyboard teaches a program, Run grades it, the shift breaks it and tracking fixes it', async () => {
    await mount({ view: 'robotic', rob_sect: 'pendant' });
    const grid = host.querySelector('[role="application"]');
    expect(grid).toBeTruthy();
    // cursor starts at home (1,1): go to (4,6)
    for (let i = 0; i < 3; i++) await key(grid, 'ArrowRight');
    for (let i = 0; i < 5; i++) await key(grid, 'ArrowDown');
    await key(grid, 'Enter');                         // point 1: joint, arc off
    await key(grid, 'l'); await key(grid, 'w');
    for (let i = 0; i < 8; i++) await key(grid, 'ArrowRight');
    await key(grid, 'Enter');                         // point 2: linear, arc on
    await key(grid, 'j'); await key(grid, 'w');
    for (let i = 0; i < 5; i++) await key(grid, 'ArrowUp');
    await key(grid, 'Enter');                         // point 3 (12,1)
    for (let i = 0; i < 11; i++) await key(grid, 'ArrowLeft');
    await key(grid, 'Enter');                         // point 4 home
    expect(latest.weldLab.tech2_rob_prog).toEqual([
      { x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true },
      { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }]);
    await key(grid, 'r');
    expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await click(button('Load the next part 5 mm off'));
    await click(button('▶ Run program'));
    expect(host.textContent).toContain('The program needs work.');
    expect(host.textContent).toContain('welded where the seam USED to be');
    await click(button('Seam tracking (off)'));
    await click(button('▶ Run program'));
    expect(host.textContent).toContain('Weld complete');
    expect(host.textContent).toContain('Seam tracking found the joint 5 mm from where it was taught');
  });

  it('underwater: a prediction unlocks the dive', async () => {
    await mount({ view: 'underwater', uw_view: 'pressure' });
    expect(host.querySelector('input[type="range"]')).toBeNull();
    await click(button('It cools faster'));
    expect(latest.weldLab.tech2_uw_pred).toBe('faster');
    expect(host.querySelector('input[type="range"]')).toBeTruthy();
    expect(host.textContent).toContain('Why wet welds harden');
  });

  it('decoder: typing a code updates the reading', async () => {
    await mount({ view: 'consumables', cons_sect: 'decoder' });
    const input = host.querySelector('#tech2-dec-input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(input, 'E6010'); input.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    expect(latest.weldLab.tech2_cons_code).toBe('E6010');
    expect(host.textContent).toContain('high-cellulose sodium coating');
    await act(async () => { setter.call(input, 'E9999'); input.dispatchEvent(new Event('input', { bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toMatch(/"E9999" is not a/);
  });
});
