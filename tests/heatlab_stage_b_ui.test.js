import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Stage B features mounted and driven through their real controls: the lab
// notebook (record, filter, sort, plot, delete / clear with inline confirm,
// export), the two-block equilibrium simulator, the particle zoom lens, the
// thermal camera and the touch test.
const FILE = 'stem_lab/stem_tool_heatlab.js';
const SRC = fs.readFileSync(FILE, 'utf8');
function table(startMark) {
  const a = SRC.indexOf(startMark);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}
const MATERIALS = table('var MATERIALS = [');
const mat = (id) => MATERIALS.find((m) => m.id === id);

let cfg, host, root, previousAct, reduceMotion, rafCalls;

beforeEach(() => {
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  reduceMotion = false;
  rafCalls = 0;
  resetStemLab();
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this,
      measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => { rafCalls++; return 0; });
  window.matchMedia = (q) => ({
    matches: reduceMotion && /reduce/.test(q), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  });
  cfg = loadTool(FILE, 'heatLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  vi.restoreAllMocks();
});

function mount(initial, overrides) {
  const box = { data: null, xp: [], announced: [] };
  function Panel() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData,
      awardXP: (id, pts, why) => box.xp.push([id, pts, why]),
      announceToSR: (msg) => box.announced.push(msg),
    }, overrides || {})));
  }
  React.act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Panel));
  });
  box.d = () => (box.data && box.data._heatLab) || {};
  return box;
}
const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const buttons = (scope) => [...(scope || host).querySelectorAll('button')];
const byLabel = (label, scope) => buttons(scope).find((b) => b.getAttribute('aria-label') === label || b.textContent.trim() === label);
const sec = (id) => host.querySelector('#htsec-' + id);
function setRange(input, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  React.act(() => { set.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
function choose(select, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  React.act(() => { set.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
const recordIn = (id) => buttons(sec(id)).find((b) => /^Record this .* trial in your lab notebook$/.test(b.getAttribute('aria-label') || ''));

describe('Record trial in every interactive section', () => {
  const EXPECT = {
    insulation: ['mug', ['material', 'thickness_mm', 'T60_C', 'tau_min', 'above65']],
    wall: ['wall', ['layers', 'R_total_m2KW', 'U_Wm2K', 'loss_W', 'meetsTarget']],
    mixing: ['mixing', ['sub1', 'm1_kg', 'T1_C', 'Tf_C', 'dT1_K', 'dT2_K']],
    equilibrium: ['equilibrium', ['mat1', 'G_WK', 'T1_C', 'T2_C', 'q12_J', 'dS_total_JK']],
    heatingcurve: ['heating-curve', ['energy_kJ', 'phase', 'T_C', 'phaseFrac']],
    radiation: ['radiation', ['surface_C', 'emitted_W', 'net_W', 'peak_um']],
    expansion: ['expansion', ['material', 'alpha_perK', 'length_m', 'dT_K', 'dL_mm']],
    heatpumps: ['heat-pump', ['outdoor_C', 'indoor_C', 'idealCOP', 'teachingCOP']],
  };

  it('writes one plain-primitive row per press, with model values', () => {
    const box = mount({});
    Object.entries(EXPECT).forEach(([section, [kind, cols]], i) => {
      const btn = recordIn(section);
      expect(btn, section).toBeTruthy();
      click(btn);
      const log = box.d().log;
      expect(log, section).toHaveLength(i + 1);
      const row = log[log.length - 1];
      expect(row.kind).toBe(kind);
      cols.forEach((c) => expect(row, section + '.' + c).toHaveProperty(c));
      Object.values(row).forEach((v) => expect(v === null || ['string', 'number', 'boolean'].includes(typeof v), section).toBe(true));
      expect(typeof row.at).toBe('number');
    });
    const rows = box.d().log;
    const mug = rows.find((r) => r.kind === 'mug');
    expect(mug.T60_C).toBeCloseTo(cfg.models.coolingTemperature(mat('copper'), 1, 60), 10);
    const mix = rows.find((r) => r.kind === 'mixing');
    expect(mix.Tf_C).toBeCloseTo(cfg.models.mixTemperature({ c: 4186 }, 0.5, 20, { c: 449 }, 0.5, 90), 10);
    // the race keeps its own button and the touch test needs a touch first
    expect(buttons(sec('conduction')).some((b) => b.textContent.includes('Record trial'))).toBe(true);
    expect(recordIn('touch').disabled).toBe(true);
  });

  it('keeps the newest 200 rows', () => {
    const log = Array.from({ length: 200 }, (_, i) => ({ kind: 'radiation', at: i + 1, surface_C: i }));
    const box = mount({ _heatLab: { log } });
    click(recordIn('expansion'));
    expect(box.d().log).toHaveLength(200);
    expect(box.d().log[0].surface_C).toBe(1);
    expect(box.d().log[199].kind).toBe('expansion');
  });
});

describe('Lab notebook panel', () => {
  const LOG = [
    { kind: 'mug', at: 1000, material: 'wood', thickness_mm: 10, T60_C: 60.6 },
    { kind: 'radiation', at: 2000, surface_C: 33, emitted_W: 878.7 },
    { kind: 'mug', at: 3000, material: 'fibre', thickness_mm: 5, T60_C: 66.1 },
    { kind: 'mug', at: 4000, material: 'aerogel', thickness_mm: 2, T60_C: 65.2 },
  ];

  it('filters by experiment and sorts a column both ways', () => {
    const box = mount({ _heatLab: { log: LOG } });
    const nb = sec('notebook');
    expect(nb.querySelectorAll('tbody tr')).toHaveLength(4);
    click(byLabel('Show only Insulated mug trials, 3 rows', nb));
    expect(box.d().nbKind).toBe('mug');
    expect(nb.querySelectorAll('tbody tr')).toHaveLength(3);
    click(byLabel('Sort by T60_C', nb));
    const col = () => [...nb.querySelectorAll('tbody tr')].map((tr) => tr.children[4].textContent);
    expect(col()).toEqual(['60.6', '65.2', '66.1']);
    expect(nb.querySelector('th[aria-sort="ascending"]')).toBeTruthy();
    click(byLabel('Sort by T60_C', nb));
    expect(col()).toEqual(['66.1', '65.2', '60.6']);
    expect(nb.querySelector('th[aria-sort="descending"]')).toBeTruthy();
  });

  it('plots one column against another with drawChart', () => {
    mount({ _heatLab: { log: LOG, nbKind: 'mug' } });
    const nb = sec('notebook');
    choose(nb.querySelector('#ht-nb-x'), 'thickness_mm');
    choose(nb.querySelector('#ht-nb-y'), 'T60_C');
    const canvas = nb.querySelector('[data-ht-nb-plot] canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('aria-label')).toBe('T60_C against thickness_mm for 3 trials. thickness_mm runs from 2 to 10; T60_C from 60.6 to 66.1.');
    expect(typeof canvas._htRedraw).toBe('function');
  });

  it('deletes a row and clears only after an inline confirm, never window.confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const box = mount({ _heatLab: { log: LOG } });
    const nb = sec('notebook');
    click(byLabel('Delete row 2', nb));
    expect(box.d().log).toHaveLength(4);                      // nothing yet
    click(byLabel('Keep it', nb));
    expect(box.d().log).toHaveLength(4);
    click(byLabel('Delete row 2', nb));
    click(byLabel('Yes, delete', nb));
    expect(box.d().log.map((r) => r.at)).toEqual([1000, 3000, 4000]);
    click(byLabel('Show only Insulated mug trials, 3 rows', nb));
    click(buttons(nb).find((b) => b.textContent.includes('Clear these rows')));
    expect(box.d().log).toHaveLength(3);
    expect(nb.textContent).toContain('Delete these 3 rows? This cannot be undone.');
    click(byLabel('Yes, clear them', nb));
    expect(box.d().log).toHaveLength(0);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(SRC).not.toMatch(/window\.confirm|[^.\w]confirm\(/);
  });

  it('exports CSV through StemLab.writeClipboard, a download and ctx.saveSnapshot', async () => {
    const copied = [];
    window.StemLab.writeClipboard = (text) => { copied.push(text); return Promise.resolve(); };
    const snaps = [];
    const blobs = [];
    URL.createObjectURL = vi.fn((b) => { blobs.push(b); return 'blob:heat'; });
    URL.revokeObjectURL = vi.fn();
    const clicks = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mount({ _heatLab: { log: LOG, nbKind: 'mug' } }, { saveSnapshot: (tool, label, data) => snaps.push([tool, label, data]) });
    const nb = sec('notebook');
    click(byLabel('📋 Copy CSV', nb));
    await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(copied).toHaveLength(1);
    expect(copied[0].split('\r\n')[0]).toBe('kind,recorded_at,material,thickness_mm,T60_C');
    expect(copied[0].split('\r\n').filter(Boolean)).toHaveLength(4);       // header + 3 mug rows
    expect(nb.textContent).toContain('Copied 3 rows as CSV.');
    click(byLabel('⬇ Download CSV', nb));
    expect(clicks).toHaveBeenCalledTimes(1);
    const text = await blobs[0].text();
    expect(text.replace(/^\uFEFF/, '')).toBe(copied[0]);
    click(byLabel('📸 Save snapshot', nb));
    expect(snaps).toHaveLength(1);
    expect(snaps[0][0]).toBe('heatLab');
    expect(snaps[0][2].rows).toHaveLength(3);
    expect(JSON.parse(JSON.stringify(snaps[0][2]))).toEqual(snaps[0][2]);   // plain data only
  });

  it('shows an empty state and no snapshot button without the host service', () => {
    mount({});
    const nb = sec('notebook');
    expect(nb.querySelector('[data-ht-nb-empty]')).toBeTruthy();
    expect(byLabel('📸 Save snapshot', nb)).toBeFalsy();
  });
});

describe('Two blocks reach equilibrium', () => {
  it('balances the ledger and settles at the mixing temperature in a closed box', () => {
    const box = mount({});
    const eq = sec('equilibrium');
    expect(eq.querySelector('[data-ht-poe="eqstop"]')).toBeTruthy();
    const ledger = eq.querySelector('[data-ht-eq-ledger]').textContent;
    const C1 = 1 * 385, C2 = 1 * 897, Tf = (C1 * 90 + C2 * 10) / (C1 + C2);
    // at the end of the run (6 time constants) both blocks are within 0.2 C of Tf
    const temps = [...ledger.matchAll(/(\d+\.\d\d) °C/g)].map((m) => Number(m[1]));
    expect(Math.abs(temps[0] - Tf)).toBeLessThan(0.2);
    expect(Math.abs(temps[1] - Tf)).toBeLessThan(0.2);
    expect(ledger).toMatch(/difference -?\d\.\de-\d+ J|difference 0 J/);
    expect(ledger).not.toContain('Heat leaked to the room');
    // move the time cursor to the start: no heat has moved yet
    setRange(eq.querySelector('#heat-eq-time'), 0);
    expect(box.d().eqCursor).toBe(0);
    expect(eq.querySelector('[data-ht-eq-ledger]').textContent).toContain('90.00 °C');
  });

  it('with the leak on, the room entropy appears and the total stays non-negative', () => {
    const box = mount({});
    const eq = sec('equilibrium');
    click(buttons(eq).find((b) => b.textContent.includes('Leak to the 20 °C room')));
    expect(box.d().eqLeak).toBe(true);
    const text = eq.querySelector('[data-ht-eq-ledger]').textContent;
    expect(text).toContain('Heat leaked to the room');
    const total = Number(text.match(/Total entropy change(-?\d+\.\d+) J\/K/)[1]);
    expect(total).toBeGreaterThan(0);
    const run = cfg.models.twoBodyEquilibrium({ m1: 1, c1: 385, T1: 90, m2: 1, c2: 897, T2: 10, G: 5, leak1: 0.5, leak2: 0.5, roomC: 20, tEnd: 0, steps: 1 });
    const tEnd = Math.max(6 * run.tauS, 3 * run.leakTauS);
    expect(total).toBeCloseTo(run.at(tEnd).dStotal, 2);
  });

  it('links to the entropy counting section', () => {
    mount({});
    const link = buttons(sec('equilibrium')).find((b) => b.textContent.includes('Count the arrangements'));
    const target = sec('entropy');
    const focus = vi.spyOn(target, 'focus');
    click(link);
    expect(focus).toHaveBeenCalled();
  });
});

describe('Particle zoom lens', () => {
  const lensDesc = (key) => host.querySelector('#ht-lens-' + key + '-desc').textContent;

  it('opens from each linked section and reports speed from sqrt(3RT/M)', () => {
    const errors = vi.spyOn(console, 'error');
    const box = mount({});
    ['conduction', 'insulation', 'mixing', 'heatingcurve'].forEach((id) => {
      click(buttons(sec(id)).find((b) => b.textContent.includes('Zoom in on the particles')));
    });
    expect(box.d().lens).toEqual({ race: true, mug: true, mix: true, curve: true });
    expect(host.querySelectorAll('[data-ht-lens]')).toHaveLength(4);
    // the tea at minute 0 is 90 C
    const v90 = Math.round(Math.sqrt(3 * 8.314462618 * 363.15 / 0.018015));
    expect(lensDesc('mug')).toContain(v90 + ' m/s');
    expect(lensDesc('mug')).toContain('1.11 times');
    // race lens defaults to the middle of the copper bar at 20 C
    const v20cu = Math.round(Math.sqrt(3 * 8.314462618 * 293.15 / 0.063546));
    expect(lensDesc('race')).toContain(v20cu + ' m/s');
    expect(lensDesc('race')).toContain('vibrate about fixed places');
    expect(host.querySelector('#ht-lens-race-desc').getAttribute('aria-live')).toBeNull();   // live race: no chatter
    expect(host.querySelector('#ht-lens-mug-desc').getAttribute('aria-live')).toBe('polite');
    // the lens catches draw errors to keep the page alive; none may occur
    expect(errors.mock.calls.filter((c) => /Heat lab/.test(String(c[0])))).toEqual([]);
  });

  it('on the boiling plateau the speed holds while the bonds-broken count rises', () => {
    const speedAt = (kJ) => {
      if (root) { React.act(() => root.unmount()); root = null; }
      mount({ _heatLab: { energyIn: kJ, lens: { curve: true } } });
      const text = lensDesc('curve');
      return { speed: Number(text.match(/stays at ([\d,]+) m\/s/)[1].replace(/,/g, '')), freed: text.match(/Instead ([\d.]+ × 10\S+) of/)[1], text };
    };
    const a = speedAt(1200), b = speedAt(2600);
    expect(a.speed).toBe(b.speed);
    expect(a.speed).toBe(Math.round(Math.sqrt(3 * 8.314462618 * 373.15 / 0.018015)));
    expect(a.text).toContain('Water boiling');
    const n = (s) => Number(s.replace(' × 10', 'e').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)));
    expect(n(b.freed)).toBeGreaterThan(n(a.freed));
    // fraction through boiling at 1200 kJ: (1200 - 794.4) / 2260
    const frac = (1200 - 794.4) / 2260;
    expect(a.text).toContain(Math.round(frac * 100) + '% of the way through');
    expect(a.text).toContain(Math.round(frac * 2260) + ' kJ so far');
  });

  it('mixing: the two temperatures converge on Tf as progress reaches 100%', () => {
    const box = mount({ _heatLab: { lens: { mix: true } } });
    const read = () => [...lensDesc('mix').matchAll(/at ([\d.]+) °C/g)].map((m) => Number(m[1]));
    const [w0, i0] = read();
    expect(w0).toBe(20);
    expect(i0).toBe(90);
    setRange(host.querySelector('#heat-mix-lens'), 100);
    expect(box.d().mixLensP).toBe(100);
    const Tf = cfg.models.mixTemperature({ c: 4186 }, 0.5, 20, { c: 449 }, 0.5, 90);
    const [w1, i1] = read();
    expect(Math.abs(w1 - Tf)).toBeLessThan(0.3);
    expect(Math.abs(i1 - Tf)).toBeLessThan(0.3);
    // water and iron have different particle masses: it is the energy that evens out
    expect(lensDesc('mix')).toContain('average kinetic energy');
  });

  it('animates solid, liquid, gas and two-region lenses without errors, and stops when detached', () => {
    const errors = vi.spyOn(console, 'error');
    const queue = [];
    window.requestAnimationFrame.mockImplementation((cb) => { queue.push(cb); return queue.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    // boiling (liquid + freed gas), copper bar (solid), water + iron (left / right)
    mount({ _heatLab: { energyIn: 2000, lens: { curve: true, race: true, mix: true } } });
    let ts = 0;
    for (let i = 0; i < 30 && queue.length; i++) {
      const batch = queue.splice(0);
      ts += 16;
      batch.forEach((cb) => cb(ts));
    }
    expect(ts).toBeGreaterThan(100);
    expect(errors.mock.calls.filter((c) => /Heat lab/.test(String(c[0])))).toEqual([]);
    React.act(() => root.unmount());
    root = null;
    const left = queue.splice(0);
    left.forEach((cb) => cb(ts + 16));
    expect(queue.filter(Boolean).length).toBe(0);
  });

  it('under reduced motion it paints a still frame and never requests animation frames', () => {
    reduceMotion = true;
    const errors = vi.spyOn(console, 'error');
    const getCtx = window.HTMLCanvasElement.prototype.getContext;
    mount({ _heatLab: { lens: { mug: true }, mode: 'convection' } });
    const before = rafCalls;
    const canvas = host.querySelector('[data-ht-lens="ht-lens-mug"] canvas');
    expect(getCtx.mock.instances.includes(canvas)).toBe(true);
    setRange(host.querySelector('#heat-mug-min'), 30);
    expect(rafCalls).toBe(before);
    expect(lensDesc('mug')).toContain('after 30 min');
    expect(errors.mock.calls.filter((c) => /Heat lab/.test(String(c[0])))).toEqual([]);
  });
});

describe('Thermal camera and touch test', () => {
  it('repaints the bar in the iron-bow or greyscale palette with a movable crosshair', () => {
    const box = mount({});
    const cond = sec('conduction');
    const canvas = cond.querySelector('canvas');
    expect(canvas.dataset.ir).toBe('off');
    click(buttons(cond).find((b) => b.textContent.includes('Thermal camera')));
    expect(box.d().irOn).toBe(true);
    expect(canvas.dataset.ir).toBe('iron');
    click(buttons(cond).find((b) => b.textContent === 'Greyscale palette'));
    expect(canvas.dataset.ir).toBe('grey');
    const cross = cond.querySelector('#heat-ir-cross-bar');
    expect(cross).toBeTruthy();
    setRange(cross, 4.5);
    expect(box.d().irCrossCm).toBe(4.5);
    expect(canvas.dataset.irCross).toBe('4.5');
    expect(cond.querySelector('[data-ht-ir-cross]').textContent).toContain('4.5 cm');
  });

  it('shows the mug and the wall on camera, with readouts from the models', () => {
    mount({ _heatLab: { irOn: true, insMatId: 'fibre', thickness: 10, mugMin: 0 } });
    const ins = sec('insulation');
    expect(ins.querySelector('[data-ht-ir-view="mug"] canvas')).toBeTruthy();
    const surf = cfg.models.mugSurfaceC(mat('fibre'), 10, 90);
    expect(ins.querySelector('#ht-mug-ir-read').textContent).toContain('outer surface of the wrap is ' + surf.toFixed(1) + ' °C');
    const wall = sec('wall');
    expect(wall.querySelector('[data-ht-ir-view="wall"] canvas')).toBeTruthy();
    const p = cfg.models.wallProfile([0.13, 0.18, 0.11, 0.06], 21, 2);
    expect(wall.querySelector('#ht-wall-ir-read').textContent).toContain('outside surface at ' + p.outsideSurfaceC.toFixed(1) + ' °C');
    setRange(wall.querySelector('#heat-wall-cross'), 2);
    expect(wall.querySelector('#ht-wall-ir-read').textContent).toContain('Crosshair in inside air: 21 °C');
  });

  it('touch test: same 20 C on camera, different contact temperature and heat drain', () => {
    const box = mount({});
    const touch = sec('touch');
    expect(touch.querySelector('[data-ht-poe="touch"]')).toBeTruthy();
    expect(touch.querySelector('canvas').getAttribute('aria-label')).toContain('both reading 20 °C');
    click(buttons(touch).find((b) => b.textContent.includes('Touch the copper')));
    expect(box.d().touchSide).toBe('a');
    let text = touch.querySelector('[data-ht-touch-result]').textContent;
    expect(text).toContain(cfg.models.touchTest(mat('copper')).contactC.toFixed(1) + ' °C');
    click(buttons(touch).find((b) => b.textContent.includes('Touch the wood')));
    text = touch.querySelector('[data-ht-touch-result]').textContent;
    expect(text).toContain('30.5 °C');
    const ratio = cfg.models.touchTest(mat('copper')).fingertipW / cfg.models.touchTest(mat('wood')).fingertipW;
    expect(text).toContain('copper drains ' + ratio.toFixed(1) + ' times as much heat');
    expect(text).toContain('Your nerves sense heat leaving');
    // any material from the table can go on the bench
    click(byLabel('Make the right block aerogel', touch));
    expect(box.d().touchB).toBe('aerogel');
    click(buttons(touch).find((b) => b.textContent.includes('Touch the aerogel')));
    click(recordIn('touch'));
    const row = box.d().log[0];
    expect(row.kind).toBe('touch');
    expect(row.material).toBe('aerogel');
    expect(row.contact_C).toBeCloseTo(cfg.models.touchTest(mat('aerogel')).contactC, 12);
  });
});

describe('index, numbering and SSR safety', () => {
  it('renders every new panel without undefined, NaN or object text', () => {
    const html = renderTool('heatLab', {
      _heatLab: {
        irOn: true, lens: { race: true, mug: true, mix: true, curve: true }, raceOn: true, eqLeak: true,
        touchSide: 'a', touchTried: ['copper'], nbKind: 'mug', energyIn: 300,
        log: [{ kind: 'mug', at: 1, thickness_mm: 4, T60_C: 50 }, { kind: 'mug', at: 2, thickness_mm: 8, T60_C: 57 }],
      },
    });
    expect(html).not.toMatch(/undefined|NaN|\[object Object\]|\{[a-z0-9]+\}/);
    ['touch', 'equilibrium', 'notebook'].forEach((id) => expect(html).toContain('id="htsec-' + id + '"'));
    expect((html.match(/data-ht-lens=/g) || []).length).toBe(4);
    expect(html).toContain('broken free');                  // 300 kJ is on the melting plateau
  });
});
