import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Stage A plumbing: the pure models added for probes, the energy ledger, the
// touch test and the two-body equilibrium, checked against hand calculations
// and published formulas (not against whatever the tool happens to return).
const SRC = fs.readFileSync('stem_lab/stem_tool_heatlab.js', 'utf8');
function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}
const MATERIALS = table('var MATERIALS = [');
const mat = (id) => MATERIALS.find((m) => m.id === id);
let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab').models;
});

function slabMidReach(m, hot) {
  const L = 0.20, a = m.k / (m.rho * m.c);
  const mid = (t) => {
    let T = (hot + 20) / 2;
    for (let n = 1; n < 800; n++) T += 2 * (20 - hot) / (n * Math.PI) * Math.sin(n * Math.PI / 2) * Math.exp(-a * n * n * Math.PI * Math.PI * t / (L * L));
    return T;
  };
  let lo = 0, hi = 1;
  while (mid(hi) < 50) hi *= 2;
  for (let i = 0; i < 200; i++) { const x = (lo + hi) / 2; if (mid(x) >= 50) hi = x; else lo = x; }
  return hi;
}

describe('model namespace', () => {
  it('exposes the same pure models as window.StemLab._heat and keeps the old names', () => {
    expect(window.StemLab._heat).toBe(M);
    for (const k of ['finishC', 'advanceBar', 'racePrediction', 'mixTemperature', 'mixExplanation', 'waterState',
      'coolingTemperature', 'coolingCurve', 'radiation', 'heatPump', 'heatPumpChartDomain',
      'effusivity', 'contactTemperature', 'barFlux', 'twoBodyEquilibrium', 'raceAdvance', 'logAppend']) {
      expect(M[k], k).toBeDefined();
    }
    expect(M.barNodes % 2).toBe(1);
  });
});

describe('effusivity and contact temperature', () => {
  it('matches e = sqrt(k rho c) for the bar materials', () => {
    expect(M.effusivity(mat('copper'))).toBeCloseTo(Math.sqrt(401 * 8960 * 385), 6);
    expect(M.effusivity(mat('copper'))).toBeCloseTo(37193, -1);
    expect(M.effusivity(mat('wood'))).toBeCloseTo(349.9, 1);
    expect(M.effusivity(1234)).toBe(1234);
  });

  it('gives the textbook touch-test temperatures, Tc = (e1T1 + e2T2)/(e1 + e2)', () => {
    // Skin e = 1,500 at 33 C against objects that sat at 20 C.
    expect(M.contactTemperature(1500, mat('copper'), 33, 20)).toBeCloseTo((1500 * 33 + 37192.6 * 20) / 38692.6, 2);
    expect(M.contactTemperature(1500, mat('copper'), 33, 20)).toBeCloseTo(20.5, 1);
    expect(M.contactTemperature(1500, mat('steel'), 33, 20)).toBeCloseTo(21.3, 1);
    expect(M.contactTemperature(1500, mat('wood'), 33, 20)).toBeCloseTo(30.5, 1);
    // Equal effusivities meet halfway; the order of the arguments does not matter.
    expect(M.contactTemperature(500, 500, 10, 30)).toBeCloseTo(20, 12);
    expect(M.contactTemperature(mat('wood'), 1500, 20, 33)).toBeCloseTo(M.contactTemperature(1500, mat('wood'), 33, 20), 12);
  });
});

describe('bar flux, steady flow and the race ledger', () => {
  it('reproduces Fourier steady flux k dT / L exactly on the corrected grid', () => {
    const steel = mat('steel');
    const T = new Float64Array(M.barNodes).fill(20);
    M.advanceBar(T, steel, 200, 40000, 0.20);
    expect(T[(M.barNodes - 1) / 2]).toBeCloseTo(110, 6);
    const f = M.barFlux(T, steel, { hot: 200, cold: 20 });
    expect(f.inWm2).toBeCloseTo(50 * 180 / 0.20, 3);     // 45,000 W/m2
    expect(f.outWm2).toBeCloseTo(45000, 3);
    expect(f.inW).toBeCloseTo(4.5, 6);                   // through 1 cm2
    expect(M.steadyFlowW(steel, 200)).toBeCloseTo(4.5, 12);
  });

  it('closes in = stored + out to rounding error while the bar is still warming', () => {
    for (const id of ['copper', 'aluminium', 'fibre', 'glass']) {
      const m = mat(id);
      const s = M.raceState();
      for (let k = 0; k < 400; k++) M.raceAdvance(s, m, 200, 0.16);
      const stored = M.barStoredJ(s.T, m);
      expect(s.inJ, id).toBeGreaterThan(0);
      expect(Math.abs(s.inJ - stored - s.outJ) / s.inJ, id).toBeLessThan(1e-9);
    }
  });

  it('interpolates the finish crossing, so step size no longer changes the time', () => {
    for (const id of ['copper', 'aluminium', 'steel']) {
      const m = mat(id);
      const exact = slabMidReach(m, 200);
      for (const dt of [0.016, 0.16, 10, 100]) {
        const s = M.raceState();
        while (s.reach === null && s.clock < 3 * exact) M.raceAdvance(s, m, 200, dt);
        expect(Math.abs(s.reach / exact - 1), id + ' dt ' + dt).toBeLessThan(0.002);
      }
      expect(M.midReachTime(m, 200)).toBeCloseTo(exact, 3);
    }
  });

  it('reports an unreachable finish honestly and never offers one in the UI', () => {
    expect(M.midReachTime(mat('copper'), 80)).toBe(Infinity);
    expect(Number.isFinite(M.midReachTime(mat('copper'), M.hotMin))).toBe(true);
    expect((M.hotMin + 20) / 2).toBeGreaterThan(M.finishC);
  });
});

describe('two bodies reaching equilibrium', () => {
  const base = { m1: 1, c1: 4186, T1: 20, m2: 1, c2: 449, T2: 90, G: 5, tEnd: 3600, steps: 36 };

  it('matches the analytic closed-system solution', () => {
    const C1 = 4186, C2 = 449;
    const Tf = (C1 * 20 + C2 * 90) / (C1 + C2);
    const tau = 1 / (5 * (1 / C1 + 1 / C2));
    const r = M.twoBodyEquilibrium(base);
    expect(r.closed).toBe(true);
    expect(r.Tf).toBeCloseTo(Tf, 10);
    expect(r.tauS).toBeCloseTo(tau, 8);
    const p = r.at(tau);
    const gap = 70 / Math.E;
    expect(p.T1).toBeCloseTo(Tf - gap * C2 / (C1 + C2), 8);
    expect(p.T2).toBeCloseTo(Tf + gap * C1 / (C1 + C2), 8);
    // Heat into the cold water equals C1 dT1; q12 is signed body 1 -> body 2.
    expect(p.q12J).toBeCloseTo(-C1 * (p.T1 - 20), 4);
    r.points.forEach((pt) => expect(Math.abs(pt.energyResidualJ)).toBeLessThan(1e-6));
  });

  it('raises entropy monotonically to the hand value sum C ln(Tf / Ti)', () => {
    const r = M.twoBodyEquilibrium(base);
    for (let i = 1; i < r.points.length; i++) expect(r.points[i].dS).toBeGreaterThanOrEqual(r.points[i - 1].dS - 1e-9);
    const TfK = r.Tf + 273.15;
    const hand = 4186 * Math.log(TfK / 293.15) + 449 * Math.log(TfK / 363.15);
    expect(r.points[r.points.length - 1].dS).toBeCloseTo(hand, 4);
    expect(hand).toBeGreaterThan(0);
  });

  it('with a leak, system entropy can fall but system + room never does', () => {
    const r = M.twoBodyEquilibrium(Object.assign({}, base, { leak1: 0.5, leak2: 0.5, roomC: 20 }));
    expect(r.closed).toBe(false);
    expect(r.points[r.points.length - 1].dS).toBeLessThan(0);
    for (let i = 1; i < r.points.length; i++) expect(r.points[i].dStotal).toBeGreaterThanOrEqual(r.points[i - 1].dStotal - 1e-9);
    r.points.forEach((pt) => expect(Math.abs(pt.energyResidualJ)).toBeLessThan(1e-6));
    // Both bodies drift toward the room.
    const end = r.points[r.points.length - 1];
    expect(end.T1).toBeGreaterThan(20);
    expect(end.T2).toBeLessThan(r.Tf + 1);
  });

  it('handles no contact (G = 0) as two independent bodies', () => {
    const r = M.twoBodyEquilibrium(Object.assign({}, base, { G: 0 }));
    const end = r.points[r.points.length - 1];
    expect(end.T1).toBe(20);
    expect(end.T2).toBe(90);
  });
});

describe('heating curve stages and the trial log', () => {
  it('derives every stage from the published constants', () => {
    const st = M.waterStages(3100);
    expect(st.map((s) => s.id)).toEqual(['ice', 'melt', 'water', 'boil', 'steam']);
    expect(st.map((s) => Number(s.totalKJ.toFixed(1)))).toEqual([41.8, 375.8, 794.4, 3054.4, 3100]);
    expect(st[4].toC).toBeCloseTo(100 + 45.6e3 / 2010, 6);
  });

  it('caps the log at 200 rows and keeps the newest', () => {
    let log = [];
    for (let i = 0; i < 230; i++) log = M.logAppend(log, { i });
    expect(log).toHaveLength(200);
    expect(log[0].i).toBe(30);
    expect(log[199].i).toBe(229);
  });

  it('keys calorimetry credit to the exact mix', () => {
    expect(M.mixSignature('water', 0.5, 20, 'iron', 0.5, 90)).toBe(M.mixSignature('water', 0.50, 20.0, 'iron', 0.5, 90));
    expect(M.mixSignature('water', 0.5, 20, 'iron', 0.5, 90)).not.toBe(M.mixSignature('water', 0.6, 20, 'iron', 0.5, 90));
  });
});

describe('predict-observe-explain cards', () => {
  const t = (k, fb) => fb;

  it('targets all eleven misconceptions with tagged distractors', () => {
    const mis = M.misconceptions(t);
    const cards = M.poeCards(t);
    expect(mis).toHaveLength(11);
    const tagged = new Set();
    cards.forEach((c) => c.options.forEach((o) => { if (o.tag) tagged.add(o.tag); }));
    mis.forEach((m) => expect(tagged.has(m.id), m.id).toBe(true));
    cards.forEach((c) => {
      const answer = c.options.find((o) => o.id === c.answer);
      expect(answer, c.id).toBeTruthy();
      expect(answer.tag, c.id + ' answer must not carry a misconception').toBeNull();
      c.options.forEach((o) => { if (o.tag) expect(mis.some((m) => m.id === o.tag), o.tag).toBe(true); });
      const ev = c.evidence();
      expect(ev).not.toMatch(/undefined|NaN|\{[a-z0-9]+\}/);
    });
  });

  it('puts each card in an existing section and keeps the 13-topic index', () => {
    const html = renderTool('heatLab', {});
    M.poeCards(t).forEach((c) => {
      expect(html, c.id).toContain('id="htsec-' + c.section + '"');
      expect(html, c.id).toContain('data-ht-poe="' + c.id + '"');
    });
  });

  it('uses evidence numbers derived from the models', () => {
    const cards = Object.fromEntries(M.poeCards(t).map((c) => [c.id, c]));
    expect(cards.touch.evidence()).toContain('20.5 °C');
    expect(cards.touch.evidence()).toContain('30.5 °C');
    expect(cards.insulatorrace.evidence()).toContain('25 times');
  });
});

describe('conduction lab UI plumbing', () => {
  it('renders thermometers, a live T(t) chart, the ledger, the speed selector and a record button', () => {
    const html = renderTool('heatLab', { _heatLab: { raceOn: true } });
    expect(html).toContain('data-ht-probes="true"');
    expect(html).toContain('id="ht-probe-chart-description"');
    expect(html).toContain('data-ht-ledger="true"');
    expect(html).toContain('aria-label="Run at 1,000 times real time"');
    expect(html).toContain('Record trial');
    expect(html).toContain('aria-controls="ht-kalpha-panel"');
    expect((html.match(/id="heat-probe-\d"/g) || []).length).toBe(3);
    expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
  });

  it('clamps stored probes and speed to valid values', () => {
    const html = renderTool('heatLab', { _heatLab: { probes: [{ cm: -4 }, { cm: 99, bar: 'b' }, { cm: 7 }, { cm: 8 }], timeScale: 7 } });
    expect((html.match(/id="heat-probe-\d"/g) || []).length).toBe(3);
    expect(html).toContain('P1 · 1 cm');
    expect(html).toContain('P2 · 19 cm');
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Run at 10 times real time"/);
  });
});
