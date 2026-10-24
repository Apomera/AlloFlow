import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab, React, ReactDOMClient, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));

/**
 * Live Bead Run (view id speedChallenge). The old Speed Challenge scored 100%
 * for pressing Start and touching nothing. These tests pin the rebuilt module's
 * physics and scoring through its pure step function (the run is simulated
 * headless), and its personal-best / early-stop behaviour through a live mount
 * driven by a manual animation-frame clock.
 */

beforeEach(() => {
  resetStemLab();
  loadTool(SRC, 'weldLab');
  try { localStorage.clear(); } catch (e) { /* ignore */ }
  // A live mount's mirror effect leaves the host slot behind; hydration would read it.
  delete window.__alloflowWeldLab;
});

const R = () => window.__WeldLabCore.liveRun;
const core = () => window.__WeldLabCore;

// A welder who reads the joint ahead (thickness, gap, tack) and the puddle
// (stickout drift, plate heat) and sets travel speed for the target depth.
function expertPolicy(st, last, cond, inp) {
  const LR = R();
  const T = LR.TIERS[st.tierId];
  const target = T.targetFrac * cond.th;
  const aEff = inp.A - (cond.stickout - 0.5) * 60;
  const mHeat = 1 + 0.0006 * Math.max(0, st.plateT - 70);
  const mGap = 1 + 0.4 * cond.gap / 0.0625;
  const mTack = cond.tack ? 0.7 : 1;
  const TS = 0.01105 * inp.V * aEff * 0.048 * mHeat * mGap * mTack / target;
  return { V: inp.V, A: inp.A, TS: Math.max(5, Math.min(40, TS)) };
}
// A welder who only watches the puddle: nudges travel speed toward the target
// from the last slice's penetration, a little each frame.
function puddlePolicy(st, last, cond, inp) {
  if (!last) return inp;
  const TS = Math.max(5, Math.min(40, inp.TS * Math.pow(last.pen / last.target, 0.08)));
  return { V: inp.V, A: inp.A, TS };
}
function scoreOf(tier, seed, policy) {
  const st = R().simulate(tier, seed, policy, 30);
  return R().score(st.slices, tier).score;
}

describe('Live Bead Run: doing nothing no longer scores 100%', () => {
  it('an idle run scores far below a run that compensates, on every tier', () => {
    ['apprentice', 'pro', 'biw'].forEach((tier) => {
      for (let seed = 1; seed <= 6; seed++) {
        const idle = scoreOf(tier, seed, null);
        const expert = scoreOf(tier, seed, expertPolicy);
        const puddle = scoreOf(tier, seed, puddlePolicy);
        expect(idle, tier + ' idle').toBeLessThanOrEqual(55);
        expect(expert, tier + ' expert').toBeGreaterThanOrEqual(85);
        expect(puddle, tier + ' puddle-watcher').toBeGreaterThanOrEqual(85);
        expect(expert - idle, tier + ' gap between good and idle').toBeGreaterThanOrEqual(35);
      }
    });
  });

  it('a compensating policy beats a non-compensating one through the thickness step', () => {
    ['apprentice', 'pro', 'biw'].forEach((tier) => {
      // Same welder up to the step; then one keeps compensating, the other
      // freezes the settings it had on 1/4 in. plate.
      let frozen = null;
      const freezeAtStep = (st, last, cond, inp) => {
        if (st.x < st.plan.xStep - 0.2) return expertPolicy(st, last, cond, inp);
        if (!frozen) frozen = Object.assign({}, inp);
        return frozen;
      };
      const good = R().simulate(tier, 11, expertPolicy, 30);
      const bad = R().simulate(tier, 11, freezeAtStep, 30);
      const xs = good.plan.xStep;
      const okIn = (st) => {
        const win = st.slices.filter((s) => s.x >= xs && s.x <= xs + 1.5);
        return win.filter((s) => s.ok).length / win.length;
      };
      expect(okIn(good), tier + ' compensating').toBeGreaterThanOrEqual(0.9);
      expect(okIn(bad), tier + ' frozen').toBeLessThanOrEqual(0.2);
      // and the frozen bead burns deep on the thin plate, as the model predicts
      const thin = bad.slices.filter((s) => s.x >= xs + 0.2 && s.x <= xs + 1.5);
      expect(thin.every((s) => s.pen > s.hi)).toBe(true);
    });
  });
});

describe('Live Bead Run tiers', () => {
  it('have distinct, physically ordered targets: the top tier is not the coldest weld', () => {
    const { TIERS, TIER_IDS, THICK, THIN } = R();
    const { heatInputNet, beadGeometry } = core();
    expect(TIER_IDS).toEqual(['apprentice', 'pro', 'biw']);
    const T = TIER_IDS.map((id) => TIERS[id]);
    const net = T.map((t) => heatInputNet(t.V, t.A, t.TS, 'mig'));
    for (let i = 1; i < T.length; i++) {
      // production runs faster with more current...
      expect(T[i].TS).toBeGreaterThan(T[i - 1].TS);
      expect(T[i].A).toBeGreaterThan(T[i - 1].A);
      expect(T[i].V).toBeGreaterThan(T[i - 1].V);
      // ...so heat input RISES with the tier instead of falling by accident
      expect(net[i]).toBeGreaterThan(net[i - 1]);
      // deeper target, tighter band, stricter defect limit, bigger disturbances
      expect(T[i].targetFrac).toBeGreaterThan(T[i - 1].targetFrac);
      expect(T[i].tolFrac).toBeLessThan(T[i - 1].tolFrac);
      expect(T[i].defectMax).toBeLessThan(T[i - 1].defectMax);
      expect(T[i].gap).toBeGreaterThan(T[i - 1].gap);
      expect(T[i].ctwd).toBeGreaterThan(T[i - 1].ctwd);
      expect(T[i].heatK).toBeGreaterThan(T[i - 1].heatK);
    }
    expect(Math.min(...net)).toBe(net[0]);
    T.forEach((t) => {
      // each tier's starting settings land inside its own band on 1/4 in. plate
      // (run the shared model, do not trust a typed number)...
      const p = beadGeometry(t.V, t.A, t.TS, 'mig', 'steel', THICK).penetration;
      expect(p, t.id + ' on 1/4').toBeGreaterThanOrEqual((t.targetFrac - t.tolFrac) * THICK);
      expect(p, t.id + ' on 1/4').toBeLessThanOrEqual((t.targetFrac + t.tolFrac) * THICK);
      // ...and are too hot for 1/8 in. plate, so the step demands a response
      const q = beadGeometry(t.V, t.A, t.TS, 'mig', 'steel', THIN).penetration;
      expect(q, t.id + ' on 1/8').toBeGreaterThan((t.targetFrac + t.tolFrac) * THIN);
    });
  });
});

describe('Live Bead Run scoring', () => {
  it('is the fraction of bead length in spec, always an integer in [0, 100]', () => {
    const LR = R();
    const n = Math.round(LR.TIERS.pro.L / LR.SLICE_IN);
    const ok = { ok: true, penOk: true, defOk: true, width: 0.3, th: 0.25 };
    const bad = { ok: false, penOk: false, defOk: true, width: 0.3, th: 0.25 };
    expect(LR.score(Array(n).fill(ok), 'pro').score).toBe(100);
    expect(LR.score(Array(n).fill(bad), 'pro').score).toBe(0);
    expect(LR.score(Array(n / 2).fill(ok).concat(Array(n / 2).fill(bad)), 'pro').score).toBe(50);
    // more slices than the joint holds, junk entries, junk input: still bounded
    const junk = [
      null, undefined, 5, 'x', {}, [], Array(n * 3).fill(ok), [null, 'a', 7, ok, { ok: 'yes' }],
      Array(n).fill({ ok: true, width: NaN, th: undefined }), Array(n).fill({ width: -1, th: 0.25 })
    ];
    junk.forEach((j) => {
      ['pro', 'nope', '__proto__', undefined].forEach((tier) => {
        const s = LR.score(j, tier);
        ['score', 'pen', 'defects', 'uniform'].forEach((k) => {
          expect(Number.isInteger(s[k]), k).toBe(true);
          expect(s[k]).toBeGreaterThanOrEqual(0);
          expect(s[k]).toBeLessThanOrEqual(100);
        });
      });
    });
    // and over real runs driven by random hands
    for (let seed = 1; seed <= 12; seed++) {
      let r = seed;
      const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
      const wild = (st, last, cond, inp) => ({ V: 14 + rnd() * 20, A: 60 + rnd() * 300, TS: 2 + rnd() * 45 });
      const st = LR.simulate(['apprentice', 'pro', 'biw'][seed % 3], seed, wild, 30);
      const s = LR.score(st.slices, st.tierId);
      expect(s.complete).toBe(true);
      [s.score, s.pen, s.defects, s.uniform].forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); });
    }
  });

  it('counts a personal best only when strictly greater', () => {
    const { isNewBest, bestKey, normBest } = R();
    expect(isNewBest(80, 80)).toBe(false);
    expect(isNewBest(80, 79)).toBe(false);
    expect(isNewBest(80, 81)).toBe(true);
    expect(isNewBest(undefined, 0)).toBe(false);
    expect(isNewBest(undefined, 1)).toBe(true);
    expect(isNewBest('90', 50)).toBe(true);      // a non-number best is no best
    expect(isNewBest(50, NaN)).toBe(false);
    expect(isNewBest(50, '99')).toBe(false);
    // new-scale keys, so an old "100 for doing nothing" cannot block every future best
    expect(bestKey('pro')).toBe('pro_v2');
    expect(bestKey('__proto__')).toBe('apprentice_v2');
    // normalisation keeps only finite 0..100 numbers, and keeps old keys intact
    expect(normBest({ pro: 100, pro_v2: 61.4, biw_v2: 'x', apprentice_v2: 1e9, x: -3 })).toEqual({ pro: 100, pro_v2: 61 });
    expect(normBest('abc')).toEqual({});
    expect(normBest([1, 2])).toEqual({});
    expect(normBest(null)).toEqual({});
    const proto = normBest(JSON.parse('{"__proto__": {"polluted": 1}, "pro_v2": 5}'));
    expect(proto).toEqual({ pro_v2: 5 });
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Live Bead Run narration and coaching', () => {
  it('announces each event once, before the torch reaches a visible one', () => {
    const LR = R();
    const st = LR.init('pro', 5);
    const narrate = LR.makeNarrator(st.plan);
    const events = [];
    let now = 0;
    while (!st.done) {
      now += 1000 / 30;
      LR.step(st, { V: 22, A: 190, TS: 13 }, 1 / 30).forEach((s) => {
        narrate(now, s, st).forEach((m) => { if (m.kind === 'event') events.push({ type: m.type, x: s.x }); });
      });
    }
    const types = events.map((e) => e.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['gap', 'ctwd_long', 'step', 'tack', 'heat']));
    const step = events.find((e) => e.type === 'step');
    expect(step.x).toBeLessThan(st.plan.xStep);
  });

  it('diagnoses a slice with the cause that pushes the bead the way it went', () => {
    const LR = R();
    const idle = LR.simulate('pro', 9, null, 30);
    const xs = idle.plan.xStep;
    const i = idle.slices.findIndex((s) => s.x > xs + 0.3);
    const dg = LR.diagnose(idle.slices, i);
    expect(dg.issue).toBe('deep');
    expect(dg.cause).toBe('step');
    expect(dg.move).toBe('steady');
    expect(dg.verdict).toBe('deep_fix');
    // a run that SLOWED DOWN onto the thin plate is told that was the wrong move
    const slower = LR.simulate('pro', 9, (st, last, cond, inp) => (st.x > xs - 0.2 ? { V: 22, A: 190, TS: 9 } : inp), 30);
    const j = slower.slices.findIndex((s) => s.x > xs + 0.2);
    expect(LR.diagnose(slower.slices, j).verdict).toBe('deep_wrong');
    // the idle run's coaching leads with the step it never recovered from
    const tips = LR.coach(idle.slices, idle.plan, idle.heatAt, 'pro');
    expect(tips.length).toBeGreaterThan(0);
    expect(tips.length).toBeLessThanOrEqual(3);
    expect(tips[0].code).toBe('step_never');
  });
});

// ── Live mount with a manual animation-frame clock ──
let rafQ = [];
let rafNow = 0;
let rafSeq = 0;
let mounted = [];
function installRaf() {
  rafQ = []; rafNow = 0; rafSeq = 0;
  const raf = (cb) => { rafSeq += 1; rafQ.push({ id: rafSeq, cb }); return rafSeq; };
  const caf = (id) => { rafQ = rafQ.filter((r) => r.id !== id); };
  globalThis.requestAnimationFrame = raf; window.requestAnimationFrame = raf;
  globalThis.cancelAnimationFrame = caf; window.cancelAnimationFrame = caf;
}
const FRAME_MS = 100;
function frames(n) {
  for (let i = 0; i < n; i++) {
    rafNow += FRAME_MS;
    const q = rafQ; rafQ = [];
    act(() => { q.forEach((r) => r.cb(rafNow)); });
  }
}
function mountLive(seedState) {
  const cfg = window.StemLab._registry.weldLab;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const updates = [];
  function Shell() {
    const [td, setTd] = React.useState({ weldLab: Object.assign({ view: 'speedChallenge' }, seedState || {}) });
    const ctx = makeCtx({
      toolData: td,
      update: (tool, key, val) => {
        updates.push([key, val]);
        setTd((p) => Object.assign({}, p, { [tool]: Object.assign({}, p[tool] || {}, { [key]: val }) }));
      }
    });
    return cfg.render(ctx);
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Shell)); });
  mounted.push({ root, host });
  return { host, updates };
}
function click(host, re) {
  const b = Array.from(host.querySelectorAll('button')).find((x) => re.test(x.textContent || ''));
  if (!b) throw new Error('no button ' + re);
  act(() => { b.click(); });
}
function runToEnd(host) {
  for (let i = 0; i < 2000 && !/After-action review/.test(host.textContent); i++) frames(1);
}
const liveText = () => (document.getElementById('allo-live-weldlab') || {}).textContent;
// Replays the live loop's own arithmetic headless, to know a run's score first.
function expectedIdleScore(tier, seed) {
  const LR = R();
  const T = LR.TIERS[tier];
  const st = LR.init(tier, seed);
  let now = 0, last = null;
  for (let i = 0; i < 5000 && !st.done; i++) {
    now += FRAME_MS;
    if (last == null) last = now;
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    LR.step(st, { TS: T.TS, A: T.A, V: T.V }, dt);
  }
  return LR.score(st.slices, tier).score;
}
const SEED_RANDOM = 0.5; // runNewSeed() = floor(0.5 * 2147483646) + 1
const SEED = Math.floor(SEED_RANDOM * 2147483646) + 1;

describe('Live Bead Run live: personal best and early stop', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    installRaf();
    vi.spyOn(Math, 'random').mockReturnValue(SEED_RANDOM);
  });
  afterEach(() => {
    mounted.forEach((m) => { try { act(() => m.root.unmount()); } catch (e) { /* ignore */ } m.host.remove(); });
    mounted = [];
    vi.restoreAllMocks();
  });

  it('an early stop shows "Run stopped" and records no best', { timeout: 30000 }, () => {
    const { host, updates } = mountLive({ sc_tier: 'pro' });
    click(host, /Strike the arc/);
    frames(40);
    expect(host.textContent).toContain('Stop run (no score)'); // running
    click(host, /Stop run/);
    frames(3);
    expect(host.textContent).toMatch(/Run stopped at \d+\.\d of 10 in\.: no score recorded/);
    expect(host.textContent).not.toMatch(/Run complete/);
    expect(host.textContent).not.toMatch(/New personal best/);
    expect(updates.filter((u) => u[0] === 'speedBest')).toEqual([]);
    expect(updates.filter((u) => u[0] === 'run_predIdx')).toEqual([]);
    expect(localStorage.getItem('weldLab.speed.best.v1')).toBe(null);
    expect(liveText()).toBe('Run stopped. No score recorded.');
    // focus moved to the review heading (the Stop button it was near is gone)
    expect(document.activeElement && document.activeElement.textContent).toMatch(/After-action review/);
  });

  it('a tie with the personal best is not a new best; one point more is', () => {
    const S = expectedIdleScore('pro', SEED);
    expect(S).toBeGreaterThan(5);
    expect(S).toBeLessThan(60);

    // tie: nothing written, the old best is shown
    let m = mountLive({ sc_tier: 'pro', speedBest: { pro_v2: S } });
    click(m.host, /Strike the arc/);
    runToEnd(m.host);
    expect(m.host.textContent).toContain('Run complete: ' + S + '% of the bead in spec');
    expect(m.updates.filter((u) => u[0] === 'speedBest')).toEqual([]);
    expect(m.host.textContent).toContain('Personal best for Pro: ' + S + '%');
    expect(liveText()).toBe('Run complete: ' + S + '% of the bead in spec.');
    expect(localStorage.getItem('weldLab.speed.best.v1')).toBe(null);

    // one point below the run: a new best, written to toolData AND localStorage,
    // keeping the legacy key it found
    m = mountLive({ sc_tier: 'pro', speedBest: { pro: 100, pro_v2: S - 1 } });
    click(m.host, /Strike the arc/);
    runToEnd(m.host);
    const writes = m.updates.filter((u) => u[0] === 'speedBest');
    expect(writes.length).toBe(1);
    expect(writes[0][1]).toEqual({ pro: 100, pro_v2: S });
    expect(JSON.parse(localStorage.getItem('weldLab.speed.best.v1'))).toEqual({ pro: 100, pro_v2: S });
    expect(m.host.textContent).toContain('New personal best for Pro!');
    expect(liveText()).toBe('Run complete: ' + S + '% of the bead in spec. New personal best for Pro.');
    // a completed run rotates the prediction question
    expect(m.updates.filter((u) => u[0] === 'run_predIdx').map((u) => u[1])).toEqual([1]);
  }, 60000);
});

describe('Live Bead Run honours reduced motion', () => {
  // A recording 2D context: what the painter actually drew, frame by frame.
  function fakeCanvas() {
    const rec = { glow: [], alphas: [] };
    const handler = {
      get(t, k) {
        if (k === 'createRadialGradient' || k === 'createLinearGradient') {
          return () => ({ addColorStop: (o, c) => { if (/^rgba\(255,248,220,/.test(c)) rec.glow.push(c); } });
        }
        if (k in t) return t[k];
        return () => {};
      },
      set(t, k, v) { if (k === 'globalAlpha') rec.alphas.push(v); t[k] = v; return true; }
    };
    const ctx = new Proxy({}, handler);
    return { rec, getContext: () => ctx };
  }
  let saved;
  afterEach(() => {
    mounted.forEach((m) => { try { act(() => m.root.unmount()); } catch (e) { /* ignore */ } m.host.remove(); });
    mounted = [];
    if (saved) { window.HTMLCanvasElement.prototype.getContext = saved.gc; window.matchMedia = saved.mm; }
    vi.restoreAllMocks();
  });
  function drive(reduced) {
    saved = { gc: window.HTMLCanvasElement.prototype.getContext, mm: window.matchMedia };
    window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    resetStemLab();
    loadTool(SRC, 'weldLab');
    const fc = fakeCanvas();
    window.HTMLCanvasElement.prototype.getContext = fc.getContext;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    installRaf();
    const { host } = mountLive({ sc_tier: 'apprentice' });
    click(host, /Strike the arc/);
    frames(25);
    return { rec: fc.rec, host };
  }
  it('holds the arc glow steady and draws no sparks, while the bead still grows', () => {
    const { rec, host } = drive(true);
    expect(rec.glow.length).toBeGreaterThan(10);
    expect(new Set(rec.glow).size).toBe(1);
    expect(rec.alphas.filter((a) => a !== 0.9 && a !== 1)).toEqual([]);
    // the run itself still advances (the bead may grow under reduced motion)
    const prog = /(\d+\.\d) \/ 8 in\./.exec(host.textContent);
    expect(prog && parseFloat(prog[1])).toBeGreaterThan(0.2);
  });
  it('flickers (under 3 Hz) and throws sparks when motion is allowed', () => {
    const { rec } = drive(false);
    expect(new Set(rec.glow).size).toBeGreaterThan(5);
    expect(rec.alphas.filter((a) => a !== 0.9 && a !== 1).length).toBeGreaterThan(10);
  });
});
describe('Live Bead Run renders every state from untrusted saved data', () => {
  it('does not crash on hand-edited tier, best and prediction values', () => {
    const bads = [
      { sc_tier: '__proto__' }, { sc_tier: 'constructor' }, { sc_tier: 42 }, { sc_tier: null }, { sc_tier: { a: 1 } },
      { speedBest: 'abc' }, { speedBest: [1, 2, 3] }, { speedBest: null }, { speedBest: 7 },
      { speedBest: { apprentice_v2: 'x', pro_v2: 1e9, biw_v2: -4, pro: NaN } },
      { speedBest: JSON.parse('{"__proto__": {"apprentice_v2": 99}}') },
      { run_predIdx: 'zz' }, { run_predIdx: -5 }, { run_predIdx: 99 }, { run_predIdx: 2.7 }
    ];
    bads.forEach((b) => {
      const html = renderTool('weldLab', { weldLab: Object.assign({ view: 'speedChallenge' }, b) });
      expect(html, JSON.stringify(b)).toContain('Live Bead Run');
      expect(html).toContain('Strike the arc');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
    });
    // an out-of-range best never shows; a valid one does
    expect(renderTool('weldLab', { weldLab: { view: 'speedChallenge', speedBest: { pro_v2: 1e9 } } })).not.toContain('Best: 1000000000');
    expect(renderTool('weldLab', { weldLab: { view: 'speedChallenge', speedBest: { pro_v2: 64 } } })).toContain('Best: 64%');
  });

  it('shows the briefing with a prediction radiogroup and an honest menu of controls', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'speedChallenge' } });
    expect(html).toContain('Before you strike the arc');
    expect(html).toMatch(/role="radiogroup" aria-label="Your prediction"/);
    expect((html.match(/role="radio"/g) || []).length).toBe(3 + 4);
    expect(html).toContain('Halfway along the joint the plate thins');
    // the canvas has a text equivalent and the weld zone is keyboard-focusable
    expect(html).toMatch(/<canvas[^>]*role="img"[^>]*aria-label="Joint preview: 8 in\. long/);
    expect(html).toMatch(/tabindex="0"[^>]*role="group"|role="group"[^>]*tabindex="0"/);
    // the three live controls, with travel speed first
    const t = html.indexOf('Travel speed'), a = html.indexOf('Amperage (wire feed)'), v = html.indexOf('Voltage (arc length)');
    expect(t).toBeGreaterThan(-1);
    expect(a).toBeGreaterThan(t);
    expect(v).toBeGreaterThan(a);
    // no live region anywhere in the view
    expect(html).not.toMatch(/aria-live/);
  });

  it('keeps every new string translatable', () => {
    const src = readFileSync(resolve(process.cwd(), SRC), 'utf8');
    const region = src.slice(src.indexOf('// LIVE BEAD RUN (view id'), src.indexOf('function ComingSoon('));
    const keys = [...region.matchAll(/__alloT\('(stem\.weldlab\.[a-z0-9_]+)', '((?:[^'\\]|\\.)*)'\)/g)];
    expect(keys.length).toBeGreaterThan(150);
    const seen = {};
    keys.forEach((m) => {
      if (seen[m[1]] != null) expect(seen[m[1]], 'one key, two fallbacks: ' + m[1]).toBe(m[2]);
      seen[m[1]] = m[2];
    });
    const kj = resolve(SRC, '..', 'keys.json');
    if (!existsSync(kj)) return; // lane deliverable; absent once integrated
    const json = JSON.parse(readFileSync(kj, 'utf8'));
    Object.keys(seen).filter((k) => k.indexOf('stem.weldlab.run_') === 0).forEach((k) => {
      expect(json[k], 'keys.json missing ' + k).toBe(seen[k].replace(/\\'/g, "'"));
    });
  });
});
