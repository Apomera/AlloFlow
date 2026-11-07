// Area & Perimeter Lab stage B (2026-11-03): square-unit conversion with the
// subdivided unit square, circles (rolling for C/d, sectors for area, drill with
// named radius/diameter mistakes), irregular shapes on a grid, design missions,
// perimeter sonification and the Volume cross-link.
// AP_FILE lets the gate checks run against the stage-A file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';
let root = null;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
  delete window.matchMedia;
  delete window._alloGlobalMute;
});

async function mount(initial, overrides = {}) {
  const tool = loadTool(FILE, ID);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => latest._areaPerimeter || {};
}
function button(label) {
  return [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
}
async function click(label) {
  const el = button(label);
  expect(el, label).toBeTruthy();
  await React.act(async () => { el.click(); });
}
async function type(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(el, k) {
  await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); });
}
function pure() { return window.AreaPerimeterPure; }
function reducedMotion() {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
// A fake Web Audio context that records every oscillator.
function fakeAudio() {
  const oscillators = [];
  class Ctx {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createOscillator() {
      const o = { type: '', frequency: { values: [], setValueAtTime(v) { this.values.push(v); } }, connect() {}, disconnect() {}, start() {}, stops: [], stop(...args) { this.stops.push(args.length); } };
      oscillators.push(o);
      return o;
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  }
  return { Ctx, oscillators };
}

const MODES = ['explore', 'compare', 'composite', 'investigate', 'fence', 'challenge', 'units', 'circles', 'irregular', 'missions'];

describe('stage B mounts', () => {
  it('mounts all ten modes in light, dark, contrast and teacher views without errors or NaN', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadTool(FILE, ID);
    const looks = [{}, { isDark: true }, { isContrast: true }, { isTeacherMode: true }];
    for (const mode of MODES) for (const look of looks) {
      const html = renderTool(ID, { _areaPerimeter: { mode } }, look);
      expect(html, mode).toContain('Area &amp; Perimeter Lab');
      expect(html, mode).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
      expect(html, mode).toContain('id="ap-tab-' + mode + '"');
    }
    // Every level of every new activity renders.
    for (const level of [1, 2, 3]) {
      const state = { unitLevel: level, circleLevel: level, blobLevel: level, missionLevel: level };
      for (const mode of ['units', 'circles', 'irregular', 'missions']) {
        const html = renderTool(ID, { _areaPerimeter: { mode, ...state } });
        expect(html, mode + level).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
      }
      const floor = renderTool(ID, { _areaPerimeter: { mode: 'missions', missionKind: 'floor', missionLevel: level } });
      expect(floor).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
    }
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    errors.mockRestore();
  });

  it('switches through all ten tabs by keyboard on the client without React warnings', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warns = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // Stage C: tabs follow the grade band's order (core activities first).
      const state = await mount({ _areaPerimeter: { mode: 'challenge' } }, { isTeacherMode: true });
      const order = [...document.querySelectorAll('[role="tab"]')].map((el) => el.id.replace('ap-tab-', ''));
      expect([...order].sort()).toEqual([...MODES].sort());
      for (let i = 1; i < order.length; i += 1) {
        const active = document.querySelector('[role="tab"][aria-selected="true"]');
        await key(active, 'ArrowRight');
        expect(state().mode).toBe(order[i]);
        expect(document.activeElement.id).toBe('ap-tab-' + order[i]);
      }
      expect(state().modeVisits).toMatchObject({ units: true, circles: true, irregular: true, missions: true });
      expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
      expect(warns.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    } finally {
      errors.mockRestore();
      warns.mockRestore();
    }
  });
});

describe('square-unit conversion (model)', () => {
  it('generates correct conversions at every level and names the length-factor slip', () => {
    loadTool(FILE, ID);
    const P = pure();
    // Stage C added mm²/cm², hectares/m² and acres/ft² (1 acre = 43,560 ft²
    // exactly, which has no length factor: its named slip is adding 660 + 66).
    const factor = { yd_ft: 9, ft_in: 144, m_cm: 10000, cm_mm: 100, ha_m: 10000, acre_ft: 43560 };
    const linear = { yd_ft: 3, ft_in: 12, m_cm: 100, cm_mm: 10, ha_m: 100 };
    for (const level of [1, 2, 3]) {
      const sigs = new Set();
      let ups = 0;
      for (let seed = 1; seed <= 300; seed += 1) {
        const p = P.generateConversion(level, seed * 7919);
        const expected = p.dir === 'down' ? p.value * factor[p.pair] : p.value / factor[p.pair];
        expect(Math.abs(p.answer - expected) < 1e-6, p.sig).toBe(true);
        if (level === 1) { expect(p.dir).toBe('down'); expect(p.pair).not.toBe('m_cm'); }
        if (p.dir === 'up') ups += 1;
        if (p.pair === 'acre_ft') {
          expect(P.diagnoseConversion(p, p.dir === 'down' ? p.value * 726 : p.value / 726), p.sig).toBe('two_sides');
        } else {
          const lin = p.dir === 'down' ? p.value * linear[p.pair] : p.value / linear[p.pair];
          expect(P.diagnoseConversion(p, lin), p.sig).toBe('linear_factor');
        }
        expect(P.diagnoseConversion(p, p.answer)).toBe('correct');
        const back = p.dir === 'down' ? p.value / factor[p.pair] : p.value * factor[p.pair];
        expect(P.diagnoseConversion(p, back)).toBe('wrong_direction');
        for (const trap of p.traps) expect(P.valuesMatch(trap.value, p.answer), p.sig + ' ' + trap.id).toBe(false);
        expect(P.generateConversion(level, seed * 7919).sig).toBe(p.sig);
        sigs.add(p.sig);
      }
      expect(sigs.size, 'level ' + level).toBeGreaterThan(25);
      if (level > 1) expect(ups).toBeGreaterThan(90);
    }
    expect(P.parseBigAnswer('10,000')).toBe(10000);
    expect(P.parseBigAnswer('10 000')).toBe(10000);
    expect(P.parseBigAnswer('1,5')).toBe(1.5);
    expect(P.parseBigAnswer('0.45')).toBe(0.45);
  });
});

describe('circles (model, 7.G.4)', () => {
  function expectedCircle(p) {
    switch (p.type) {
      case 'circ_from_d': return Math.PI * p.d;
      case 'circ_from_r': return 2 * Math.PI * p.r;
      case 'area_from_r': return Math.PI * p.r * p.r;
      case 'area_from_d': return Math.PI * (p.d / 2) ** 2;
      case 'r_from_circ': return p.C / (2 * 3.14);
      default: throw new Error(p.type);
    }
  }
  it('computes every answer, accepts π, 3.14 and "kπ" forms, and keeps traps apart from the answer', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 200; seed += 1) {
      const p = P.generateCircle(level, seed);
      expect(P.circleTypes[level]).toContain(p.type);
      const exact = expectedCircle(p);
      expect(Math.abs(p.answer - exact) < 1e-9, p.sig).toBe(true);
      expect(P.diagnoseCircle(p, { value: Math.round(exact * 10) / 10, piK: null }), p.sig).toBe('correct');
      if (p.answerCand.k != null) {
        expect(P.diagnoseCircle(p, { value: Math.round(p.answerCand.k * 3.14 * 10) / 10, piK: null }), p.sig).toBe('correct');
        expect(P.diagnoseCircle(p, P.parseCircleAnswer(p.answerCand.k + 'π'))).toBe('correct');
      }
      for (const trap of p.traps) {
        const value = trap.cand.k != null ? trap.cand.k * Math.PI : trap.cand.v;
        expect(P.diagnoseCircle(p, { value, piK: null }), p.sig + ' ' + trap.id).not.toBe('correct');
      }
    }
  });

  it('names radius/diameter mix-ups, 2πr for area and squaring the diameter', () => {
    loadTool(FILE, ID);
    const P = pure();
    const byType = (type) => P.generateCircle(3, 5, type);
    const cd = P.generateCircle(1, 9, 'circ_from_d');
    expect(P.diagnoseCircle(cd, { value: 2 * Math.PI * cd.d, piK: null })).toBe('diameter_as_radius');
    const cr = P.generateCircle(1, 9, 'circ_from_r');
    expect(P.diagnoseCircle(cr, { value: Math.PI * cr.r, piK: null })).toBe('radius_as_diameter');
    expect(P.diagnoseCircle(cr, P.parseCircleAnswer(cr.r * cr.r + ' pi'))).toBe('circ_gave_area');
    const ar = byType('area_from_r');
    expect(P.diagnoseCircle(ar, { value: 2 * Math.PI * ar.r, piK: null })).toBe('area_2pir');
    expect(P.diagnoseCircle(ar, P.parseCircleAnswer(ar.d * ar.d + 'π'))).toBe('squared_diameter');
    expect(P.diagnoseCircle(ar, { value: ar.r * ar.r, piK: null })).toBe('forgot_pi_area');
    const ad = byType('area_from_d');
    expect(P.diagnoseCircle(ad, { value: Math.PI * ad.d * ad.d, piK: null })).toBe('squared_diameter');
    const rc = byType('r_from_circ');
    expect(P.diagnoseCircle(rc, { value: rc.d, piK: null })).toBe('gave_diameter');
    // Rounded to a whole number: close, but asked to round to a tenth.
    let near = null;
    for (let s = 1; s < 200 && !near; s += 1) { const p = P.generateCircle(2, s, 'area_from_r'); if (Math.abs(p.answer - Math.round(p.answer)) > 0.15) near = p; }
    expect(P.diagnoseCircle(near, { value: Math.round(near.answer), piK: null })).toBe('precision');
    expect(P.parseCircleAnswer('16π').piK).toBe(16);
    expect(P.parseCircleAnswer('9 * pi').piK).toBe(9);
    expect(P.parseCircleAnswer('π').piK).toBe(1);
  });

  it('makes C ÷ d about π for every rolled circle and names the ratio slips', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const obj of P.circleObjects) {
      const m = P.circleMeasurement(obj.d);
      expect(Math.abs(m.c - Math.PI * obj.d)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(m.ratio - Math.PI)).toBeLessThan(0.02);
      expect(P.checkRatio(obj.d, m.ratio.toFixed(2))).toBe('correct');
      expect(P.checkRatio(obj.d, (obj.d / m.c).toFixed(2))).toBe('ratio_upside_down');
      expect(P.checkRatio(obj.d, (m.c / (obj.d / 2)).toFixed(2))).toBe('ratio_used_radius');
      expect(P.checkRatio(obj.d, '3')).toBe('ratio_other');
    }
  });

  it('rearranges sectors toward a rectangle πr by r', () => {
    loadTool(FILE, ID);
    const P = pure();
    const counts = [4, 6, 8, 12, 16, 24, 36];
    let prev = null;
    for (const n of counts) {
      const m = P.sectorModel(n, 3);
      expect(m.base).toBeCloseTo(Math.PI * 3, 9);
      expect(m.arcEach * n / 2).toBeCloseTo(m.base, 9);
      expect(m.height).toBeLessThan(3);
      if (prev) { expect(m.bump).toBeLessThan(prev.bump); expect(m.height).toBeGreaterThan(prev.height); }
      prev = m;
    }
    expect(prev.bump / 3).toBeLessThan(0.01);
  });
});

describe('irregular shapes (model)', () => {
  function shoelace(points) {
    let s = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
  }
  it('builds shapes inside the grid whose exact area matches two independent measures', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 12; seed += 1) {
      const b = P.generateBlob(level, seed * 977);
      for (const [x, y] of b.outline) {
        expect(x > 0 && x < b.cols && y > 0 && y < b.rows, b.sig + ' ' + x + ',' + y).toBe(true);
      }
      expect(Math.abs(shoelace(b.outline) - b.exact) / b.exact, b.sig).toBeLessThan(0.01);
      const covered = b.cells.reduce((sum, c) => sum + c.cover, 0);
      expect(Math.abs(covered - b.exact) / b.exact, b.sig).toBeLessThan(0.02);
      expect(b.cells.length).toBe(b.cols * b.rows);
      expect(Math.abs(b.modelEstimate - b.exact) / b.exact, b.sig).toBeLessThan(0.15);
    }
  });

  it('checks the learner’s own adding first, then names how the squares were marked', () => {
    loadTool(FILE, ID);
    const P = pure();
    const b = P.generateBlob(2, 5);
    const careful = {}, greedy = {}, fullOnly = {};
    for (const c of b.cells) {
      if (c.cover >= 0.97) { careful[c.key] = 'full'; greedy[c.key] = 'full'; fullOnly[c.key] = 'full'; }
      else if (c.cover >= 0.03) { careful[c.key] = 'half'; greedy[c.key] = 'full'; }
    }
    const own = P.blobMarkCounts(b, careful);
    expect(own.full).toBe(b.modelFull);
    expect(own.half).toBe(b.modelPart);
    expect(P.assessBlob(b, careful, own.full + own.half).arithmetic).toBe('halves_not_halved');
    expect(P.assessBlob(b, careful, own.full).arithmetic).toBe('full_only');
    expect(P.assessBlob(b, careful, own.full + own.half / 2 + 3).arithmetic).toBe('arith_slip');
    const good = P.assessBlob(b, careful, own.full + own.half / 2);
    expect(good.arithmetic).toBe('ok');
    expect(good.notes).toEqual([]);
    expect(good.close).toBe(Math.abs(good.pct) <= 10);
    const g = P.blobMarkCounts(b, greedy);
    const over = P.assessBlob(b, greedy, g.estimate);
    expect(over.notes).toContain('partial_as_full');
    expect(over.diff).toBeGreaterThan(0);
    const f = P.blobMarkCounts(b, fullOnly);
    const under = P.assessBlob(b, fullOnly, f.estimate);
    expect(under.notes).toContain('skipped_partials');
    expect(under.diff).toBeLessThan(0);
    const outsideKey = b.cells.find((c) => c.cover === 0).key;
    expect(P.assessBlob(b, { ...careful, [outsideKey]: 'half' }, own.full + (own.half + 1) / 2).notes).toContain('counted_outside');
  });
});

describe('design missions (model)', () => {
  it('states a garden best design that is the true optimum within the budget', () => {
    loadTool(FILE, ID);
    const P = pure();
    let binds = 0;
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 150; seed += 1) {
      const m = P.generateGardenMission(level, seed);
      const cost = (L, W) => 2 * (L + W) * m.fenceCost + L * W * m.soilCost;
      let best = 0;
      for (let L = 1; L < m.fence; L += 1) for (let W = 1; W < m.fence; W += 1) {
        if (2 * (L + W) === m.fence && cost(L, W) <= m.budget) best = Math.max(best, L * W);
      }
      expect(best, m.sig).toBe(m.best.area);
      expect(m.best.l + m.best.w).toBe(m.fence / 2);
      const half = m.fence / 2;
      const square = Math.floor(half / 2) * Math.ceil(half / 2);
      if (m.budgetBinds) { binds += 1; expect(cost(Math.floor(half / 2), Math.ceil(half / 2))).toBeGreaterThan(m.budget); }
      else expect(m.best.area).toBe(square);
      const r = P.assessGarden(m, m.best.l, m.best.w, { perimeter: m.fence, area: m.best.area, cost: cost(m.best.l, m.best.w) });
      expect(r.solved, m.sig).toBe(true);
    }
    expect(binds).toBeGreaterThan(30);
  });

  it('names garden mistakes: over budget, fence not used, not the most area, partial costs', () => {
    loadTool(FILE, ID);
    const P = pure();
    let m = null;
    for (let s = 1; s < 300 && !m; s += 1) { const g = P.generateGardenMission(2, s); if (g.budgetBinds) m = g; }
    const half = m.fence / 2;
    const cost = (L, W) => 2 * (L + W) * m.fenceCost + L * W * m.soilCost;
    const item = (r, id) => r.items.find((it) => it.id === id);
    const sqL = Math.ceil(half / 2), sqW = Math.floor(half / 2);
    let r = P.assessGarden(m, sqL, sqW, { perimeter: m.fence, area: sqL * sqW, cost: cost(sqL, sqW) });
    expect(item(r, 'budget').mistake).toBe('over_budget');
    expect(item(r, 'best').status).toBe('pending');
    r = P.assessGarden(m, half - 1, 1, { perimeter: m.fence, area: half - 1, cost: cost(half - 1, 1) });
    expect(item(r, 'best').mistake).toBe('not_max_affordable');
    r = P.assessGarden(m, 2, 1, { perimeter: 6, area: 2, cost: cost(2, 1) });
    expect(item(r, 'fence').mistake).toBe('fence_short');
    const L = m.best.l, W = m.best.w;
    r = P.assessGarden(m, L, W, { perimeter: L * W, area: 2 * (L + W), cost: 2 * (L + W) * m.fenceCost });
    expect(item(r, 'perimeter').mistake).toBe('gave_area');
    expect(item(r, 'area').mistake).toBe('gave_perimeter');
    expect(item(r, 'cost').mistake).toBe('cost_fence_only');
    r = P.assessGarden(m, L, W, { perimeter: m.fence, area: L * W, cost: L * W * m.soilCost });
    expect(item(r, 'cost').mistake).toBe('cost_soil_only');
    expect(r.solved).toBe(false);
    let open = null;
    for (let s = 1; s < 300 && !open; s += 1) { const g = P.generateGardenMission(2, s); if (!g.budgetBinds) open = g; }
    const oc = (a, b) => 2 * (a + b) * open.fenceCost + a * b * open.soilCost;
    const oh = open.fence / 2;
    expect(P.assessGarden(open, oh - 1, 1, { perimeter: open.fence, area: oh - 1, cost: oc(oh - 1, 1) }).items.find((it) => it.id === 'best').mistake).toBe('not_max_area');
  });

  it('prices flooring in whole boxes or whole square yards and names rounding and unit slips', () => {
    loadTool(FILE, ID);
    const P = pure();
    for (const level of [1, 2, 3]) for (let seed = 1; seed <= 150; seed += 1) {
      const m = P.generateFloorMission(level, seed);
      const area = m.W * m.H - m.cw * m.ch;
      const per = level === 3 ? 9 : m.per;
      expect(m.area).toBe(area);
      expect(area % per).not.toBe(0);
      expect(m.count).toBe(Math.ceil(area / per));
      expect(m.cost).toBe(m.count * m.price);
      if (level === 1) expect(m.cw).toBe(0); else expect(m.cw).toBeGreaterThan(0);
      expect(P.assessFloor(m, { area, count: m.count, cost: m.cost }).solved).toBe(true);
      const down = P.assessFloor(m, { area, count: Math.floor(area / per), cost: m.cost }).items.find((it) => it.id === 'count');
      expect(down.mistake).toBe('rounded_down');
      if (level === 3) expect(P.assessFloor(m, { area, count: Math.ceil(area / 3), cost: m.cost }).items.find((it) => it.id === 'count').mistake).toBe('linear_factor');
      if (level === 2) expect(P.assessFloor(m, { area: m.W * m.H, count: m.count, cost: m.cost }).items.find((it) => it.id === 'area').mistake).toBe('forgot_cutout');
      expect(P.assessFloor(m, { area, count: m.count, cost: area * m.price }).items.find((it) => it.id === 'cost').mistake).toBe('cost_per_sqft');
    }
    const m = P.generateFloorMission(2, 4);
    const wrongArea = m.area + 3 * m.per + 1;
    const r = P.assessFloor(m, { area: wrongArea, count: Math.ceil(wrongArea / m.per), cost: Math.ceil(wrongArea / m.per) * m.price });
    expect(r.items.map((it) => it.status)).toEqual(['wrong', 'follow', 'follow']);
  });
});

describe('perimeter as sound (model)', () => {
  it('plans one tone per edge with pitch rising one semitone per unit of length', () => {
    loadTool(FILE, ID);
    const P = pure();
    const plan = P.perimeterTonePlan([6, 4, 6, 4]);
    expect(plan.tones).toHaveLength(4);
    expect(plan.total).toBe(20);
    plan.tones.forEach((tone, i) => {
      expect(tone.freq).toBeCloseTo(220 * 2 ** ([6, 4, 6, 4][i] / 12), 4);
      if (i) expect(tone.start).toBeGreaterThan(plan.tones[i - 1].start + plan.tones[i - 1].dur);
    });
    expect(plan.tones[0].freq).toBe(plan.tones[2].freq);
    expect(plan.tones[0].freq).toBeGreaterThan(plan.tones[1].freq);
    expect(plan.tones[0].dur).toBeGreaterThan(plan.tones[1].dur);
    expect(P.perimeterTonePlan([]).tones).toHaveLength(0);
  });

  it('plays through Web Audio only when not muted', () => {
    const { Ctx, oscillators } = fakeAudio();
    window.AudioContext = Ctx;
    try {
      loadTool(FILE, ID);
      const P = pure();
      window._alloGlobalMute = true;
      expect(P.playTonePlan(P.perimeterTonePlan([3, 5]))).toBeNull();
      expect(oscillators).toHaveLength(0);
      window._alloGlobalMute = false;
      const handle = P.playTonePlan(P.perimeterTonePlan([3, 5, 3, 5]));
      expect(handle).toBeTruthy();
      expect(oscillators).toHaveLength(4);
      expect(oscillators[0].frequency.values[0]).toBeCloseTo(220 * 2 ** (3 / 12), 4);
      P.stopTones();
      expect(oscillators.every((o) => o.stops.includes(0))).toBe(true);
    } finally {
      delete window.AudioContext;
    }
  });
});

describe('Square Units mode', () => {
  it('asks for a prediction before showing the subdivided unit square, and names the length factor', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'units' } });
    expect(document.querySelector('[data-ap-unit-square]')).toBeNull();
    await type(document.getElementById('ap-unit-predict'), '100');
    await click('Check my prediction');
    expect(document.querySelector('[data-ap-unit-verdict]').getAttribute('data-ap-unit-verdict')).toBe('linear_factor');
    expect(document.querySelector('[data-ap-unit-square="m_cm"]')).toBeTruthy();
    expect(document.querySelector('[data-ap-unit-row]')).toBeTruthy();
    expect(document.getElementById('ap-unit-square-desc').textContent).toContain('100 × 100 = 10000 cm²');
    expect(state().mistakeCounts.linear_factor).toBe(1);
    await click('1 ft² in in²');
    await type(document.getElementById('ap-unit-predict'), '144');
    await click('Check my prediction');
    expect(document.querySelector('[data-ap-unit-verdict]').getAttribute('data-ap-unit-verdict')).toBe('right');
  });

  it('names the length-factor slip in practice, shows the picture, gives a second try and credits once', async () => {
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'units', unitLevel: 2 } }, { awardXP });
    const p = pure().generateConversion(2, 115);
    expect(document.querySelector('[data-ap-drill="units"]').getAttribute('data-ap-drill-sig')).toBe(p.sig);
    expect(document.querySelector('[data-ap-drill="units"] [data-ap-unit-square]')).toBeNull();
    const lin = p.dir === 'down' ? p.value * p.linear : p.value / p.linear;
    await type(document.getElementById('ap-drill-units'), String(lin));
    await click('Check answer');
    const fb = document.querySelector('[data-ap-drill-feedback]');
    expect(fb.getAttribute('data-ap-mistake')).toBe('linear_factor');
    expect(fb.textContent).toContain('second try');
    expect(document.querySelector('[data-ap-drill="units"] [data-ap-unit-square]')).toBeTruthy();
    expect(document.querySelector('[data-ap-drill-solution]')).toBeNull();
    expect(state().mistakeCounts.linear_factor).toBe(1);
    expect(button('Show the worked solution')).toBeUndefined();
    await type(document.getElementById('ap-drill-units'), p.answer >= 1000 ? p.answer.toLocaleString('en-US') : String(p.answer));
    await click('Check answer');
    expect(document.querySelector('[data-ap-drill-feedback]').getAttribute('data-ap-drill-feedback')).toBe('correct');
    expect(state().drillSolved[p.sig]).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 3, 'Square units problem');
    expect(button('Solved').disabled).toBe(true);
    expect(document.querySelector('[data-ap-drill-solution]')).toBeTruthy();
  });

  it('fixes the level for the class when the teacher sets one, and scales by host grade otherwise', () => {
    loadTool(FILE, ID);
    const P = pure();
    const sigOf = (html) => { document.body.innerHTML = html; return document.querySelector('[data-ap-drill]').getAttribute('data-ap-drill-sig'); };
    expect(sigOf(renderTool(ID, { _areaPerimeter: { mode: 'units' } }, { gradeLevel: '3rd Grade' }))).toBe(P.generateConversion(1, 108).sig);
    expect(sigOf(renderTool(ID, { _areaPerimeter: { mode: 'units' } }, { gradeLevel: '7th Grade' }))).toBe(P.generateConversion(3, 122).sig);
    expect(sigOf(renderTool(ID, { _areaPerimeter: { mode: 'units' } }, { gradeLevel: '', gradeBand: 'g35' }))).toBe(P.generateConversion(1, 108).sig);
    expect(sigOf(renderTool(ID, { _areaPerimeter: { mode: 'circles' } }, { gradeLevel: '7th Grade' }))).toBe(P.generateCircle(2, 216).sig);
    const html = renderTool(ID, { _areaPerimeter: { mode: 'units', unitLevel: 1, teacherLevel: 3 } });
    expect(sigOf(html)).toBe(P.generateConversion(3, 122).sig);
    expect(document.body.textContent).toContain('Your teacher set level 3.');
    expect(button('Level 1: getting started')).toBeUndefined();
    // Stage C: one teacher control (the grade range). The old level select is
    // gone; a saved level still applies and is explained in the teacher panel.
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'units', teacherLevel: 3 } }, { isTeacherMode: true });
    expect(document.getElementById('ap-teacher-level')).toBeNull();
    expect(document.getElementById('ap-teacher-min')).toBeTruthy();
    expect(document.querySelector('[data-ap-legacy-level="3"]')).toBeTruthy();
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'units' } });
    expect(document.getElementById('ap-teacher-min')).toBeNull();
  });
});

describe('Circles mode', () => {
  it('needs a claim before rolling, measures C ÷ d for three circles and checks the claim against the evidence', async () => {
    reducedMotion();
    const awardXP = vi.fn();
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'circles' } }, { awardXP, announceToSR: speak });
    expect(button('Roll it one full turn').disabled).toBe(true);
    await click('C ÷ d is the same for every circle');
    const P = pure();
    for (const [label, d] of [['Coin (3 cm across)', 3], ['Jar lid (7 cm across)', 7], ['Plate (22 cm across)', 22]]) {
      await click(label);
      expect(document.querySelector('[data-ap-roll]').getAttribute('data-ap-roll')).toBe('ready');
      expect(document.getElementById('ap-circle-ratio')).toBeNull();
      await click('Roll it one full turn');
      expect(document.querySelector('[data-ap-roll]').getAttribute('data-ap-roll')).toBe('done');
      // Stage C: the length is read off the ruler, not handed over.
      const m = P.circleMeasurement(d);
      expect(document.getElementById('ap-roll-desc').textContent).not.toContain(String(m.c) + ' cm');
      expect(document.getElementById('ap-circle-ratio')).toBeNull();
      const ruler = P.rulerFor(['coin', 'lid', 'plate'][[3, 7, 22].indexOf(d)]);
      const reading = P.snapReading(ruler, ruler.c);
      await type(document.getElementById('ap-circle-reading'), String(reading));
      await click('Check my reading');
      const ratio = (reading / d).toFixed(2);
      if (d === 3) {
        await type(document.getElementById('ap-circle-ratio'), (d / reading).toFixed(2));
        await click('Check and record');
        expect(document.querySelector('[data-ap-ratio]').getAttribute('data-ap-ratio')).toBe('ratio_upside_down');
      }
      await type(document.getElementById('ap-circle-ratio'), ratio);
      await click('Check and record');
      expect(document.querySelector('[data-ap-ratio]').getAttribute('data-ap-ratio')).toBe('correct');
    }
    expect(Object.keys(state().circleRecords).sort()).toEqual(['coin', 'lid', 'plate']);
    expect(state().mistakeCounts.ratio_upside_down).toBe(1);
    await click('Check my claim');
    expect(document.querySelector('[data-ap-circle-claim]').getAttribute('data-ap-circle-claim')).toBe('supported');
    await click('Check my claim');
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Circle ratio claim');
  });

  it('animates the roll frame by frame, stops at once under reduced motion, and cancels on unmount', async () => {
    const callbacks = [];
    const cancelled = [];
    const origRaf = window.requestAnimationFrame, origCaf = window.cancelAnimationFrame;
    window.requestAnimationFrame = (cb) => { callbacks.push(cb); return callbacks.length; };
    window.cancelAnimationFrame = (id) => { cancelled.push(id); };
    try {
      const state = await mount({ _areaPerimeter: { mode: 'circles', circleClaim: 'same' } });
      await click('Roll it one full turn');
      expect(callbacks).toHaveLength(1);
      await React.act(async () => { callbacks[0](1000); });
      await React.act(async () => { callbacks[1](2100); });
      expect(document.querySelector('[data-ap-roll]').getAttribute('data-ap-roll')).toBe('rolling');
      expect(button('Roll it one full turn').disabled).toBe(true);
      expect(state().circleRolled || {}).toEqual({});
      // The learner turns on reduced motion mid-roll: the next frame jumps to the end.
      reducedMotion();
      await React.act(async () => { callbacks[2](2200); });
      expect(document.querySelector('[data-ap-roll]').getAttribute('data-ap-roll')).toBe('done');
      expect(state().circleRolled.coin).toBe(true);
      delete window.matchMedia;
      await click('Jar lid (7 cm across)');
      await click('Roll it one full turn');
      const pending = callbacks.length;
      await React.act(async () => { callbacks[pending - 1](5000); });
      await React.act(async () => { root.unmount(); });
      root = null;
      expect(cancelled).toContain(callbacks.length);
      expect(state().circleRolled.lid).toBeUndefined();
    } finally {
      window.requestAnimationFrame = origRaf;
      window.cancelAnimationFrame = origCaf;
    }
  });

  it('asks for a prediction before explaining why sectors become a rectangle, with a text alternative', async () => {
    await mount({ _areaPerimeter: { mode: 'circles' } });
    expect(document.querySelector('[data-ap-sector-result]')).toBeNull();
    await click('24 sectors');
    expect(document.querySelector('[data-ap-sectors]').getAttribute('data-ap-sectors')).toBe('24');
    expect(document.querySelectorAll('[data-ap-sector]').length).toBe(24);
    const desc = document.getElementById('ap-sectors-desc').textContent;
    expect(desc).toContain('parallelogram');
    expect(desc).toContain('π × r');
    expect(desc).toContain('With 24 sectors');
    await click('A triangle');
    const result = document.querySelector('[data-ap-sector-result]');
    expect(result.getAttribute('data-ap-sector-result')).toBe('triangle');
    expect(result.textContent).toContain('πr²');
    expect(result.querySelectorAll('tbody tr').length).toBe(7);
  });

  it('names 2πr for area and squaring the diameter in practice, and gives no credit after a reveal', async () => {
    const P = pure();
    const awardXP = vi.fn();
    let seed = 1;
    while (P.generateCircle(2, seed).type !== 'area_from_r') seed += 1;
    const p = P.generateCircle(2, seed);
    const state = await mount({ _areaPerimeter: { mode: 'circles', circleLevel: 2, drills: { circles: { seed, level: 2 } } } }, { awardXP });
    expect(document.querySelector('[data-ap-drill="circles"]').getAttribute('data-ap-drill-sig')).toBe(p.sig);
    await type(document.getElementById('ap-drill-circles'), (2 * p.r) + 'π');
    await click('Check answer');
    expect(document.querySelector('[data-ap-drill-feedback]').getAttribute('data-ap-mistake')).toBe('area_2pir');
    await type(document.getElementById('ap-drill-circles'), String(Math.round(Math.PI * p.d * p.d * 10) / 10));
    await click('Check answer');
    expect(document.querySelector('[data-ap-drill-feedback]').getAttribute('data-ap-mistake')).toBe('squared_diameter');
    expect(state().mistakeCounts).toMatchObject({ area_2pir: 1, squared_diameter: 1 });
    expect(state().missedByType.area_from_r).toBe(1);
    expect(document.querySelector('[data-ap-drill-solution]')).toBeNull();
    await click('Show the worked solution');
    expect(document.querySelector('[data-ap-drill-solution]').textContent).toContain(p.r * p.r + 'π');
    expect(state().drillRevealed[p.sig]).toBe(true);
    await click('New problem');
    await click('Practise missed problems (1)');
    expect(document.querySelector('[data-ap-drill="circles"]').getAttribute('data-ap-drill-sig')).toBe(p.sig);
    await type(document.getElementById('ap-drill-circles'), (p.r * p.r) + 'π');
    await click('Check answer');
    expect(document.querySelector('[data-ap-drill-feedback]').textContent).toContain('earns no new points');
    expect(awardXP).not.toHaveBeenCalled();
    expect(state().drillSolved || {}).not.toHaveProperty(p.sig);
  });
});

describe('Irregular Shapes mode', () => {
  it('marks squares with roving keyboard focus, names unhalved part squares, then compares with the exact area', async () => {
    loadTool(FILE, ID);
    const P = pure();
    let seed = 1;
    let blob, careful;
    for (;; seed += 1) {
      blob = P.generateBlob(1, seed);
      careful = {};
      for (const c of blob.cells) if (c.cover >= 0.97) careful[c.key] = 'full'; else if (c.cover >= 0.03) careful[c.key] = 'half';
      if (P.assessBlob(blob, careful, blob.modelEstimate).close) break;
    }
    const awardXP = vi.fn();
    const speak = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'irregular', blobLevel: 1, blobSeed: seed } }, { awardXP, announceToSR: speak });
    expect(document.querySelectorAll('[data-ap-blob-cell][tabindex="0"]').length).toBe(1);
    const first = document.querySelector('[data-ap-blob-cell="0-0"]');
    await key(first, 'Enter');
    expect(state().blobMarks.marks['0-0']).toBe('full');
    expect(speak.mock.calls.at(-1)[0]).toContain('Marked as a whole square.');
    await key(document.querySelector('[data-ap-blob-cell="0-0"]'), 'Enter');
    expect(state().blobMarks.marks['0-0']).toBe('half');
    await key(document.querySelector('[data-ap-blob-cell="0-0"]'), 'Enter');
    expect(state().blobMarks.marks['0-0']).toBeUndefined();
    await key(document.querySelector('[data-ap-blob-cell="0-0"]'), 'ArrowRight');
    expect(document.activeElement.getAttribute('data-ap-blob-cell')).toBe('1-0');
    expect(document.querySelector('[data-ap-blob-cell="0-0"]').getAttribute('aria-label')).toMatch(/^Row 1, column 1: /);
    for (const c of blob.cells) {
      const times = careful[c.key] === 'full' ? 1 : careful[c.key] === 'half' ? 2 : 0;
      for (let i = 0; i < times; i += 1) await React.act(async () => { document.querySelector('[data-ap-blob-cell="' + c.key + '"]').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    expect(document.querySelector('[data-ap-blob-counts]').getAttribute('data-ap-blob-counts')).toBe(blob.modelFull + ':' + blob.modelPart);
    await type(document.getElementById('ap-blob-estimate'), String(blob.modelFull + blob.modelPart));
    await click('Check my estimate');
    expect(document.querySelector('[data-ap-blob-feedback]').getAttribute('data-ap-blob-feedback')).toBe('halves_not_halved');
    expect(document.body.textContent).not.toContain('Exact area');
    await type(document.getElementById('ap-blob-estimate'), String(blob.modelEstimate));
    await click('Check my estimate');
    expect(document.querySelector('[data-ap-blob-feedback]').getAttribute('data-ap-blob-feedback')).toBe('close');
    expect(document.body.textContent).toContain(blob.exactText);
    expect(button('Check my estimate').disabled).toBe(true);
    expect(state().blobSolved[blob.sig]).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Irregular area estimate');
    expect(state().mistakeCounts.halves_not_halved).toBe(1);
  });
});

describe('Design Missions mode', () => {
  async function slide(label, value) {
    const el = [...document.querySelectorAll('input[type="range"]')].find((s) => s.getAttribute('aria-label') === label);
    expect(el, label).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => { setter.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  async function fillGarden(P, A, C) {
    await type(document.getElementById('ap-mission-perimeter'), String(P));
    await type(document.getElementById('ap-mission-area'), String(A));
    await type(document.getElementById('ap-mission-cost'), String(C));
    await click('Check my design');
  }
  const status = (id) => document.querySelector('[data-ap-mission-item="' + id + '"]');

  it('checks a garden design against the fence, the budget and the most area, with named feedback', async () => {
    loadTool(FILE, ID);
    const Pm = pure();
    let seed = 1;
    while (!Pm.generateGardenMission(2, seed).budgetBinds) seed += 1;
    const m = Pm.generateGardenMission(2, seed);
    const cost = (L, W) => 2 * (L + W) * m.fenceCost + L * W * m.soilCost;
    const awardXP = vi.fn();
    const state = await mount({ _areaPerimeter: { mode: 'missions', missionLevel: 2, missions: { garden: { seed, level: 2 } } } }, { awardXP });
    expect(document.querySelector('[data-ap-mission-brief]').getAttribute('data-ap-mission-brief')).toBe(m.sig);
    const half = m.fence / 2, sqL = Math.ceil(half / 2), sqW = Math.floor(half / 2);
    await slide('Garden length (m)', sqL);
    await slide('Garden width (m)', sqW);
    await fillGarden(m.fence, sqL * sqW, cost(sqL, sqW));
    expect(status('budget').getAttribute('data-ap-mistake')).toBe('over_budget');
    expect(status('fence').getAttribute('data-ap-status')).toBe('ok');
    expect(document.querySelector('[data-ap-mission-result]').getAttribute('data-ap-mission-result')).toBe('not-yet');
    await slide('Garden length (m)', m.best.l);
    await slide('Garden width (m)', m.best.w);
    await fillGarden(m.fence, 2 * (m.best.l + m.best.w), cost(m.best.l, m.best.w));
    expect(status('area').getAttribute('data-ap-mistake')).toBe('gave_perimeter');
    expect(document.querySelector('[data-ap-mission-solution]')).toBeNull();
    await type(document.getElementById('ap-mission-area'), String(m.best.area));
    await click('Check my design');
    expect(document.querySelector('[data-ap-mission-result]').getAttribute('data-ap-mission-result')).toBe('solved');
    expect(state().missionSolved[m.sig]).toBe(true);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 3, 'Design mission');
    expect(state().mistakeCounts).toMatchObject({ over_budget: 1, gave_perimeter: 1 });
    expect(document.querySelector('[data-ap-mission-solution]')).toBeTruthy();
  });

  it('names square-yard and rounding slips in the flooring mission and follows through wrong areas', async () => {
    loadTool(FILE, ID);
    const m = pure().generateFloorMission(3, 43 + 33);
    const state = await mount({ _areaPerimeter: { mode: 'missions', missionKind: 'floor', missionLevel: 3 } });
    expect(document.querySelector('[data-ap-mission-brief]').getAttribute('data-ap-mission-brief')).toBe(m.sig);
    expect(document.getElementById('ap-floor-desc').textContent).toContain('L-shaped room');
    await type(document.getElementById('ap-mission-area'), String(m.area));
    await type(document.getElementById('ap-mission-count'), String(Math.ceil(m.area / 3)));
    await type(document.getElementById('ap-mission-cost'), String(Math.ceil(m.area / 3) * m.price));
    await click('Check my design');
    expect(status('area').getAttribute('data-ap-status')).toBe('ok');
    expect(status('count').getAttribute('data-ap-mistake')).toBe('linear_factor');
    expect(status('cost').getAttribute('data-ap-status')).toBe('follow');
    await type(document.getElementById('ap-mission-count'), String(Math.floor(m.area / 9)));
    await click('Check my design');
    expect(status('count').getAttribute('data-ap-mistake')).toBe('rounded_down');
    expect(button('Show a design that works')).toBeTruthy();
    await click('Show a design that works');
    expect(document.querySelector('[data-ap-mission-solution]').textContent).toContain('rounded up to ' + m.count);
    expect(state().missionRevealed[m.sig]).toBe(true);
    expect(document.getElementById('ap-mission-area').disabled).toBe(true);
  });
});

describe('sound and cross-links in the existing modes', () => {
  it('plays one tone per edge, hides the total while predicting, and stops the sound on unmount', async () => {
    const { Ctx, oscillators } = fakeAudio();
    window.AudioContext = Ctx;
    try {
      const speak = vi.fn();
      await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4, predictMeasurements: true } }, { announceToSR: speak });
      await click('Play the perimeter as sound');
      expect(oscillators).toHaveLength(4);
      const f = oscillators.map((o) => o.frequency.values[0]);
      expect(f[0]).toBe(f[2]);
      expect(f[0]).toBeGreaterThan(f[1]);
      const line = speak.mock.calls.at(-1)[0];
      expect(line).toContain('6, 4, 6, 4 units');
      expect(line).not.toContain('20');
      await React.act(async () => { root.unmount(); });
      root = null;
      expect(oscillators.every((o) => o.stops.includes(0))).toBe(true);
      document.body.innerHTML = '<div id="root"></div>';
      await mount({ _areaPerimeter: { mode: 'composite' } }, { announceToSR: speak });
      await click('Play the perimeter as sound');
      expect(oscillators).toHaveLength(10);
      expect(speak.mock.calls.at(-1)[0]).toContain('36 units in all');
    } finally {
      delete window.AudioContext;
    }
  });

  it('links to the Volume tool for the step from area to volume, only when it is available', async () => {
    loadTool(FILE, ID);
    document.body.innerHTML = renderTool(ID, { _areaPerimeter: { mode: 'explore' } }, { setStemLabTool: () => {} });
    expect(button('Stack layers of square units into volume in the Volume tool')).toBeUndefined();
    resetStemLab();
    window.StemLab.registerTool('volume', { label: 'Volume', render: () => null });
    document.body.innerHTML = '<div id="root"></div>';
    const setStemLabTool = vi.fn();
    await mount({ _areaPerimeter: { mode: 'explore' } }, { setStemLabTool });
    await click('Stack layers of square units into volume in the Volume tool');
    expect(setStemLabTool).toHaveBeenCalledWith('volume');
  });
});
describe('saved state', () => {
  it('survives hostile or half-written stage-B state without crashing or showing junk', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadTool(FILE, ID);
    const P = pure();
    const m = P.generateGardenMission(2, 63);
    const hostile = {
      drills: 'x', drillSolved: [1, 2], drillMissed: { 'u:m_cm:down:1': { kind: 'units', level: 'nine', seed: -4 } },
      unitPair: 'parsec', unitPredict: { m_cm: { a: 1 } }, unitPredictChecked: { m_cm: 'abc' }, unitLevel: 99, circleLevel: -1, blobLevel: 'two', missionLevel: null,
      circleObject: 'moon', circleRolled: 5, circleRecords: { moon: true }, circleRatioFeedback: { id: 'coin', verdict: 'bogus' }, circleClaim: 'maybe', sectorCount: 7, sectorPredict: 'hexagon',
      blobSeed: -9, blobMarks: { sig: 'b:2:1', marks: 5 }, blobEstimate: { sig: 'b:2:1', text: { t: 1 } }, blobCheck: { sig: 'b:2:31', value: 'x', done: true }, blobFocus: '99-99',
      missionKind: 'moonbase', missions: { garden: { seed: m.seed, level: 2, sig: m.sig, L: 'wide', W: -3, inputs: 7, result: { sig: m.sig, items: 'bad' } } }, teacherLevel: 'all',
    };
    for (const mode of ['units', 'circles', 'irregular', 'missions']) {
      const html = renderTool(ID, { _areaPerimeter: { ...hostile, mode } });
      expect(html, mode).toContain('Area &amp; Perimeter Lab');
      expect(html, mode).not.toMatch(/undefined|NaN|\[object Object\]|Infinity/);
    }
    // The stage-A quests are untouched by the new modes.
    const tool = window.StemLab._registry[ID];
    expect(tool.questHooks.map((q) => q.id)).toEqual(['tile_counter', 'measurement_tour', 'challenge_five', 'same_area_three', 'decomposition_duo']);
    expect(tool.questHooks.find((q) => q.id === 'measurement_tour').progress({ modeVisits: { units: true, circles: true, irregular: true, missions: true, explore: true } })).toBe('5/5 modes');
    expect(errors.mock.calls.map((c) => String(c[0]).slice(0, 200))).toEqual([]);
    errors.mockRestore();
  });
});