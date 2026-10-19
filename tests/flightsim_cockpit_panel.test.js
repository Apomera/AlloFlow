// SkySchool cockpit panel: four analog backup dials sit on the panel shelf,
// clear of the glass instruments, the yoke and the autopilot status, and their
// needles follow the aircraft.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// Each test mounts the full menu or flight deck; leave headroom on a busy machine.
vi.setConfig({ testTimeout: 20000 });
let api, host, root, commands, frameCallback, wallTime, latest;
const hooks = () => window.__testHooks.flightSim;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  delete window.THREE;
  commands = []; wallTime = 1000;
  const context = new Proxy({
    measureText(text) { return { width: String(text).length * 6 }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, {
    get(target, property) { return property in target ? target[property] : (...args) => commands.push({ method: property, args, stroke: target.strokeStyle }); },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const boxOf = item => item.r != null ? { x: item.x - item.r, y: item.y - item.r, w: item.r * 2, h: item.r * 2 } : item;

describe('panel dial layout', () => {
  it.each([[480, 640], [800, 600], [1280, 720], [1920, 1080]])('fits four dials on the %ix%i shelf clear of everything else', (W, H) => {
    const dials = api.getFlightPanelDialLayout(W, H);
    expect(dials.map(d => d.id)).toEqual(['asi', 'alt', 'hdg', 'turn']);
    const layout = api.getFlightInstrumentLayout(W, H, false);
    for (const dial of dials) {
      expect(dial.y - dial.r - 2).toBeGreaterThanOrEqual(H - 58);
      expect(dial.y + dial.r + 10).toBeLessThanOrEqual(H);
      expect(dial.x - dial.r - 2).toBeGreaterThanOrEqual(0);
      expect(dial.x + dial.r + 2).toBeLessThanOrEqual(W);
      // The yoke (38 px each side) and a 200 px autopilot pill share the centre.
      expect(Math.abs(dial.x - W / 2) - dial.r).toBeGreaterThanOrEqual(100);
      for (const [name, item] of Object.entries(layout)) {
        if (!item || typeof item !== 'object' || !Number.isFinite(item.x)) continue;
        expect(overlaps(boxOf(dial), boxOf(item)), name).toBe(false);
      }
    }
    for (let i = 0; i < dials.length; i++) for (let j = i + 1; j < dials.length; j++) {
      expect(Math.hypot(dials[i].x - dials[j].x, dials[i].y - dials[j].y)).toBeGreaterThan(dials[i].r + dials[j].r + 4);
    }
  });

  it('leaves narrow phones without the dial row', () => {
    expect(api.getFlightPanelDialLayout(420, 800)).toEqual([]);
  });
});

async function mount(chase) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase, railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    latest = data.flightSim;
    return window.StemLab._registry.flightSim.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0, normal: api.Physics.WEIGHT } }));
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
}
async function paint(speedKias) {
  const factor = Math.sqrt(api.Physics.airDensity(3000) / api.Physics.RHO_SL);
  Object.assign(hooks().flightRef.current, { lat: 43.7, lon: -70.3, altitude: 3000, fieldElev: 0,
    speed: speedKias / 0.5924838 / factor, vsi: 0, heading: 90, onGround: false, stalling: false, lowAirspeed: false });
  Object.assign(hooks().controlsRef.current, { throttle: 0.6, pitch: 0, bank: 0, flaps: 0, brake: 0 });
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
  }
  commands.length = 0; wallTime += 100;
  await act(async () => frameCallback());
}
// The ASI needle starts at the dial centre and is r - 3 long.
function asiNeedleAngle() {
  const asi = api.getFlightPanelDialLayout(1280, 720)[0];
  for (let i = 0; i < commands.length - 1; i++) {
    const a = commands[i], b = commands[i + 1];
    if (a.method === 'moveTo' && b.method === 'lineTo' && a.args[0] === asi.x && a.args[1] === asi.y
        && Math.abs(Math.hypot(b.args[0] - asi.x, b.args[1] - asi.y) - (asi.r - 3)) < 1e-6) {
      return Math.atan2(b.args[0] - asi.x, asi.y - b.args[1]);
    }
  }
  return null;
}

describe('panel dials in flight', () => {
  it('paints the four labelled dials in the cockpit and not in chase view', async () => {
    await mount(false);
    await paint(100);
    const texts = commands.filter(c => c.method === 'fillText').map(c => String(c.args[0]));
    for (const label of ['ASI', 'ALT', 'HDG', 'TURN']) expect(texts).toContain(label);
    await act(async () => root.unmount()); root = ReactDOMClient.createRoot(host);
    await mount(true);
    await paint(100);
    expect(commands.filter(c => c.method === 'fillText').map(c => String(c.args[0]))).not.toContain('TURN');
  });

  it('swings the airspeed needle clockwise as the aircraft speeds up', async () => {
    await mount(false);
    const vne = api.AIRCRAFT.find(a => a.id === 'cessna172').vneKias;
    const expected = kts => -0.75 * Math.PI + Math.min(1, kts / (vne * 1.15)) * 1.5 * Math.PI;
    await paint(70);
    const slow = asiNeedleAngle();
    await paint(140);
    const fast = asiNeedleAngle();
    expect(slow).toBeCloseTo(expected(70), 2);
    expect(fast).toBeCloseTo(expected(140), 2);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('next discovery on the navigation box', () => {
  it('shows the next place to discover during free flight from Portland', async () => {
    await mount(false);
    const place = { lat: 43.646, lon: -70.309, altitude: 3000, fieldElev: 0, speed: 180, vsi: 0, heading: 0, onGround: false, stalling: false, lowAirspeed: false };
    for (let frame = 0; frame < 2; frame++) {
      Object.assign(hooks().flightRef.current, place);
      for (const canvas of host.querySelectorAll('canvas')) {
        Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
        Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
      }
      commands.length = 0; wallTime += 100;
      await act(async () => frameCallback());
    }
    const texts = commands.filter(c => c.method === 'fillText').map(c => String(c.args[0]));
    expect(texts).toContain('Next discovery');
    expect(texts).toContain('Sebago Lake');
    expect(texts.some(t => /^CRS 31\d°$/.test(t))).toBe(true);
  });
});

// The pitch ladder is the only thing stroked in this exact colour.
const ladderStrokes = () => commands.filter(c => c.method === 'stroke' && c.stroke === 'rgba(230,240,255,0.55)').length;

describe('chase view keeps the aircraft clear', () => {
  it('draws the pitch ladder in the cockpit but not across the airframe in chase view', async () => {
    await mount(false);
    await paint(110);
    expect(ladderStrokes()).toBeGreaterThan(4);
    await act(async () => root.unmount()); root = ReactDOMClient.createRoot(host);
    await mount(true);
    await paint(110);
    expect(ladderStrokes()).toBe(0);
    // The nose marker (amber) still shows where the aircraft points.
    expect(commands.some(c => c.method === 'stroke' && c.stroke === '#fbbf24')).toBe(true);
  });
});

describe('discoveries stay out of challenges', () => {
  it('does not offer a discovery goal while a challenge owns the flight', async () => {
    function App() {
      const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, railCollapsed: true, menuSections: { challenges: true },
        takeoffTutorialDismissed: true, landingTutorialDismissed: true,
        earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
      latest = data.flightSim;
      return window.StemLab._registry.flightSim.render(makeCtx({ toolData: data, setToolData: setData,
        update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
        updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
    }
    await act(async () => root.render(React.createElement(App)));
    await act(async () => host.querySelector('[data-flight-challenge-id="first_flight"]').click());
    expect(latest.flightChallenge && latest.flightChallenge.id).toBe('first_flight');
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0, normal: api.Physics.WEIGHT } }));
    for (let frame = 0; frame < 2; frame++) {
      Object.assign(hooks().flightRef.current, { lat: 43.646, lon: -70.309, altitude: 3000, fieldElev: 0, speed: 180, vsi: 0, heading: 0, onGround: false, stalling: false, lowAirspeed: false });
      for (const canvas of host.querySelectorAll('canvas')) {
        Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 1280 });
        Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: 720 });
      }
      commands.length = 0; wallTime += 100;
      await act(async () => frameCallback());
    }
    expect(commands.filter(c => c.method === 'fillText').map(c => String(c.args[0]))).not.toContain('Next discovery');
  });
});
