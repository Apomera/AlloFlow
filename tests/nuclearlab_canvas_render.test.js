// Nuclear & Radiation Lab — the drawing code, actually executed.
//
// The other suites render with renderToStaticMarkup, which never invokes
// useEffect, so not one line of the five canvas renderers ran in any of them.
// That is a real blind spot: a chart that computes a NaN coordinate draws
// NOTHING on a real canvas and throws nothing either, so the tool ships an
// empty box and every existing test stays green.
//
// So mount for real with react-dom/client, hand every canvas a recording 2D
// context, and assert on the draw calls: that each chart drew, that no
// coordinate was ever non-finite, and that the furniture the reader depends on
// (axis titles, keys, callouts) was actually painted.

import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
let act;
let root;
let host;
let recordings;   // aria-label prefix -> recording
let rafCallbacks;
let nextRafId;
let originalRaf;
let originalCancelRaf;
let originalScrollIntoView;

beforeAll(() => {
  ({ act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules', 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

const NUMERIC = new Set([
  'clearRect', 'fillRect', 'strokeRect', 'moveTo', 'lineTo', 'arc', 'rect',
  'translate', 'rotate', 'fillText', 'strokeText', 'createLinearGradient',
]);

function recordingContext(canvas) {
  const rec = {
    canvas,
    calls: [],            // [method, ...args]
    texts: [],            // every string passed to fillText
    fillStyles: [],       // every colour assigned
    strokeStyles: [],
    badNumbers: [],       // any non-finite coordinate
  };
  const track = (name, args) => {
    rec.calls.push([name, ...args]);
    if (NUMERIC.has(name)) {
      args.forEach((a, i) => {
        if (typeof a === 'number' && !Number.isFinite(a)) rec.badNumbers.push(`${name} arg${i}=${a}`);
      });
    }
    if (name === 'fillText' || name === 'strokeText') rec.texts.push(String(args[0]));
  };
  const method = (name) => (...args) => { track(name, args); };
  const ctx = {
    beginPath: method('beginPath'), closePath: method('closePath'),
    fill: method('fill'), stroke: method('stroke'),
    save: method('save'), restore: method('restore'), clip: method('clip'),
    setLineDash: method('setLineDash'),
    clearRect: method('clearRect'), fillRect: method('fillRect'), strokeRect: method('strokeRect'),
    moveTo: method('moveTo'), lineTo: method('lineTo'), arc: method('arc'), rect: method('rect'),
    translate: method('translate'), rotate: method('rotate'),
    fillText: method('fillText'), strokeText: method('strokeText'),
    measureText: (t) => ({ width: String(t).length * 5 }),
    createLinearGradient: (...a) => { track('createLinearGradient', a); return { addColorStop: () => {} }; },
  };
  // Colour assignments are properties, not calls, so capture them too — the
  // contrast assertion below needs to know what ink the text was painted in.
  let _fill = '', _stroke = '';
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => _fill,
    set: (v) => { _fill = v; rec.fillStyles.push(String(v)); },
  });
  Object.defineProperty(ctx, 'strokeStyle', {
    get: () => _stroke,
    set: (v) => { _stroke = v; rec.strokeStyles.push(String(v)); },
  });
  ['lineWidth', 'font', 'textAlign', 'textBaseline', 'lineJoin', 'lineCap'].forEach((k) => {
    let v; Object.defineProperty(ctx, k, { get: () => v, set: (nv) => { v = nv; } });
  });
  rec.ctx = ctx;
  return rec;
}

function installRafHarness() {
  rafCallbacks = new Map();
  nextRafId = 1;
  originalRaf = globalThis.requestAnimationFrame;
  originalCancelRaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (cb) => {
    const id = nextRafId++;
    rafCallbacks.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafCallbacks.delete(id);
  };
}

function flushRaf(timestamp = 1000) {
  const batch = [...rafCallbacks.values()];
  rafCallbacks.clear();
  if (batch.length) act(() => batch.forEach((cb) => cb(timestamp)));
  return batch.length;
}

function flushRafFrames(count, start = 1000, step = 100) {
  let ran = 0;
  for (let i = 0; i < count; i++) ran += flushRaf(start + i * step);
  return ran;
}

function mount(state, overrides) {
  const cfg = window.StemLab._registry.nuclearLab;
  const ctx = makeCtx(Object.assign({ toolData: { _nuclearLab: state || {} } }, overrides || {}));
  const Comp = () => cfg.render(ctx);
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
  flushRaf();
  recordings = {};
  for (const cv of host.querySelectorAll('canvas')) {
    if (cv.__rec) recordings[(cv.getAttribute('aria-label') || '').slice(0, 28)] = cv.__rec;
  }
  return recordings;
}

function mountInteractive(state, overrides) {
  const cfg = window.StemLab._registry.nuclearLab;
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    const ctx = makeCtx(Object.assign({ toolData, setToolData }, overrides || {}));
    return cfg.render(ctx);
  };
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
  flushRaf();
}

beforeEach(() => {
  installRafHarness();
  resetStemLab();
  loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  host = document.createElement('div');
  document.body.appendChild(host);
  originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = function () { this.__scrolledIntoView = true; };
  // Every canvas gets its own recorder, stashed on the element.
  window.HTMLCanvasElement.prototype.getContext = function () {
    if (!this.__rec) this.__rec = recordingContext(this);
    return this.__rec.ctx;
  };
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancelRaf;
  if (originalScrollIntoView) window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  else delete window.HTMLElement.prototype.scrollIntoView;
  rafCallbacks.clear();
});

const recFor = (fragment) => {
  const key = Object.keys(recordings).find((k) => k.includes(fragment));
  expect(key, `no canvas whose label contains "${fragment}" — labels: ${Object.keys(recordings)}`).toBeTruthy();
  return recordings[key];
};

describe('every canvas actually draws', () => {
  it('mounts and paints every canvas, including the reactor panel', () => {
    const recs = mount({});
    expect(Object.keys(recs).length, 'expected every chart and the reactor panel').toBeGreaterThanOrEqual(8);
    for (const [label, r] of Object.entries(recs)) {
      expect(r.calls.length, label + ': canvas drew nothing').toBeGreaterThan(0);
      expect(r.badNumbers, `${label}: non-finite coordinates - draws an empty box silently`).toEqual([]);
    }
    expect(recFor('Reactor control panel').texts).toContain('POWER');
    expect(rafCallbacks.size, 'paused reactor left a frame polling forever').toBe(0);
  });

  it('never emits a non-finite coordinate under any state', () => {
    const STATES = [
      {}, { halves: 0 }, { halves: 10 }, { isoId: 'tc99m' }, { isoId: 'u238' },
      { bioId: 'tc99m' }, { bioId: 'pu239' }, { bioId: 'k40' },
      { cdSrc: 'none' }, { cdSrc: 'banana', cdDist: 60 }, { cdSrc: 'cs137', cdDist: 3 },
      { cdSrc: 'cs137', cdRuns: [{ g: 900, b: 250, t: 600, d: 5, s: 'cs137' }] },
      { cdSrc: 'none', cdRuns: [{ g: 3, b: 9, t: 30, d: 10, s: 'none' }] },   // negative net
      { chainPick: 0 }, { chainPick: 14 }, { bePick: 'dt' }, { bePick: 'coal' },
    ];
    for (const st of STATES) {
      const recs = mount(st);
      for (const [label, r] of Object.entries(recs)) {
        expect(r.badNumbers, `state ${JSON.stringify(st)} / ${label}`).toEqual([]);
      }
      act(() => root.unmount()); root = null;
      host.innerHTML = '';
    }
  }, 60000);

  it('parks while idle, wakes for controls, updates telemetry, and resets cleanly', () => {
    mount({});
    const reactor = recFor('Reactor control panel');
    const clears = () => reactor.calls.filter((c) => c[0] === 'clearRect').length;
    const initialClears = clears();

    expect(host.querySelector('#rx-live-state').textContent).toBe('Paused');
    expect(host.querySelector('#rx-live-power').textContent).toBe('100%');
    expect(flushRaf(1100), 'idle reactor unexpectedly queued another frame').toBe(0);

    const stopPumps = host.querySelector('button[aria-label="Stop the coolant pumps"]');
    expect(stopPumps, 'pump control missing').toBeTruthy();
    act(() => stopPumps.click());
    const restorePumps = host.querySelector('button[aria-label="Restore the coolant pumps"]');
    expect(restorePumps, 'pump label did not follow the state change').toBeTruthy();
    expect(restorePumps.getAttribute('aria-pressed')).toBe('false');
    expect(rafCallbacks.size, 'pump change did not wake the parked panel').toBeGreaterThan(0);
    flushRaf(1200);
    expect(clears()).toBeGreaterThan(initialClears);
    expect(rafCallbacks.size, 'paused panel did not park again after repainting').toBe(0);

    const start = host.querySelector('button[aria-label="Start the simulation"]');
    act(() => start.click());
    expect(flushRafFrames(6, 1300, 100)).toBeGreaterThan(0);
    expect(host.querySelector('#rx-live-state').textContent).toBe('Running');
    expect(rafCallbacks.size, 'running simulation failed to keep its loop alive').toBeGreaterThan(0);

    const reset = host.querySelector('button[aria-label="Reset the reactor to its starting condition"]');
    act(() => reset.click());
    flushRaf(2000);
    expect(host.querySelector('#rx-live-state').textContent).toBe('Paused');
    expect(host.querySelector('#rx-live-power').textContent).toBe('100%');
    expect(host.querySelector('button[aria-label="Stop the coolant pumps"]').getAttribute('aria-pressed')).toBe('true');
    expect(rafCallbacks.size, 'reset reactor did not return to its parked state').toBe(0);
  });

  it('exposes objective progress semantically and updates it without a live-region timer', () => {
    mountInteractive({});

    const objective = host.querySelector('#rx-objective-progress');
    const meter = host.querySelector('#rx-objective-meter');
    const canvas = host.querySelector('canvas[aria-label^="Reactor control panel"]');
    expect(objective, 'objective progress group is missing').toBeTruthy();
    expect(objective.getAttribute('role')).toBe('group');
    expect(objective.getAttribute('aria-labelledby')).toBe('rx-objective-heading');
    expect(objective.querySelector('[aria-live]'), 'the ticking timer must not chatter').toBeNull();
    expect(meter.tagName).toBe('PROGRESS');
    expect(meter.max).toBe(60);
    expect(meter.value).toBe(0);
    expect(meter.getAttribute('aria-valuetext')).toContain('0 of 60 continuous seconds');
    expect(canvas.getAttribute('aria-describedby').split(/\s+/))
      .toEqual(expect.arrayContaining(['rx-live-readings', 'rx-objective-progress']));

    act(() => host.querySelector('button[aria-label="Start the simulation"]').click());
    // Use the simulator's real frame cadence. Half-second jumps hit its safety
    // dt clamp and exaggerate the thermal feedback into a test-only oscillation.
    expect(flushRafFrames(180, 1017, 16.7)).toBeGreaterThan(0);
    expect(meter.value, 'objective timer did not advance with the physics loop').toBeGreaterThan(0);
    expect(meter.getAttribute('aria-valuetext')).toMatch(/[1-9]\d* of 60 continuous seconds/);

    act(() => host.querySelector('button[aria-label="Reset the reactor to its starting condition"]').click());
    flushRaf(8000);
    expect(meter.value).toBe(0);
    expect(meter.getAttribute('aria-valuetext')).toContain('0 of 60 continuous seconds');
  });

  it('starts and resets a station blackout with coolant pumps offline', () => {
    mountInteractive({});
    const scenario = (name) => [...host.querySelectorAll('button')].find((button) =>
      (button.getAttribute('aria-label') || '').startsWith('Run the scenario: ' + name));

    act(() => scenario('Station blackout').click());
    flushRaf();
    let pumps = host.querySelector('button[aria-label="Restore the coolant pumps"]');
    expect(pumps, 'blackout still begins with powered coolant pumps').toBeTruthy();
    expect(pumps.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('#rx-objective-progress').dataset.stage).toBe('blackout-scram');
    expect(host.querySelector('#rx-objective-detail').textContent).toContain('Cooling is offline');

    act(() => host.querySelector('button[aria-label="Reset the reactor to its starting condition"]').click());
    flushRaf(2000);
    pumps = host.querySelector('button[aria-label="Restore the coolant pumps"]');
    expect(pumps, 'blackout reset silently restored grid power').toBeTruthy();

    act(() => scenario('Hold at full power').click());
    flushRaf(3000);
    expect(host.querySelector('button[aria-label="Stop the coolant pumps"]'),
      'ordinary operation did not restore its pumps-on starting state').toBeTruthy();
  });
});

describe('route-mounted canvas lifecycle', () => {
  it('focuses the new first section and redraws its chart after the route commit', () => {
    mountInteractive({ nkPath: 'safe', nkOpen: true });
    expect(host.querySelector('#nksec-halflife')).toBeNull();

    const works = [...host.querySelectorAll('button')].find((button) =>
      (button.getAttribute('aria-label') || '').startsWith('Follow the route: How does any of it work?'));
    expect(works).toBeTruthy();
    act(() => works.click());
    flushRaf();

    const destination = host.querySelector('#nksec-halflife');
    expect(destination).toBeTruthy();
    expect(document.activeElement).toBe(destination);
    expect(destination.__scrolledIntoView).toBe(true);
    expect(host.querySelector('#nk-index-body')).toBeNull();

    const decay = [...host.querySelectorAll('canvas')]
      .find((canvas) => (canvas.getAttribute('aria-label') || '').startsWith('Decay curve.'));
    expect(decay).toBeTruthy();
    expect(decay.__rec.calls.length).toBeGreaterThan(0);
    expect(decay.__rec.badNumbers).toEqual([]);
  });
});

describe('the chain map is the chain', () => {
  it('draws one node per step and one arrow per decay', () => {
    mount({});
    const r = recFor('uranium-238 chain');
    // 15 nuclides. Each node paints a background halo ring plus the node
    // itself, and the stable end-point paints a third arc to hollow it out.
    const arcs = r.calls.filter((c) => c[0] === 'arc');
    expect(arcs.length, 'too few arcs for 15 nodes').toBeGreaterThanOrEqual(31);
    // 14 arrowheads, each a closePath'd triangle.
    expect(r.calls.filter((c) => c[0] === 'closePath').length).toBe(14);
    expect(r.texts).toContain('Neutrons (N)');
    expect(r.texts).toContain('Protons (Z)');
    expect(r.texts.some((t) => t.includes('U-238'))).toBe(true);
    expect(r.texts.some((t) => t.includes('Rn-222') && t.includes('gas'))).toBe(true);
    expect(r.texts.some((t) => t.includes('Pb-206'))).toBe(true);
    // The key names the two moves that generate the shape.
    expect(r.texts.some((t) => t.includes('−2 protons'))).toBe(true);
    expect(r.texts.some((t) => t.includes('+1 proton'))).toBe(true);
  });

  it('highlights the nucleus whose row is open, and only when one is', () => {
    mount({});
    const plain = recFor('uranium-238 chain').calls.filter((c) => c[0] === 'arc').length;
    act(() => root.unmount()); root = null; host.innerHTML = '';
    mount({ chainPick: 6 });
    const picked = recFor('uranium-238 chain').calls.filter((c) => c[0] === 'arc').length;
    expect(picked, 'selecting a row drew no extra ring').toBe(plain + 1);
  });
});

describe('chart furniture', () => {
  it('names both axes on every chart that has them', () => {
    mount({ cdSrc: 'cs137' });
    expect(recFor('Decay curve').texts).toContain('Half-lives elapsed');
    expect(recFor('Decay curve').texts).toContain('Nuclei remaining');
    expect(recFor('Net count rate').texts).toContain('Distance from the source, cm');
    expect(recFor('Net count rate').texts).toContain('Net counts per second');
    expect(recFor('How much').texts).toContain('Left in the body');
  });

  it('keys the two-line body-burden chart instead of relying on the caption', () => {
    mount({ bioId: 'cs137' });
    const t = recFor('How much').texts;
    expect(t).toContain('Decay alone');
    expect(t).toContain('Decay + excretion');
  });

  it('labels the binding-energy peak and both routes to it', () => {
    mount({});
    const r = recFor('Binding energy');
    expect(r.texts.some((x) => x.includes('Ni-62') && x.includes('summit')), 'peak callout missing').toBe(true);
    expect(r.texts.some((x) => x.includes('FUSION')), 'fusion side unlabelled').toBe(true);
    expect(r.texts.some((x) => x.includes('FISSION')), 'fission side unlabelled').toBe(true);
    // Neither may be phrased as uphill/downhill: the curve climbs toward the
    // peak while the energy released is the system falling, so either word is
    // wrong about one of the two.
    expect(r.texts.join(' ')).not.toMatch(/uphill|downhill/i);
    // Two shaded halves, split at the peak.
    expect(r.calls.filter((c) => c[0] === 'fillRect').length).toBeGreaterThanOrEqual(3);
  });
});

describe('canvas ink follows the theme', () => {
  // The DOM contrast suite cannot see inside a canvas: these colours are
  // arguments to fillText, not CSS. Same rule, measured the same way.
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (rgb) => {
    const a = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const ratio = (f, b) => { const [hi, lo] = [lum(f), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const parse = (v) => {
    let m = /^#([0-9a-fA-F]{6})$/.exec(String(v).trim());
    if (m) return [...hex('#' + m[1]), 1];
    m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s]+([\d.]+))?\s*\)$/.exec(String(v).trim());
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const over = (f, b) => [0, 1, 2].map((i) => Math.round(f[i] * f[3] + b[i] * (1 - f[3])));

  for (const [theme, overrides, bg] of [
    ['dark', undefined, hex('#0b1120')],
    ['light', { theme: 'light' }, hex('#f8fafc')],
  ]) {
    it(`${theme}: every opaque ink used on a chart clears 4.5:1`, () => {
      const recs = mount({ cdSrc: 'cs137', bioId: 'cs137' }, overrides);
      const bad = [];
      for (const [label, r] of Object.entries(recs)) {
        const canvasBg = label.includes('Reactor control panel') ? hex('#0b1120') : bg;
        for (const v of new Set(r.fillStyles)) {
          const c = parse(v);
          // Only fully-opaque inks: the translucent ones are fills, plates and
          // gradients, which carry no text.
          if (!c || c[3] < 0.9) continue;
          // The chart background itself is painted with fillStyle too.
          if (ratio(c.slice(0, 3), canvasBg) < 1.2) continue;
          const rr = ratio(over(c, canvasBg), canvasBg);
          if (rr < 4.5) bad.push(`${label}: ${v} = ${rr.toFixed(2)}:1`);
        }
      }
      expect([...new Set(bad)], `${theme} canvas ink below AA:\n  ` + [...new Set(bad)].join('\n  ')).toEqual([]);
    });
  }
});
