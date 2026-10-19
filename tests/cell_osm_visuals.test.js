// Osmosis Lab visuals: every drawn quantity must come from osmosisModel(), the text
// alternative must state the model's condition, permeability 0 must show no crossing,
// and the animation must respect reduced motion, pause, hidden tabs, off-screen and unmount.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const req = createRequire(resolve(process.cwd(), 'tests/_x.js'));
const React = req('../desktop/web-app/node_modules/react');
const { createRoot } = req('../desktop/web-app/node_modules/react-dom/client');
const { flushSync } = req('../desktop/web-app/node_modules/react-dom');
const { renderToStaticMarkup } = req('../desktop/web-app/node_modules/react-dom/server');

let C, V;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
  V = window.__alloCellOsmosisPure;
});

const LEVELS = [0, 25, 50, 100, 150, 200];
const PERMS = [0, 1, 50, 100];
function sweep() {
  const out = [];
  for (const inside of LEVELS) for (const outside of LEVELS) for (const perm of PERMS) for (const cellType of ['animal', 'plant']) out.push({ inside, outside, perm, cellType });
  return out;
}
function ssr(state) {
  const div = document.createElement('div');
  div.innerHTML = renderToStaticMarkup(C.renderOsmosisLab(React.createElement, state, () => {}));
  return div;
}

describe('Osmosis visual state is derived from osmosisModel', () => {
  it('pose, state, crossing rates and condition text follow the model across a sweep', () => {
    const STATE = { inward: { animal: 'swelling', plant: 'turgid' }, outward: { animal: 'crenation', plant: 'plasmolysis' }, balanced: { animal: 'steady', plant: 'steady' }, blocked: { animal: 'blocked', plant: 'blocked' } };
    const bad = [];
    for (const s of sweep()) {
      const m = C.osmosisModel(s), v = V.osmosisVisualState(s);
      const expectPose = m.perm === 0 ? 0 : Math.sign(m.flow);
      if (v.pose !== expectPose) bad.push(['pose', s, v.pose]);
      if (v.state !== STATE[m.direction][m.cellType]) bad.push(['state', s, v.state]);
      if (Math.abs((v.rateIn - v.rateOut) - m.flow) > 1e-9) bad.push(['net', s]);
      if (v.rateIn < 0 || v.rateOut < 0) bad.push(['negative', s]);
      if (Math.abs((v.rateIn + v.rateOut) - 2 * V.OSMO_EXCHANGE_BASE * m.perm / 100) > 1e-9) bad.push(['total', s]);
      if (m.perm === 0 && (v.rateIn !== 0 || v.rateOut !== 0 || v.open)) bad.push(['blocked rates', s]);
      if (m.perm > 0 && (v.rateIn === 0 || v.rateOut === 0)) bad.push(['one-way', s]);
      if (!v.condition.startsWith(m.tonicity)) bad.push(['tonicity text', s, v.condition]);
      const phrase = { inward: 'net water flow into', outward: 'net water flow out of', balanced: 'no net water flow', blocked: 'permeability is 0%' }[m.direction];
      if (!v.condition.includes(phrase)) bad.push(['direction text', s, v.condition]);
      if (/undefined|NaN/.test(v.condition + v.shape + v.exchange)) bad.push(['raw value', s]);
    }
    expect(bad).toEqual([]);
  });

  it('magnitude cues scale with |flow| and the change speed is proportional to it', () => {
    const w = (perm) => V.osmosisVisualState({ inside: 100, outside: 50, perm }).arrowWidth;
    expect(w(25)).toBeLessThan(w(50));
    expect(w(50)).toBeLessThan(w(100));
    expect(V.osmosisVisualState({ inside: 100, outside: 100, perm: 100 }).arrowWidth).toBe(0);
    const t25 = V.osmosisVisualState({ inside: 100, outside: 50, perm: 25 }).changeSeconds;
    const t50 = V.osmosisVisualState({ inside: 100, outside: 50, perm: 50 }).changeSeconds;
    expect(t25).toBeCloseTo(2 * t50, 9);
    expect(V.osmosisVisualState({ inside: 50, outside: 100, perm: 0 }).changeSeconds).toBe(0);
  });

  it('solute dot counts follow each concentration and equal concentrations look equally crowded', () => {
    const full = V.osmosisVisualState({ inside: 200, outside: 200 });
    for (const c of LEVELS) {
      const v = V.osmosisVisualState({ inside: c, outside: c });
      expect(v.soluteOutside).toBe(Math.round(c / 200 * full.soluteOutside));
      expect(v.memOutside).toBe(Math.round(c / 200 * full.memOutside));
      expect(v.memInside).toBe(Math.round(c / 200 * full.memInside));
      expect(v.soluteInside).toBe(Math.round(c / 200 * full.soluteInside));
    }
    expect(V.osmosisVisualState({ inside: 50, outside: 150 }).memOutside).toBeGreaterThan(V.osmosisVisualState({ inside: 50, outside: 150 }).memInside);
    // Each side's dots depend on that side's concentration only.
    for (const type of ['animal', 'plant']) {
      const a = V.osmosisVisualState({ inside: 200, outside: 0, cellType: type }), b = V.osmosisVisualState({ inside: 0, outside: 200, cellType: type });
      expect([a.soluteOutside, a.memOutside, b.soluteInside, b.memInside]).toEqual([0, 0, 0, 0]);
      expect(Math.min(a.soluteInside, a.memInside, b.soluteOutside, b.memOutside)).toBeGreaterThan(0);
      const root = ssr({ inside: 0, outside: 200, cellType: type });
      expect(root.querySelectorAll('[data-osmo-solute="in"]').length).toBe(0);
      expect(root.querySelectorAll('[data-osmo-solute="out"]').length).toBe(b.soluteOutside);
    }
  });
});

describe('Osmosis cell geometry', () => {
  it('animal cells swell and lose central pallor, or shrink and crenate', () => {
    const g0 = V.osmosisCellGeometry('animal', 0), up = V.osmosisCellGeometry('animal', 1), dn = V.osmosisCellGeometry('animal', -1);
    expect(up.radius).toBeGreaterThan(g0.radius);
    expect(dn.radius).toBeLessThan(g0.radius);
    expect(g0.crenation).toBe(0); expect(up.crenation).toBe(0); expect(dn.crenation).toBeGreaterThan(0);
    expect(up.pallorOpacity).toBeLessThan(g0.pallorOpacity);
  });
  it('plant protoplast presses the wall when turgid and pulls away in plasmolysis; the wall stays put', () => {
    const g0 = V.osmosisCellGeometry('plant', 0), up = V.osmosisCellGeometry('plant', 1), dn = V.osmosisCellGeometry('plant', -1);
    expect(up.gap).toBeLessThanOrEqual(0.5); expect(g0.gap).toBeLessThanOrEqual(0.5);
    expect(dn.gap).toBeGreaterThan(30);
    expect(up.turgorOpacity).toBe(1); expect(g0.turgorOpacity).toBe(0); expect(dn.turgorOpacity).toBe(0);
    expect(dn.dims.wallA).toBe(g0.dims.wallA);
    expect(up.dims.wallA - g0.dims.wallA).toBeLessThanOrEqual(3);
    for (let t = 0; t < Math.PI * 2; t += 0.1) {
      for (const pose of [-1, -0.5, 0, 0.5, 1]) {
        const b = V.osmoBoundaryPoint('plant', pose, t), d = V.osmosisCellGeometry('plant', pose).dims;
        expect(Math.abs(b.x - 180)).toBeLessThanOrEqual(d.inA + 1e-6);
        expect(Math.abs(b.y - 150)).toBeLessThanOrEqual(d.inB + 1e-6);
      }
    }
  });
});

describe('Osmosis stage render (static frame and text alternative)', () => {
  it('the rendered stage, arrows, channels, dots and text alternative match the model', () => {
    const bad = [];
    const cases = sweep().filter((s, i) => i % 5 === 0).concat([{ inside: 50, outside: 100, perm: 0, cellType: 'animal' }, { inside: 100, outside: 100, perm: 0, cellType: 'plant' }, { inside: 100, outside: 100, perm: 100, cellType: 'animal' }]);
    for (const s of cases) {
      const m = C.osmosisModel(s), v = V.osmosisVisualState(s), root = ssr(s);
      const html = root.innerHTML;
      const stage = root.querySelector('[data-osmosis-stage]');
      if (!stage) { bad.push(['no stage', s]); continue; }
      if (stage.getAttribute('data-osmo-pose') !== String(v.pose)) bad.push(['pose attr', s]);
      if (Number(stage.getAttribute('data-osmo-rate-in')) - Number(stage.getAttribute('data-osmo-rate-out')) - m.flow > 1e-9) bad.push(['rate attrs', s]);
      const desc = root.querySelector('[data-osmosis-visual-desc]');
      if (!desc || desc.textContent !== v.condition || desc.getAttribute('aria-live') !== 'polite') bad.push(['live text', s]);
      const svgs = [...root.querySelectorAll('svg[role="img"]')];
      if (svgs.length < 3) bad.push(['img count', s, svgs.length]);
      for (const svg of svgs) {
        const ids = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
        const name = svg.getAttribute('aria-label') || ids.map((id) => (root.querySelector('#' + id) || {}).textContent || '').join(' ');
        if (!name.trim()) bad.push(['unnamed img', s]);
      }
      if (!root.querySelector('#osmo-cell-title').textContent.includes(v.condition)) bad.push(['cell title', s]);
      const arrows = [...root.querySelectorAll('[data-osmo-arrows] [data-osmo-arrow]')].map((n) => n.getAttribute('data-osmo-arrow'));
      const want = { inward: 'in', outward: 'out', balanced: 'both', blocked: 'blocked' }[m.direction];
      if (arrows.length !== 4 || arrows.some((a) => a !== want)) bad.push(['arrows', s, arrows]);
      if (want === 'in' || want === 'out') {
        const sw = Number(root.querySelector('[data-osmo-arrows] line').getAttribute('stroke-width'));
        if (Math.abs(sw - v.arrowWidth) > 0.01) bad.push(['arrow width', s, sw, v.arrowWidth]);
      }
      const channels = [...root.querySelectorAll('[data-osmo-channel]')].map((n) => n.getAttribute('data-osmo-channel'));
      if (channels.length !== 3 || channels.some((c) => c !== (m.perm > 0 ? 'open' : 'closed'))) bad.push(['channels', s, channels]);
      const rateArrows = root.querySelectorAll('[data-osmo-rate-arrow]').length;
      if (rateArrows !== (m.perm > 0 ? 6 : 0)) bad.push(['rate arrows', s, rateArrows]);
      if (m.perm > 0) {
        const wIn = Number(root.querySelector('[data-osmo-rate-arrow="in"] line').getAttribute('stroke-width'));
        const wOut = Number(root.querySelector('[data-osmo-rate-arrow="out"] line').getAttribute('stroke-width'));
        const maxRate = V.OSMO_EXCHANGE_BASE + 100;
        if (Math.abs(wIn - Math.max(0.8, 6 * v.rateIn / maxRate)) > 0.01 || Math.abs(wOut - Math.max(0.8, 6 * v.rateOut / maxRate)) > 0.01) bad.push(['rate arrow width', s, wIn, wOut]);
        if ((v.rateIn > v.rateOut && wIn < wOut) || (v.rateOut > v.rateIn && wOut < wIn)) bad.push(['rate arrow order', s, wIn, wOut]);
      }
      if (root.querySelectorAll('[data-osmo-solute="out"]').length !== v.soluteOutside) bad.push(['out dots', s]);
      if (root.querySelectorAll('[data-osmo-solute="in"]').length !== v.soluteInside) bad.push(['in dots', s]);
      if (root.querySelectorAll('[data-osmo-mem-solute="out"]').length !== v.memOutside) bad.push(['mem out dots', s]);
      if (root.querySelectorAll('[data-osmo-mem-solute="in"]').length !== v.memInside) bad.push(['mem in dots', s]);
      const body = root.querySelector('[data-osmo-body]').getAttribute('d');
      if (body !== V.osmosisCellGeometry(m.cellType, v.pose).body) bad.push(['static frame is not the end-state pose', s]);
      if (/NaN|undefined|\[object Object\]/.test(html)) bad.push(['raw value', s]);
    }
    expect(bad).toEqual([]);
  });
});

describe('Osmosis trial plot', () => {
  it('plots recomputed evidence, skips legacy rows, and draws the model line from osmosisModel', () => {
    const log = [
      { inside: 50, outside: 100, perm: 50, cellType: 'animal', direction: 'outward', flow: 999 },
      { i: 50, o: 100, p: 0, st: 'isotonic' }, null, 'junk',
      { inside: 100, outside: 50, perm: 25, cellType: 'plant', direction: 'inward' },
      { inside: '5', outside: 100, perm: 50, direction: 'outward' },
    ];
    const plot = V.osmosisTrialPlot(log, { inside: 0, outside: 150, perm: 40 });
    expect(plot.rows.map((r) => [r.n, r.x, r.y])).toEqual([[1, 50, C.osmosisModel(log[0]).flow], [5, -50, C.osmosisModel(log[4]).flow]]);
    expect(plot.extent).toBe(150);
    expect(plot.line[0]).toEqual({ x: -150, y: C.osmosisModel({ inside: 150, outside: 0, perm: 40 }).flow });
    expect(plot.line[1]).toEqual({ x: 150, y: C.osmosisModel({ inside: 0, outside: 150, perm: 40 }).flow });
    const root = ssr({ inside: 0, outside: 150, perm: 40, log });
    const pts = [...root.querySelectorAll('[data-osmo-plot-point]')];
    expect(pts.map((p) => [p.getAttribute('data-x'), p.getAttribute('data-y')])).toEqual([['50', String(C.osmosisModel(log[0]).flow)], ['-50', String(C.osmosisModel(log[4]).flow)]]);
    const fig = root.querySelector('[data-osmosis-trial-plot] svg[role="img"]');
    expect(fig.getAttribute('aria-label')).toContain('trial 1, animal cell, outside minus inside 50 mOsm/L, flow index -25');
    expect(root.innerHTML).not.toMatch(/NaN|undefined/);
  });
});

// ---------- animation controller (jsdom with a hand-driven frame clock) ----------
let frames, nextId, clock, mqListeners, mqState, ioInstances, saved;
function installClock({ reduce = false } = {}) {
  saved = { raf: window.requestAnimationFrame, caf: window.cancelAnimationFrame, mm: window.matchMedia, io: window.IntersectionObserver, hidden: Object.getOwnPropertyDescriptor(document, 'hidden') };
  frames = new Map(); nextId = 0; clock = 1000; mqListeners = []; mqState = { matches: reduce }; ioInstances = [];
  window.requestAnimationFrame = (fn) => { nextId += 1; frames.set(nextId, fn); return nextId; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };
  window.matchMedia = () => ({ get matches() { return mqState.matches; }, addEventListener: (t, fn) => mqListeners.push(fn), removeEventListener: (t, fn) => { mqListeners = mqListeners.filter((f) => f !== fn); } });
  window.IntersectionObserver = function (cb) { const inst = { cb, observe() {}, disconnect() { inst.dead = true; } }; ioInstances.push(inst); return inst; };
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
}
function step(seconds) {
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) {
    clock += 1000 / 60;
    const due = [...frames.values()]; frames.clear();
    due.forEach((fn) => fn(clock));
  }
}
function mount(state) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  let st = state;
  const render = () => flushSync(() => root.render(C.renderOsmosisLab(React.createElement, st, (p) => { st = { ...st, ...p }; render(); })));
  render();
  return { host, stage: () => host.querySelector('[data-osmosis-stage]'), ctl: () => host.querySelector('[data-osmosis-stage]').__osmoCtl, set(p) { st = { ...st, ...p }; render(); }, unmount() { flushSync(() => root.unmount()); host.remove(); } };
}
const settle = () => new Promise((r) => setTimeout(r, 5));
afterEach(() => {
  if (!saved) return;
  window.requestAnimationFrame = saved.raf; window.cancelAnimationFrame = saved.caf; window.matchMedia = saved.mm; window.IntersectionObserver = saved.io;
  if (saved.hidden) Object.defineProperty(document, 'hidden', saved.hidden); else delete document.hidden;
  saved = null;
});

describe('Osmosis animation controller', () => {
  it('animates crossings in both directions with the net imbalance the model gives', async () => {
    installClock();
    const app = mount({ inside: 100, outside: 50, perm: 50 });
    expect(app.stage().getAttribute('data-osmo-motion')).toBe('animated');
    step(1);
    expect(app.ctl().state().pose).toBeGreaterThan(0);
    step(19);
    const sp = app.ctl().state().spawned, v = V.osmosisVisualState({ inside: 100, outside: 50, perm: 50 });
    // 20 s of frames: spawn counts follow the two rates (difference = flow index), +/- 1 from the random phase.
    expect(Math.abs(sp.cellIn - v.rateIn * 0.075 * 20)).toBeLessThanOrEqual(2);
    expect(Math.abs(sp.cellOut - v.rateOut * 0.075 * 20)).toBeLessThanOrEqual(2);
    expect(Math.abs(sp.memIn - v.rateIn * 0.05 * 20)).toBeLessThanOrEqual(2);
    expect(Math.abs(sp.memOut - v.rateOut * 0.05 * 20)).toBeLessThanOrEqual(2);
    expect(sp.cellIn).toBeGreaterThan(sp.cellOut);
    expect(app.host.querySelectorAll('[data-osmo-crossing]').length).toBeGreaterThan(0);
    app.set({ inside: 50, outside: 100 }); await settle(); step(20);
    const sp2 = app.ctl().state().spawned;
    expect(sp2.cellOut - sp.cellOut).toBeGreaterThan(sp2.cellIn - sp.cellIn);
    app.unmount(); await settle();
  });

  it('permeability 0 shows no crossing and keeps the starting shape', async () => {
    installClock();
    const app = mount({ inside: 50, outside: 150, perm: 0, cellType: 'plant' });
    step(5);
    const s = app.ctl().state();
    expect(s.spawned).toEqual({ cellIn: 0, cellOut: 0, memIn: 0, memOut: 0 });
    expect(app.host.querySelectorAll('[data-osmo-crossing]').length).toBe(0);
    expect(s.pose).toBe(0);
    expect(app.host.querySelector('[data-osmo-body]').getAttribute('d')).toBe(V.osmosisCellGeometry('plant', 0).body);
    app.unmount(); await settle();
  });

  it('replays the change at a speed set by the flow index, then fades back and repeats', async () => {
    installClock();
    const app = mount({ inside: 100, outside: 50, perm: 50 });
    const T = V.osmosisVisualState({ inside: 100, outside: 50, perm: 50 }).changeSeconds;
    step(T / 2);
    expect(app.ctl().state().pose).toBeGreaterThan(0.4); expect(app.ctl().state().pose).toBeLessThan(0.6);
    step(T / 2 + 0.1);
    expect(app.ctl().state().phase).toBe('hold');
    step(2.2);
    expect(['fade', 'change']).toContain(app.ctl().state().phase);
    step(1);
    expect(app.ctl().state().phase).toBe('change');
    expect(app.ctl().state().pose).toBeLessThan(1);
    app.unmount(); await settle();
  });

  it('reduced motion shows the static end-state frame with no frame loop, and resumes when it is turned off', async () => {
    installClock({ reduce: true });
    const app = mount({ inside: 50, outside: 100, perm: 50 });
    expect(frames.size).toBe(0);
    expect(app.stage().getAttribute('data-osmo-motion')).toBe('static');
    expect(app.host.querySelector('[data-osmo-body]').getAttribute('d')).toBe(V.osmosisCellGeometry('animal', -1).body);
    expect(app.host.querySelectorAll('[data-osmo-crossing]').length).toBe(0);
    mqState.matches = false; mqListeners.forEach((fn) => fn());
    expect(frames.size).toBe(1);
    expect(app.stage().getAttribute('data-osmo-motion')).toBe('animated');
    mqState.matches = true; mqListeners.forEach((fn) => fn());
    expect(frames.size).toBe(0);
    app.unmount(); await settle();
  });

  it('the pause button stops the loop and shows the end-state frame', async () => {
    installClock();
    const app = mount({ inside: 100, outside: 50, perm: 50, cellType: 'plant' });
    step(0.5);
    const btn = app.host.querySelector('[data-osmosis-motion]');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    btn.click(); await settle(); step(0.1);
    expect(app.host.querySelector('[data-osmosis-motion]').getAttribute('aria-pressed')).toBe('true');
    expect(frames.size).toBe(0);
    expect(app.stage().getAttribute('data-osmo-motion')).toBe('static');
    expect(app.host.querySelector('[data-osmo-body]').getAttribute('d')).toBe(V.osmosisCellGeometry('plant', 1).body);
    app.host.querySelector('[data-osmosis-motion]').click(); await settle();
    expect(frames.size).toBe(1);
    app.unmount(); await settle();
  });

  it('pauses off-screen and in a hidden tab, and cleans up on unmount', async () => {
    installClock();
    const app = mount({ inside: 100, outside: 50, perm: 50 });
    const ctl = app.ctl();
    step(0.2);
    expect(frames.size).toBe(1);
    ioInstances[ioInstances.length - 1].cb([{ isIntersecting: false }]);
    expect(frames.size).toBe(0); expect(ctl.state().ticking).toBe(false);
    ioInstances[ioInstances.length - 1].cb([{ isIntersecting: true }]);
    expect(frames.size).toBe(1);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(1);
    app.unmount(); await settle();
    expect(ctl.state().destroyed).toBe(true);
    expect(frames.size).toBe(0);
    expect(V.liveControllers()).not.toContain(ctl);
    expect(ioInstances[ioInstances.length - 1].dead).toBe(true);
    expect(mqListeners.length).toBe(0);
  });
});
