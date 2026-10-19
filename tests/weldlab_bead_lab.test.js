import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, renderTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const requireFromRepo = createRequire(resolve(process.cwd(), 'desktop/web-app/package.json'));
const act = React.act || requireFromRepo('react-dom/test-utils').act;

/**
 * Lane ARC: Weld Bead Lab. The Bead Lab used to draw the same 0.550" bead at
 * every realistic setting (its width formula saturated at 2.3 kJ/in), pinned
 * uniformity at 100%, and graded spatter against an amperage "ideal" the defect
 * model never used. These pin the rebuilt lab: one model (beadGeometry +
 * _computeWeldDefects) behind every number, drawing and verdict.
 */

beforeEach(() => {
  delete window.__alloflowWeldLab;
  resetStemLab();
  loadTool(SRC, 'weldLab');
});

// A real client mount with a ctx whose update takes the tool's 3 arguments
// (the SSR harness's update takes 2), so clicks write state and re-render.
function mountBead(state) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const cfg = window.StemLab._registry.weldLab;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const store = { td: null };
  function App() {
    const s = React.useState({ weldLab: Object.assign({ view: 'beadLab' }, state || {}) });
    store.td = s[0];
    const ctx = {
      React, toolData: s[0], setToolData: s[1], t: (k, fb) => fb, addToast: () => {}, isContrast: false,
      update: (id, k, v) => s[1]((p) => Object.assign({}, p, { [id]: Object.assign({}, p[id], { [k]: v }) }))
    };
    return cfg.render(ctx);
  }
  act(() => { root.render(React.createElement(App)); });
  const button = (text) => Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes(text));
  const click = (el) => { if (!el) throw new Error('nothing to click'); act(() => { el.click(); }); };
  return {
    host, store, button, click,
    unmount: () => { act(() => { root.unmount(); }); host.remove(); }
  };
}

const core = () => window.__WeldLabCore;
const arc = () => window.__WeldLabCore.arc;
const bead = (state) => renderTool('weldLab', { weldLab: Object.assign({ view: 'beadLab' }, state || {}) });
const KEYS = ['burnthrough', 'lackOfFusion', 'undercut', 'overlap', 'spatter', 'porosity'];

// The value printed on a stat card, read from the rendered page.
function statValue(html, label) {
  const at = html.indexOf('>' + label + '<');
  if (at < 0) throw new Error('no stat card ' + label);
  const m = /<div class="text-2xl font-black[^"]*">([^<]+)</.exec(html.slice(at));
  return m[1];
}
// The percentage printed on a scorecard row.
function rowValue(html, id) {
  const at = html.indexOf('data-arc-row="' + id + '"');
  if (at < 0) throw new Error('no scorecard row ' + id);
  const m = /<span class="font-bold text-slate-700">(\d+)%<\/span>/.exec(html.slice(at));
  return Number(m[1]);
}
function attr(html, name) {
  const m = new RegExp(name + '="([^"]*)"').exec(html);
  return m ? m[1] : null;
}

describe('Bead width follows the process triangle through the numbers the view shows', () => {
  const widthAt = (st) => Number(statValue(bead(Object.assign({ bl_V: 22, bl_A: 180, bl_TS: 12 }, st)), 'Bead Width'));

  it('narrows as travel speed rises', () => {
    const ws = [6, 9, 12, 18, 24].map((ts) => widthAt({ bl_TS: ts }));
    for (let i = 1; i < ws.length; i++) expect(ws[i], 'width at step ' + i).toBeLessThan(ws[i - 1]);
  });

  it('widens as voltage rises', () => {
    const ws = [16, 19, 22, 26, 30].map((v) => widthAt({ bl_V: v }));
    for (let i = 1; i < ws.length; i++) expect(ws[i]).toBeGreaterThan(ws[i - 1]);
  });

  it('widens as amperage rises', () => {
    const ws = [100, 140, 180, 220, 260].map((a) => widthAt({ bl_A: a }));
    for (let i = 1; i < ws.length; i++) expect(ws[i]).toBeGreaterThan(ws[i - 1]);
  });

  it('prints the shared beadGeometry numbers, not a second model', () => {
    const { beadGeometry } = core();
    [[22, 180, 12], [16, 90, 25], [30, 300, 6], [26, 220, 9]].forEach(([V, A, TS]) => {
      const html = bead({ bl_V: V, bl_A: A, bl_TS: TS });
      const g = beadGeometry(V, A, TS, 'mig', 'steel', 0.25);
      expect(statValue(html, 'Bead Width')).toBe(g.width.toFixed(3));
      expect(statValue(html, 'Reinforcement')).toBe(g.reinf.toFixed(3));
      expect(statValue(html, 'Penetration')).toBe(g.penetration.toFixed(3));
    });
  });

  it('no longer draws one bead for every setting', () => {
    // The old formula gave 0.550" for both of these.
    const cold = widthAt({ bl_V: 16, bl_A: 90, bl_TS: 25 });
    const hot = widthAt({ bl_V: 30, bl_A: 300, bl_TS: 6 });
    expect(hot - cold).toBeGreaterThan(0.4);
    // and the default reinforcement is a real stringer, not a 0.013" smear
    const r = Number(statValue(bead(), 'Reinforcement'));
    expect(r).toBeGreaterThanOrEqual(1 / 16);
    expect(r).toBeLessThanOrEqual(0.15);
  });
});

describe('Uniformity is measured, not fixed', () => {
  it('scores steady travel against the speed range a hand can hold for the process', () => {
    const { bandUniformity, travelBand } = arc();
    expect(bandUniformity(12, 'mig')).toBe(100);
    expect(bandUniformity(6, 'tig')).toBe(100);
    // 12 in/min is fine for MIG but too fast to hand-feed TIG steadily
    expect(bandUniformity(12, 'tig')).toBeLessThan(100);
    expect(bandUniformity(28, 'mig')).toBeLessThan(bandUniformity(20, 'mig'));
    const b = travelBand('mig');
    expect(bandUniformity(b.hi + 0.01, 'mig')).toBeLessThan(100);
    expect(bandUniformity(b.lo - 0.01, 'mig')).toBeLessThan(100);
  });

  it('shows that score on the scorecard row', () => {
    const { bandUniformity } = arc();
    expect(rowValue(bead({ bl_TS: 12 }), 'unif')).toBe(100);
    expect(rowValue(bead({ bl_TS: 28 }), 'unif')).toBe(Math.round(bandUniformity(28, 'mig')));
    expect(rowValue(bead({ bl_process: 'tig', bl_TS: 14 }), 'unif')).toBe(Math.round(bandUniformity(14, 'tig')));
  });

  it('drops as a hand-laid pass varies its speed more', () => {
    const { speedStats, beadReport, SEGMENTS } = arc();
    const runAt = (amp) => Array.from({ length: SEGMENTS }, (_, i) => 12 * (1 + amp * ((i % 2) ? 1 : -1)));
    const amps = [0, 0.05, 0.1, 0.2, 0.35];
    const steady = amps.map((a) => speedStats(runAt(a)).steadiness);
    expect(steady[0]).toBe(100);
    for (let i = 1; i < steady.length; i++) expect(steady[i]).toBeLessThan(steady[i - 1]);
    const unif = amps.map((a) => beadReport(22, 180, 12, 'mig', 'steel', 0.25, runAt(a)).scores.unif);
    for (let i = 1; i < unif.length; i++) expect(unif[i]).toBeLessThan(unif[i - 1]);
    // the coefficient of variation is what is scored
    const st = speedStats(runAt(0.1));
    expect(st.cv).toBeCloseTo(0.1, 6);
    expect(st.steadiness).toBeCloseTo(100 - 150 * 0.1, 6);
  });
});

describe('The scorecard and the defect model give one bead one verdict', () => {
  it('rejects exactly when the defect model reports a rejectable defect', () => {
    const { beadGeometry, computeWeldDefects } = core();
    const { beadReport, REJECT_AT } = arc();
    let checked = 0, rejects = 0;
    ['mig', 'tig', 'stick', 'oxy'].forEach((P) => {
      ['steel', 'aluminum', 'stainless'].forEach((M) => {
        [0.125, 0.25, 0.375].forEach((TH) => {
          [14, 22, 30].forEach((V) => {
            [70, 140, 220, 320].forEach((A) => {
              [4, 12, 24].forEach((TS) => {
                const r = beadReport(V, A, TS, P, M, TH);
                const g = beadGeometry(V, A, TS, P, M, TH);
                const d = computeWeldDefects(g.net, TH, V, A, TS, P);
                const max = Math.max(...KEYS.map((k) => d[k]));
                expect(r.verdict === 'reject').toBe(max >= REJECT_AT);
                expect(r.scores.sound).toBeCloseTo(100 * (1 - max), 9);
                expect(r.found.slice().sort()).toEqual(KEYS.filter((k) => d[k] > 0).sort());
                if (r.verdict === 'reject') { rejects++; expect(r.overall).toBeLessThanOrEqual(50); }
                if (r.verdict === 'accept') expect(max).toBe(0);
                checked++;
              });
            });
          });
        });
      });
    });
    expect(checked).toBe(4 * 3 * 3 * 3 * 4 * 3);
    expect(rejects).toBeGreaterThan(50);
  });

  it('no longer docks spatter on a bead the defect model calls clean', () => {
    const { computeWeldDefects, beadGeometry } = core();
    // 300 A MIG: the old scorecard scored spatter 55% here.
    const g = beadGeometry(30, 300, 26, 'mig', 'steel', 0.375);
    const d = computeWeldDefects(g.net, 0.375, 30, 300, 26, 'mig');
    expect(d.spatter).toBe(0);
    const r = arc().beadReport(30, 300, 26, 'mig', 'steel', 0.375);
    expect(r.found).not.toContain('spatter');
  });

  it('renders the same verdict the model gives', () => {
    const hot = bead({ bl_V: 30, bl_A: 300, bl_TS: 6 });
    expect(attr(hot, 'data-arc-verdict')).toBe('reject');
    expect(hot.includes('Rejectable defect: Burnthrough')).toBe(true);
    expect(Number(statValue(hot, 'Score').replace('%', ''))).toBeLessThanOrEqual(50);
    expect(rowValue(hot, 'sound')).toBe(0);
    const ok = bead();
    expect(attr(ok, 'data-arc-verdict')).toBe('accept');
    expect(rowValue(ok, 'sound')).toBe(100);
  });

  it('labels the toe angle with what it means', () => {
    const { toeClass } = arc();
    const { beadGeometry } = core();
    expect(toeClass(beadGeometry(22, 180, 12, 'mig', 'steel', 0.25).toeAngle)).toBe('flat');
    expect(toeClass(beadGeometry(16, 110, 20, 'mig', 'steel', 0.25).toeAngle)).toBe('ropey');
    const html = bead({ bl_V: 16, bl_A: 110, bl_TS: 20 });
    expect(html.includes('steep, ropey')).toBe(true);
    expect(html.includes('cold lap')).toBe(true);
  });
});

describe('Hands-on travel bookkeeping', () => {
  it('turns distance over time into in/min on the sped-up clock', () => {
    const { accrue, segmentSpeeds, SEGMENTS, BEAD_LEN_IN, TIME_SCALE } = arc();
    const segTime = new Array(SEGMENTS).fill(0);
    // 12 in/min on a 6x clock is 1.2 in/s of screen travel
    const inPerSec = 12 * TIME_SCALE / 60;
    let x = 0;
    for (let f = 0; f < 400 && x < BEAD_LEN_IN; f++) {
      const dx = Math.min(BEAD_LEN_IN - x, inPerSec / 60);
      accrue(segTime, x, dx, 1 / 60);
      x += dx;
    }
    const sp = segmentSpeeds(segTime, x);
    expect(sp.length).toBe(SEGMENTS);
    sp.forEach((s) => expect(s).toBeCloseTo(12, 1));
  });

  it('books a held-still arc onto its segment, which then comes out fat and hot', () => {
    const { accrue, segmentSpeeds, beadReport, SEGMENTS, BEAD_LEN_IN } = arc();
    const segLen = BEAD_LEN_IN / SEGMENTS;
    const segTime = new Array(SEGMENTS).fill(0);
    let x = 0;
    const step = (dx, dt) => { accrue(segTime, x, dx, dt); x += dx; };
    for (let i = 0; i < 10; i++) step(segLen, segLen / (12 * 6 / 60));
    step(0, 1.5); // hold the arc still in segment 10
    for (let i = 10; i < SEGMENTS; i++) step(segLen, segLen / (12 * 6 / 60));
    const sp = segmentSpeeds(segTime, x);
    expect(sp[10]).toBeLessThan(sp[9] / 2);
    const r = beadReport(22, 180, 12, 'mig', 'steel', 0.25, sp);
    expect(r.segs[10].width).toBeGreaterThan(r.segs[9].width);
    // one lingering spot burns through, and one hole rejects the whole weld
    expect(r.segs[10].defects.burnthrough).toBeGreaterThan(0);
    expect(r.defects.burnthrough).toBe(r.segs[10].defects.burnthrough);
    expect(r.verdict).toBe(r.defects.burnthrough >= 0.2 ? 'reject' : r.verdict);
  });

  it('rebuilds a half-laid pass from saved speeds so it can resume', () => {
    const { handFromRun, segmentSpeeds, BEAD_LEN_IN, SEGMENTS } = arc();
    const saved = [10, 11, 12, 13, 14];
    const hand = handFromRun(saved);
    expect(hand.started).toBe(true);
    expect(hand.done).toBe(false);
    expect(hand.x).toBeCloseTo(5 * BEAD_LEN_IN / SEGMENTS, 9);
    segmentSpeeds(hand.segTime, hand.x).forEach((s, i) => expect(s).toBeCloseTo(saved[i], 6));
    expect(handFromRun(new Array(SEGMENTS).fill(12)).done).toBe(true);
  });
});

describe('Missions are graded by the model', () => {
  // Independent re-derivation of each prediction from beadGeometry and the
  // defect model, NOT from the lane's own helper.
  function measure(s, what) {
    const { beadGeometry, computeWeldDefects } = core();
    const g = beadGeometry(s.V, s.A, s.TS, s.P, s.M, s.TH);
    if (what === 'undercut') return computeWeldDefects(g.net, s.TH, s.V, s.A, s.TS, s.P).undercut;
    if (what === 'net') return g.net;
    return g[what];
  }
  function apply(s, ch) {
    const t = Object.assign({}, s);
    Object.entries(ch.change || {}).forEach(([k, v]) => { t[k] = s[k] + v; });
    Object.entries(ch.scale || {}).forEach(([k, v]) => { t[k] = s[k] * v; });
    Object.entries(ch.set || {}).forEach(([k, v]) => { t[k] = v; });
    return t;
  }

  it('computes every prediction answer from the model', () => {
    const { MISSIONS, predictionTruth } = arc();
    expect(MISSIONS.length).toBeGreaterThanOrEqual(5);
    const slots = new Set();
    MISSIONS.forEach((m) => {
      const t = predictionTruth(m);
      const before = measure(m.preset, m.probe.measure);
      let code;
      if (m.probe.best) {
        let best = -Infinity;
        m.probe.best.forEach((c) => { const v = measure(apply(m.preset, c), m.probe.measure); if (before - v > best) { best = before - v; code = c.key; } });
      } else {
        const after = measure(apply(m.preset, m.probe), m.probe.measure);
        code = Math.abs(after - before) / Math.max(Math.abs(before), 1e-6) < 0.01 ? 'same' : after > before ? 'up' : 'down';
      }
      expect(t.code, m.id).toBe(code);
      expect(t.index, m.id).toBe(m.outcomes.indexOf(code));
      expect(t.index).toBeGreaterThanOrEqual(0);
      expect(m.outcomes.length).toBe(3);
      slots.add(t.index);
    });
    // the right answer is not always in the same place
    expect(slots.size).toBe(3);
  });

  it('fails every mission at its own starting settings', () => {
    const { MISSIONS, missionCheck } = arc();
    MISSIONS.forEach((m) => {
      expect(missionCheck(m, Object.assign({ run: [], runByHand: false }, m.preset)).pass, m.id).toBe(false);
    });
  });

  it('passes the size mission exactly when the model width is in range with no rejectable defect', () => {
    const { MISSIONS, missionCheck, REJECT_AT } = arc();
    const { beadGeometry, computeWeldDefects } = core();
    const m = MISSIONS.find((x) => x.id === 'sizeBead');
    let passes = 0;
    for (let V = 14; V <= 34; V += 2) for (let A = 90; A <= 300; A += 15) for (let TS = 4; TS <= 30; TS += 2) {
      const s = { V, A, TS, P: 'mig', M: 'steel', TH: 0.25 };
      const g = beadGeometry(V, A, TS, 'mig', 'steel', 0.25);
      const d = computeWeldDefects(g.net, 0.25, V, A, TS, 'mig');
      const expected = g.width >= 0.30 && g.width <= 0.35 && KEYS.every((k) => d[k] < REJECT_AT);
      expect(missionCheck(m, s).pass).toBe(expected);
      if (expected) passes++;
    }
    expect(passes).toBeGreaterThan(10);
  });

  it('derives the lowest-heat target by inverting the penetration model', () => {
    const { MISSIONS, missionCheck, netForPenetration } = arc();
    const { beadPenetration, MATERIAL, heatInputNet } = core();
    const need = netForPenetration(0.7 * 0.375, 'steel', 0.375);
    expect(beadPenetration(need, 0.375, MATERIAL.steel.kFactor)).toBeCloseTo(0.7 * 0.375, 4);
    // a different plate needs a different heat input: nothing here is typed
    expect(netForPenetration(0.7 * 0.25, 'steel', 0.25)).toBeLessThan(need);
    const m = MISSIONS.find((x) => x.id === 'lowHeat');
    // find a passing MIG setting by search, then show 20% more heat fails
    let found = null;
    for (let TS = 6; TS <= 30 && !found; TS += 0.25) {
      const s = { V: 26, A: 240, TS, P: 'mig', M: 'steel', TH: 0.375 };
      if (missionCheck(m, s).pass) found = s;
    }
    expect(found).not.toBeNull();
    expect(heatInputNet(found.V, found.A, found.TS, 'mig')).toBeLessThanOrEqual(need * 1.1);
    const hotter = Object.assign({}, found, { TS: found.TS / 1.2 });
    expect(missionCheck(m, hotter).pass).toBe(false);
  });

  it('only credits the steady-hand mission for a full pass laid by hand', () => {
    const { MISSIONS, missionCheck, SEGMENTS } = arc();
    const m = MISSIONS.find((x) => x.id === 'steadyHand');
    const steady = new Array(SEGMENTS).fill(12);
    const base = { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25 };
    expect(missionCheck(m, Object.assign({ run: steady, runByHand: true }, base)).pass).toBe(true);
    // the auto "weld steady" button lays the same speeds, but it is not your hand
    expect(missionCheck(m, Object.assign({ run: steady, runByHand: false }, base)).pass).toBe(false);
    expect(missionCheck(m, Object.assign({ run: steady.slice(0, 20), runByHand: true }, base)).pass).toBe(false);
    const shaky = steady.map((s, i) => s * (i % 2 ? 1.35 : 0.65));
    expect(missionCheck(m, Object.assign({ run: shaky, runByHand: true }, base)).pass).toBe(false);
  });

  it('keeps no typed answer key in the mission table', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const block = src.slice(src.indexOf('var ARC_MISSIONS = ['), src.indexOf('function arcApplyChange('));
    expect(block.length).toBeGreaterThan(500);
    expect(block).not.toMatch(/\b(answer|correct)\s*:/);
  });
});

describe('Saved state is untrusted input', () => {
  it('normalises runs, pins and mission progress', () => {
    const { normRun, normPin, normMissions } = arc();
    expect(normRun([10, 50, 'x', 12])).toEqual([10, 40]);
    expect(normRun('junk')).toEqual([]);
    expect(normRun(new Array(99).fill(12)).length).toBe(32);
    expect(normPin({ V: 'x', A: 180, TS: 12, TH: 0.25 })).toBeNull();
    expect(normPin([1, 2])).toBeNull();
    const p = normPin({ V: 99, A: 180, TS: 12, TH: 0.25, P: 'laser', M: 'gold', run: [12, 'a'] });
    expect(p).toEqual({ V: 40, A: 180, TS: 12, TH: 0.25, P: 'mig', M: 'steel', run: [12] });
    const ms = normMissions({ thinAl: { pred: 7, locked: true, done: 'yes', tries: -3 }, bogus: { done: true }, sizeBead: { pred: 1, locked: true, done: true, predOk: true, tries: 2.7 } });
    expect(Object.keys(ms).sort()).toEqual(['sizeBead', 'thinAl']);
    expect(ms.thinAl).toEqual({ pred: -1, locked: false, predOk: false, done: false, tries: 0, loaded: false });
    expect(ms.sizeBead).toEqual({ pred: 1, locked: true, predOk: true, done: true, tries: 2, loaded: false });
    expect(normMissions('junk')).toEqual({});
  });

  it('renders a hand-edited project instead of crashing', () => {
    const html = bead({
      bl_process: 'laser', bl_material: 'unobtanium', bl_view: 'vr', bl_joint: 9, bl_position: null,
      arc_run: [1, 'a', NaN], arc_pin: { V: 'x' }, arc_missions: 'junk', arc_mission: 99, arc_handsOn: 'yes', arc_handSpeed: 'fast'
    });
    expect(html.length).toBeGreaterThan(5000);
    expect(html.includes('Macro-etch cross-section')).toBe(true);
    // falls back to MIG on mild steel, auto travel, last mission
    expect(html.includes('Mild Steel A36 · MIG')).toBe(true);
    expect(attr(html, 'data-arc-mission')).toBe('steadyHand');
    expect(html.includes('Hold to weld')).toBe(false);
  });
});

describe('Bead Lab renders every new state', () => {
  it('renders the default bead with the macro-etch, compare and missions panels', () => {
    const html = bead();
    expect(html.includes('data-arc-xs="true"')).toBe(true);
    expect(attr(html, 'data-arc-compare')).toBe('empty');
    expect(html.includes('data-arc-missions="true"')).toBe(true);
    expect(attr(html, 'data-arc-verdict')).toBe('accept');
    // the canvas has a text equivalent carrying the model's numbers
    const r = arc().beadReport(22, 180, 12, 'mig', 'steel', 0.25);
    expect(html.includes('Bead ' + r.width.toFixed(3) + ' inches wide')).toBe(true);
  });

  it('describes the macro-etch in numbers', () => {
    const html = bead({ bl_thickness: 0.125, bl_V: 24, bl_A: 220, bl_TS: 8 });
    const r = arc().beadReport(24, 220, 8, 'mig', 'steel', 0.125);
    const svg = html.slice(html.indexOf('data-arc-xs'));
    const label = /aria-label="([^"]+)"/.exec(html.slice(html.lastIndexOf('<svg', html.indexOf('data-arc-xs'))))[1];
    expect(label).toContain('Penetration ' + r.penetration.toFixed(3) + ' inches');
    expect(label).toContain(Math.round(r.penRatio * 100) + ' percent of the thickness');
    expect(label).toContain('Root burned through');
    expect(svg.length).toBeGreaterThan(0);
    // and the default bead keeps its root
    expect(bead().includes('Root intact')).toBe(true);
  });

  it('shows lack of fusion as an unfused boundary in the cross-section', () => {
    const cold = bead({ bl_V: 16, bl_A: 90, bl_TS: 25 });
    expect(cold.includes('crown resting on the plate without fusing')).toBe(true);
    expect(cold.includes('stroke="#f87171"')).toBe(true);
    expect(bead().includes('stroke="#f87171"')).toBe(false);
  });

  it('renders the hands-on torch with keyboard path, controls and speed trace', () => {
    const html = bead({ arc_handsOn: true });
    expect(html.includes('Hold to weld')).toBe(true);
    expect(html.includes('Weld steady (auto)')).toBe(true);
    expect(html.includes('data-arc-trace="true"')).toBe(true);
    expect(html.includes('no pass laid yet')).toBe(true);
    expect(/<canvas[^>]*tabindex="0"/.test(html)).toBe(true);
    expect(html.includes('hold the Right arrow key to weld')).toBe(true);
    expect(html.includes('aria-label="Travel mode"')).toBe(true);
  });

  it('grades a saved hand-laid pass on its own speeds', () => {
    const run = Array.from({ length: 32 }, (_, i) => 12 + ((i % 4) - 1.5));
    const html = bead({ arc_handsOn: true, arc_run: run, arc_runHand: true });
    const r = arc().beadReport(22, 180, 12, 'mig', 'steel', 0.25, run);
    expect(html.includes('32 of 32 segments laid')).toBe(true);
    expect(html.includes('Pass complete (laid by hand)')).toBe(true);
    expect(rowValue(html, 'unif')).toBe(Math.round(r.scores.unif));
    expect(html.includes('Your hand averaged')).toBe(true);
  });

  it('pins a bead and reports what one changed variable did', () => {
    const html = bead({ arc_pin: { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25, run: [] }, bl_TS: 6 });
    expect(attr(html, 'data-arc-compare')).toBe('pinned');
    expect(html.includes('One variable changed: a fair test.')).toBe(true);
    const { beadGeometry } = core();
    const a = beadGeometry(22, 180, 12, 'mig', 'steel', 0.25).width;
    const b = beadGeometry(22, 180, 6, 'mig', 'steel', 0.25).width;
    expect(html.includes('+' + (b - a).toFixed(3))).toBe(true);
    expect(html.includes('your pinned bead')).toBe(true);
    const two = bead({ arc_pin: { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25 }, bl_TS: 6, bl_V: 26 });
    expect(two.includes('2 variables changed')).toBe(true);
  });

  it('renders a mission with its prediction radiogroup, then the locked, passed state', () => {
    const fresh = bead({ arc_mission: 3 });
    expect(attr(fresh, 'data-arc-mission')).toBe('coldRopey');
    expect(fresh.includes('Make a prediction to unlock the check.')).toBe(true);
    expect(/role="radiogroup" aria-label="Which ONE change flattens the ropey bead the most\?"/.test(fresh)).toBe(true);
    const done = bead({ arc_mission: 3, arc_missions: { coldRopey: { pred: 2, locked: true, predOk: true, done: true, tries: 1 } } });
    expect(done.includes('1 of 6 passed')).toBe(true);
    expect(done.includes('Prediction locked in')).toBe(true);
    const radios = done.slice(done.indexOf('Which ONE change'), done.indexOf('Check my weld'));
    expect((radios.match(/role="radio"[^>]*disabled=""/g) || []).length).toBe(3);
  });
});

describe('Fix-it missions start from their bad bead', () => {
  it('does not pass "fix the cold bead" on the module\'s own good default', () => {
    const { MISSIONS, missionCheck, normMissions } = arc();
    const def = { V: 22, A: 180, TS: 12, P: 'mig', M: 'steel', TH: 0.25 };
    ['coldRopey'].forEach((id) => {
      const m = MISSIONS.find((x) => x.id === id);
      const fresh = missionCheck(m, Object.assign({ loaded: false }, def));
      expect(fresh.pass).toBe(false);
      expect(fresh.needPreset).toBe(true);
      // once the bad bead was loaded, fixing it back to these settings passes
      expect(missionCheck(m, Object.assign({ loaded: true }, def)).pass).toBe(true);
    });
    expect(MISSIONS.filter((m) => m.fromPreset).map((m) => m.id).sort()).toEqual(['coldRopey', 'undercut']);
    expect(normMissions({ coldRopey: { loaded: true }, undercut: { loaded: 'yes' } })).toEqual({
      coldRopey: { pred: -1, locked: false, predOk: false, done: false, tries: 0, loaded: true },
      undercut: { pred: -1, locked: false, predOk: false, done: false, tries: 0, loaded: false }
    });
  });
});

describe('Bead Lab interactions (client mount)', () => {
  it('predicts, refuses a check before the bad bead is loaded, then locks the prediction on the first real check', () => {
    const ui = mountBead({ arc_mission: 3 });
    try {
      const check = () => ui.button('Check my weld');
      expect(check().disabled).toBe(true);
      ui.click(ui.button('Raise voltage by 3 V'));
      expect(check().disabled).toBe(false);
      ui.click(check());
      expect(ui.host.querySelector('[data-arc-result]').getAttribute('data-arc-result')).toBe('need-preset');
      expect(ui.button('Raise voltage by 3 V').disabled).toBe(false);
      ui.click(ui.button('Load starting settings'));
      expect(ui.store.td.weldLab.bl_V).toBe(16);
      expect(ui.store.td.weldLab.arc_missions.coldRopey.loaded).toBe(true);
      ui.click(check());
      const res = ui.host.querySelector('[data-arc-result]');
      expect(res.getAttribute('data-arc-result')).toBe('fail');
      // the model says voltage flattens it most, so this prediction was right
      expect(res.textContent).toContain('Prediction: right.');
      const saved = ui.store.td.weldLab.arc_missions.coldRopey;
      expect(saved.locked).toBe(true);
      expect(saved.tries).toBe(1);
      ['Lower amperage by 20 A', 'Travel 4 in/min faster', 'Raise voltage by 3 V'].forEach((t) => {
        expect(ui.button(t).disabled, t).toBe(true);
      });
    } finally { ui.unmount(); }
  });

  it('passes a fixed bead and counts it', () => {
    const ui = mountBead({ arc_mission: 3, arc_missions: { coldRopey: { loaded: true } } });
    try {
      ui.click(ui.button('Lower amperage by 20 A'));
      ui.click(ui.button('Check my weld'));
      const res = ui.host.querySelector('[data-arc-result]');
      expect(res.getAttribute('data-arc-result')).toBe('pass');
      expect(res.textContent).toContain('Prediction: not this time.');
      expect(ui.host.textContent).toContain('1 of 6 passed');
      expect(ui.store.td.weldLab.arc_missions.coldRopey.done).toBe(true);
    } finally { ui.unmount(); }
  });

  it('lays a steady pass, announces the result once, and clears it with a new plate', () => {
    const ui = mountBead({ arc_handsOn: true });
    try {
      ui.click(ui.button('Weld steady (auto)'));
      const trace = () => ui.host.querySelector('[data-arc-trace]').getAttribute('aria-label');
      expect(trace()).toContain('32 of 32 segments laid');
      expect(ui.store.td.weldLab.arc_run.length).toBe(32);
      expect(ui.store.td.weldLab.arc_runHand).toBe(false);
      expect(document.getElementById('allo-live-weldlab').textContent).toMatch(/^Pass complete\. Uniformity 100 percent/);
      expect(ui.button('Hold to weld').disabled).toBe(true);
      ui.click(ui.button('New plate'));
      expect(trace()).toContain('no pass laid yet');
      expect(ui.store.td.weldLab.arc_run).toEqual([]);
      expect(ui.button('Hold to weld').disabled).toBe(false);
    } finally { ui.unmount(); }
  });

  it('pins the current bead as settings and shows the compare table', () => {
    const ui = mountBead({ bl_TS: 9 });
    try {
      ui.click(ui.button('Pin this bead'));
      expect(ui.store.td.weldLab.arc_pin).toEqual({ V: 22, A: 180, TS: 9, TH: 0.25, P: 'mig', M: 'steel', run: [] });
      expect(ui.host.querySelector('[data-arc-compare]').getAttribute('data-arc-compare')).toBe('pinned');
      expect(ui.host.textContent).toContain('Nothing changed yet');
      ui.click(ui.button('Clear pin'));
      expect(ui.store.td.weldLab.arc_pin).toBeNull();
    } finally { ui.unmount(); }
  });
});

describe('Bead Lab keeps the file-wide rules', () => {
  const body = () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    return src.slice(src.indexOf('      function WeldBeadLab() {'), src.indexOf('      function WeldBeadLab3D(props) {'));
  };
  it('paints the canvases with literal colours only', () => {
    expect(body()).not.toMatch(/var\(--/);
  });
  it('keeps the arc pulse on the shared sub-3 Hz waveform exactly once in this view', () => {
    const b = body();
    expect((b.match(/0\.78 \+ 0\.12 \* Math\.sin\(elapsed \* 15\.1\) \+ 0\.06 \* Math\.sin\(elapsed \* 5\.7\)/g) || []).length).toBe(1);
  });
  it('skips the animation loop when reduced motion is on, unless the student is driving the arc', () => {
    expect(body()).toMatch(/var keepGoing = canvas\.isConnected && \(!_prefersReducedMotion \|\| !!\(live\.useRun && hand && hand\.active\)\)/);
  });
});
