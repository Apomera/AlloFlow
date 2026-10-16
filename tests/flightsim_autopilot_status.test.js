import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
const allModes = () => ({ hdg: true, alt: true, spd: true, tgtHdg: 370, tgtAlt: 12345.4, tgtSpd: 123.4 });
const noModes = () => ({ hdg: false, alt: false, spd: false });
const fontSize = font => Number(/([\d.]+)px/.exec(font || '')?.[1]) || 10;
const measure = (text, font = 'bold 9px monospace') => Array.from(String(text)).length * fontSize(font) * 0.6;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const textBox = item => ({ x: item.x - (item.align === 'center' ? measure(item.text, item.font) / 2 : item.align === 'right' ? measure(item.text, item.font) : 0),
  y: item.y - fontSize(item.font), w: measure(item.text, item.font), h: fontSize(item.font) });
let FS, tool, host, reactRoot, latest, patchSaved, frameCallback, errors, wallTime, physicsSnapshot;
let texts, rectangles, order;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  delete window.THREE;
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  wallTime = 1000; texts = []; rectangles = []; order = [];
});

afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null; patchSaved = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const key of Reflect.ownKeys(FS.Physics)) if (!Object.hasOwn(physicsSnapshot, key)) delete FS.Physics[key];
  Object.defineProperties(FS.Physics, physicsSnapshot);
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.useRealTimers();
});

describe('autopilot status fitting', () => {
  it('formats valid targets without changing saved input', () => {
    const saved = Object.freeze(allModes());
    expect(FS.getFlightAutopilotStatus(saved, measure, 1000)).toBe('AP: HDG 10°  ALT ' + Math.round(saved.tgtAlt).toLocaleString() + '  SPD 123kt');
    expect(saved).toEqual(allModes());
  });

  it.each([[-1, 359], [361, 1], [719.6, 0]])('wraps a captured heading of %s to %s degrees', (heading, expected) => {
    expect(FS.getFlightAutopilotStatus({ hdg: true, tgtHdg: heading }, measure, 1000)).toBe('AP: HDG ' + expected + '°');
  });

  it.each(['targets', 'altitude', 'modes', 'indicator', 'hidden'])('retains the most useful fitting %s status', variant => {
    const altitude = Math.round(allModes().tgtAlt).toLocaleString();
    const candidates = ['AP: HDG 10°  ALT ' + altitude + '  SPD 123kt', 'AP: HDG  ALT ' + altitude + '  SPD', 'AP: HDG ALT SPD', 'AP'];
    const index = ['targets', 'altitude', 'modes', 'indicator', 'hidden'].indexOf(variant);
    const width = index === 4 ? measure('AP') - 0.01 : measure(candidates[index]);
    const result = FS.getFlightAutopilotStatus(Object.freeze(allModes()), measure, width);
    expect(result).toBe(index === 4 ? null : candidates[index]);
    if (result) expect(measure(result)).toBeLessThanOrEqual(width);
  });

  it('shows active mode names safely when saved targets are invalid', () => {
    const saved = Object.freeze({ hdg: true, alt: true, spd: true, tgtHdg: NaN, tgtAlt: null, tgtSpd: Infinity });
    expect(FS.getFlightAutopilotStatus(saved, measure, 1000)).toBe('AP: HDG  ALT  SPD');
    expect(Number.isNaN(saved.tgtHdg)).toBe(true);
    expect(saved.tgtAlt).toBeNull();
    expect(saved.tgtSpd).toBe(Infinity);
  });

  it('does not show inactive saved targets', () => {
    expect(FS.getFlightAutopilotStatus({ ...allModes(), ...noModes() }, measure, 1000)).toBeNull();
    expect(FS.getFlightAutopilotStatus(null, measure, 1000)).toBeNull();
  });

  it.each([undefined, null, 0, -1, NaN, Infinity])('declines invalid available width %s', width => {
    expect(FS.getFlightAutopilotStatus(allModes(), measure, width)).toBeNull();
  });

  it('declines a missing text measurement function', () => {
    expect(FS.getFlightAutopilotStatus(allModes(), null, 1000)).toBeNull();
  });
});

async function mountMenu(width, height, chase, savedAutopilot = noModes()) {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const savedStyles = [];
  const styleKeys = ['font', 'textAlign', 'textBaseline', 'fillStyle', 'strokeStyle', 'globalAlpha', 'lineWidth'];
  const context = new Proxy({
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1,
    save() { savedStyles.push(Object.fromEntries(styleKeys.map(key => [key, context[key]]))); },
    restore() { if (savedStyles.length) Object.assign(context, savedStyles.pop()); },
    measureText(value) { return { width: measure(value, context.font) }; },
    fillText(value, x, y) {
      const item = { text: String(value), x, y, font: context.font, align: context.textAlign, baseline: context.textBaseline, fill: context.fillStyle };
      texts.push(item); order.push({ kind: 'text', item });
    },
    roundRect(x, y, w, h) {
      const item = { x, y, w, h, fill: context.fillStyle, kind: 'roundRect' };
      rectangles.push(item); order.push({ kind: 'rect', item });
    },
    fillRect(x, y, w, h) {
      const item = { x, y, w, h, fill: context.fillStyle, kind: 'fillRect' };
      rectangles.push(item); order.push({ kind: 'rect', item });
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host);
  reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase, autopilot: savedAutopilot,
      railCollapsed: true, menuSections: { sprints: true }, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    patchSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  // Hold dynamics so assertions observe only the actual input/state/status path.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return async mode => {
    const launch = mode === 'sprint' ? host.querySelector('#skyschool-sec-sprints button:not([aria-expanded])')
      : host.querySelector('button[aria-label="Free Flight from Portland, ME"]');
    expect(launch).toBeTruthy();
    await act(async () => launch.click());
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
      Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
    }
    const dock = host.querySelector('[data-flightsim-hud-dock]');
    for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
      Object.defineProperty(dock, key, { configurable: true, value });
    }
    Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  };
}

function airborne() {
  Object.assign(hooks().flightRef.current, { speed: 110 / 0.5924838, altitude: 5000, fieldElev: 76, vsi: 0,
    heading: 90, lat: 43.646, lon: -70.309, onGround: false, aoa: 4, stalling: false, lowAirspeed: false });
  Object.assign(hooks().controlsRef.current, { throttle: 0.6, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0 });
}
async function paintFrame() {
  texts.length = 0; rectangles.length = 0; order.length = 0; wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
const footer = height => texts.filter(item => (item.text === 'AP' || item.text.startsWith('AP: ')) && item.y === height - 8);

describe('actual RAF autopilot footer', () => {
  it.each([[320, 488, false], [320, 488, true], [1280, 640, false], [1280, 640, true]])(
    'fits and remains visible at %i by %i, chase%s', async (width, height, chase) => {
      const launch = await mountMenu(width, height, chase); await launch('free'); airborne();
      await act(async () => patchSaved({ autopilot: allModes() }));
      await paintFrame();
      expect(footer(height)).toHaveLength(1);
      const label = footer(height)[0], bounds = textBox(label);
      const plate = rectangles.find(rect => rect.kind === 'roundRect' && rect.fill === 'rgba(6,78,59,0.92)');
      expect(plate).toBeTruthy();
      expect(plate.y).toBe(height - 21); expect(plate.h).toBe(18);
      expect(plate.x).toBeGreaterThanOrEqual(12);
      expect(plate.x + plate.w).toBeLessThanOrEqual(width - 12);
      expect(bounds.x).toBeGreaterThanOrEqual(plate.x + 7);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(plate.x + plate.w - 7);
      expect(bounds.y).toBeGreaterThanOrEqual(plate.y);
      expect(bounds.y + bounds.h).toBeLessThanOrEqual(plate.y + plate.h);
      const layout = FS.getFlightInstrumentLayout(width, height, chase);
      for (const box of [layout.speed, layout.altitude, { x: 8, y: 62, w: 215, h: 64 }]) expect(overlaps(plate, box)).toBe(false);
      if (layout.compact && chase) {
        expect(plate.x).toBeGreaterThanOrEqual(80);
        expect(plate.x + plate.w).toBeLessThanOrEqual(width - 80);
      }
      // The status must be painted after the full-canvas vignette and panel.
      const lastFullCanvas = order.map((entry, index) => ({ ...entry, index })).filter(entry => entry.kind === 'rect'
        && entry.item.x === 0 && entry.item.y === 0 && entry.item.w === width && entry.item.h === height).at(-1);
      expect(lastFullCanvas).toBeTruthy();
      expect(order.findIndex(entry => entry.item === label)).toBeGreaterThan(lastFullCanvas.index);
      expect(label.text).not.toMatch(/B=|manual input|disengage/);
    });

  it('paints newly engaged B assistance in the same frame that captures its targets', async () => {
    const launch = await mountMenu(320, 488, true); await launch('free'); airborne();
    hooks().keysRef.current.b = true;
    await paintFrame();
    expect(latest.autopilot).toMatchObject({ hdg: true, alt: true, spd: true, tgtHdg: 90, tgtAlt: 5000, tgtSpd: 102 });
    expect(footer(488)).toHaveLength(1);
    expect(footer(488)[0].text).toContain('ALT ' + (5000).toLocaleString());
  });

  it('removes assistance status in the same frame that manual steering disengages it', async () => {
    const launch = await mountMenu(320, 488, true); await launch('free'); airborne();
    await act(async () => patchSaved({ autopilot: allModes() }));
    await paintFrame(); expect(footer(488)).toHaveLength(1);
    hooks().keysRef.current.w = true;
    await paintFrame();
    expect(latest.autopilot).toEqual(noModes());
    expect(footer(488)).toEqual([]);
  });

  it('renders malformed persisted targets without throwing or painting invalid numbers', async () => {
    const launch = await mountMenu(320, 488, false); await launch('free'); airborne();
    await act(async () => patchSaved({ autopilot: { hdg: true, alt: true, spd: true, tgtHdg: NaN, tgtAlt: null, tgtSpd: Infinity } }));
    await paintFrame();
    expect(footer(488)).toHaveLength(1);
    expect(footer(488)[0].text).toBe('AP: HDG  ALT  SPD');
    expect(footer(488)[0].text).not.toMatch(/NaN|Infinity|null|undefined/);
  });
});

describe('new flight assistance reset', () => {
  it.each(['free', 'sprint'])('starts a fresh %s session without stale saved targets', async mode => {
    const launch = await mountMenu(320, 488, true, allModes());
    await launch(mode);
    expect(latest.autopilot).toEqual(noModes());
    if (mode === 'free') expect(hooks().flightRef.current.onGround).toBe(true);
    await paintFrame();
    expect(footer(488)).toEqual([]);
    expect(latest.autopilot).toEqual(noModes());
  });
});
