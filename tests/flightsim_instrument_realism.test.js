import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, mountedRoot, commands, context, frameCallback, wallTime, errors, load, latest;
const api = () => window.__RR_TEST_EXPORTS__.flightSim;
const hooks = () => window.__testHooks.flightSim;
const texts = () => commands.filter(command => command.method === 'fillText').map(command => String(command.args[0]));
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  delete window.THREE;
  commands = [];
  wallTime = 1000;
  load = 1;
  context = new Proxy({
    measureText(text) { return { width: String(text).length * (parseFloat(this.font?.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 10) * 0.6 }; },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  }, {
    get(target, property) {
      return property in target ? target[property] : (...args) => commands.push({ method: property, args,
        fill: context.fillStyle, stroke: context.strokeStyle, font: context.font, align: context.textAlign });
    },
    set(target, property, value) { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div');
  document.body.appendChild(host);
  mountedRoot = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  if (mountedRoot) await act(async () => mountedRoot.unmount());
  mountedRoot = null;
  host?.remove(); host = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

async function mount({ aircraft = 'cessna172', chase = false, route = false, dockBottom = 144 } = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft, thirdPerson: chase,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api().ACHIEVEMENTS.map(achievement => [achievement.id, true])),
    } });
    latest = data.flightSim;
    return window.StemLab._registry.flightSim.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => mountedRoot.render(React.createElement(App)));
  const launch = host.querySelector(route ? 'button[aria-label="File Route: file the flight plan and depart"]'
    : 'button[aria-label="Free Flight from Portland, ME"]');
  expect(launch).toBeTruthy();
  await act(async () => launch.click());
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  Object.defineProperty(dock, 'offsetTop', { configurable: true, value: 62 });
  Object.defineProperty(dock, 'offsetHeight', { configurable: true, value: dockBottom - 62 });
  vi.spyOn(api().Physics, 'step').mockImplementation(state => ({ ...state, forces: forces() }));
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  expect(frameCallback).toBeTypeOf('function');
}
const forces = () => ({ normal: load * api().Physics.WEIGHT, lift: load * api().Physics.WEIGHT,
  weight: api().Physics.WEIGHT, thrust: load * api().Physics.WEIGHT, drag: 0 });
const cruise = { lat: 40, lon: -40, altitude: 6000, fieldElev: 0, speed: 120, vsi: 0,
  heading: 90, onGround: false, stalling: false, lowAirspeed: false, hitCeiling: false };
const controls = { throttle: 0.5, pitch: 0, bank: 0, flaps: 0, brake: 0 };
async function paint({ state = cruise, ctrl = controls, width = 800, height = 720, elapsedMs = 100 } = {}) {
  Object.assign(hooks().flightRef.current, state, { forces: forces() });
  Object.assign(hooks().controlsRef.current, ctrl);
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  }
  commands.length = 0;
  wallTime += elapsedMs;
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
  return api().getFlightInstrumentLayout(width, height, latest.thirdPerson);
}
const redTape = tape => commands.filter(command => command.method === 'fillRect' && command.fill === 'rgba(239,68,68,0.3)'
  && command.args[0] === tape.x && command.args[2] === tape.w);
const tapeValue = tape => commands.find(command => command.method === 'fillText' && command.args[1] === tape.x + tape.w / 2
  && command.args[2] === tape.y + tape.h / 2 + 4)?.args[0];
function loadValue(layout) {
  expect(texts()).toContain('LOAD G');
  const value = commands.find(command => command.method === 'fillText' && command.args[1] === layout.gForce.x + 20
    && command.args[2] === layout.gForce.y + 16);
  expect(value).toBeTruthy();
  return Number(value.args[0]);
}

describe('Aircraft-specific painted instruments', () => {
  it.each(['cessna172', 'drone'])('speaks the same primary speed shown in %s', async aircraft => {
    await mount({ aircraft });
    const rotor = aircraft === 'drone';
    Object.assign(hooks().getWeatherRef().current, { wind: rotor ? 10 : 0, windDir: 270 });
    const altitude = rotor ? 300 : 10000;
    const speed = rotor ? 0 : 200;
    await paint({ state: { ...cruise, altitude, speed, heading: 0 } });
    hooks().keysRef.current.i = true;
    wallTime += 100;
    await act(async () => frameCallback());
    // SkySchool announces through its own polite live region after a short
    // clear-and-repopulate delay, so verify the accessible output users receive.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 70)); });
    const spoken = document.getElementById('skyschool-a11y-live')?.textContent;
    expect(spoken).toMatch(/^Altitude /);
    const expected = rotor ? 10 : Math.round(speed * 0.5924838 * Math.sqrt(Math.pow(1 - 0.0000068756 * altitude, 4.2561)));
    expect(spoken).toContain('Speed ' + expected + ' knots.');
    if (!rotor) expect(expected).not.toBe(Math.round(speed * 0.5924838));
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(['rescue_heli', 'drone'])('shows ground speed without a runway rotation cue or fixed-wing stall band in %s', async aircraft => {
    await mount({ aircraft });
    Object.assign(hooks().getWeatherRef().current, { wind: 10, windDir: 270 });
    const layout = await paint({ state: { ...cruise, altitude: 300, speed: 0 }, width: 320, height: 763 });
    expect(texts()).toContain('GS');
    expect(texts()).not.toContain('IAS');
    expect(tapeValue(layout.speed)).toBe(10);
    expect(texts()).not.toContain('Vr');
    expect(redTape(layout.speed)).toHaveLength(0);
  });

  it('keeps IAS, the low-speed band, and Vr on a fixed-wing runway roll', async () => {
    await mount();
    const airport = api().WAYPOINTS[0];
    const layout = await paint({ state: { ...cruise, lat: airport.lat, lon: airport.lon,
      altitude: airport.alt, fieldElev: airport.alt, speed: 90, onGround: true } });
    expect(texts()).toContain('IAS');
    expect(texts()).toContain('Vr');
    expect(redTape(layout.speed).length).toBeGreaterThan(0);
  });

  it('keeps the fixed-wing low-speed band after liftoff while removing Vr', async () => {
    await mount();
    const layout = await paint({ state: { ...cruise, speed: 100 } });
    expect(texts()).toContain('IAS');
    expect(texts()).not.toContain('Vr');
    expect(redTape(layout.speed).length).toBeGreaterThan(0);
  });

  it('reads modeled load rather than fabricating G from aircraft attitude, and shows ground support as one G', async () => {
    await mount();
    load = 2;
    let layout;
    for (let frame = 0; frame < 9; frame++) layout = await paint();
    expect(loadValue(layout)).toBe(2);
    layout = await paint({ ctrl: { ...controls, pitch: 30, bank: 45 } });
    expect(loadValue(layout)).toBe(2);
    const airport = api().WAYPOINTS[0];
    for (let frame = 0; frame < 9; frame++) layout = await paint({ state: { ...cruise, lat: airport.lat, lon: airport.lon,
      altitude: airport.alt, fieldElev: airport.alt, speed: 0, onGround: true }, ctrl: { ...controls, pitch: 30, bank: 45 } });
    expect(loadValue(layout)).toBe(1);
  });

  it('holds the displayed load and simulation clock through paused resize repaints', async () => {
    await mount();
    await paint();
    load = 2;
    const before = loadValue(await paint());
    expect(before).toBeGreaterThan(1);
    expect(before).toBeLessThan(2);
    await act(async () => host.querySelector('button[aria-label="Pause flight"]').click());
    const heldTime = hooks().timeRef.current;
    const steps = api().Physics.step.mock.calls.length;
    load = 3;
    for (const width of [799, 798, 797]) {
      const layout = await paint({ width, ctrl: { ...controls, pitch: 30, bank: 45 } });
      expect(loadValue(layout)).toBe(before);
      expect(hooks().timeRef.current).toBe(heldTime);
      expect(api().Physics.step.mock.calls).toHaveLength(steps);
    }
  });

  it.each(['rescue_heli', 'drone'])('paints a nose-down attitude when %s uses forward cyclic', async aircraft => {
    await mount({ aircraft });
    const layout = await paint({ state: { ...cruise, altitude: 300 }, ctrl: { ...controls, pitch: 10 } });
    const index = commands.findIndex(command => command.method === 'translate' && command.args[0] === layout.horizon.x
      && command.args[1] === layout.horizon.y);
    expect(index).toBeGreaterThanOrEqual(0);
    const end = commands.findIndex((command, position) => position > index && command.method === 'restore');
    const ground = commands.slice(index, end).find(command => command.method === 'fillRect' && command.fill === '#65a30d');
    expect(ground).toBeTruthy();
    // Released cyclic recenters during the actual frame; compare the drawn
    // attitude with that live command, keeping the physical sign independent.
    const livePitch = hooks().controlsRef.current.pitch;
    expect(livePitch).toBeGreaterThan(0);
    expect(livePitch).toBeLessThan(10);
    expect(ground.args[1]).toBeCloseTo(-2 * livePitch, 10);
    expect(api().getAircraftPitchDeg(hooks().controlsRef.current, api().AIRCRAFT.find(item => item.id === aircraft))).toBe(-livePitch);
  });
});

describe('Compact filed-route strip leaves the flying view clear', () => {
  it.each([[320, 763, false], [320, 763, true], [800, 720, false], [800, 720, true]])(
    'paints filed-route data outside the primary instruments at %ix%i, chase %s', async (width, height, chase) => {
      await mount({ route: true, chase });
      const layout = await paint({ width, height });
      const nav = layout.navigation;
      const painted = commands.find(command => command.method === 'roundRect' && command.fill === 'rgba(2,6,23,0.82)'
        && command.args[0] === nav.x && command.args[1] === nav.y);
      expect(painted).toBeTruthy();
      expect(painted.args.slice(0, 4)).toEqual([nav.x, nav.y, nav.w, nav.h]);
      expect(texts()).toContain('NAV JFK');
      expect(texts().some(text => /^GS \d+\s?kt$/.test(text))).toBe(true);
      expect(texts().some(text => /^ETE (\d+m|\d+ min|—)$/.test(text))).toBe(true);
      const protectedAreas = [layout.atis, layout.speed, layout.altitude,
        { x: layout.horizon.x - layout.horizon.r, y: layout.horizon.y - layout.horizon.r, w: layout.horizon.r * 2, h: layout.horizon.r * 2 },
        { x: layout.vsi.x - layout.vsi.r, y: layout.vsi.y - layout.vsi.r, w: layout.vsi.r * 2, h: layout.vsi.r * 2 },
        { x: layout.speed.x, y: layout.base - 179, w: 170, h: 17 },
      ];
      for (const area of protectedAreas) expect(overlaps(nav, area)).toBe(false);
      expect(nav.x).toBeGreaterThanOrEqual(0);
      expect(nav.y).toBeGreaterThanOrEqual(0);
      expect(nav.x + nav.w).toBeLessThanOrEqual(width);
      expect(nav.y + nav.h).toBeLessThanOrEqual(height);
      if (layout.compact) expect(nav.x + nav.w).toBeLessThanOrEqual(width / 2 - 18);
      expect(texts().some(text => /Turn [LR]|APPROACHING JFK/.test(text))).toBe(false);
      const label = commands.find(command => command.method === 'fillText' && command.args[0] === 'NAV JFK');
      const row = commands.filter(command => command.method === 'fillText' && command.args[2] === label.args[2]);
      const headerLeft = row.find(command => command.args[1] === nav.x + 8);
      const headerRight = row.find(command => command.args[1] === nav.x + nav.w - 8);
      context.font = headerLeft.font;
      const leftEnd = headerLeft.args[1] + context.measureText(headerLeft.args[0]).width;
      context.font = headerRight.font;
      const rightStart = headerRight.args[1] - context.measureText(headerRight.args[0]).width;
      expect(leftEnd + 4).toBeLessThanOrEqual(rightStart);
    });

  it('yields navigation space to the command dock on a short cockpit', async () => {
    await mount({ route: true, dockBottom: 182 });
    await paint({ width: 800, height: 500 });
    expect(texts()).not.toContain('NAV JFK');
    const layout = api().getFlightInstrumentLayout(800, 500, false);
    expect(commands.some(command => command.method === 'roundRect' && command.args[0] === layout.speed.x
      && command.args[1] === layout.speed.y && command.args[2] === layout.speed.w)).toBe(true);
  });

  it('yields the route strip to a stall recovery warning', async () => {
    await mount({ route: true });
    await paint({ width: 320, height: 763 });
    expect(texts()).toContain('NAV JFK');
    await paint({ width: 320, height: 763, state: { ...cruise, stalling: true }, ctrl: { ...controls, pitch: 20 } });
    expect(texts()).not.toContain('NAV JFK');
    expect(texts()).toContain('⚠️ STALL — REDUCE ANGLE OF ATTACK');
  });
});


describe('Low-altitude height readout remains clear on a phone', () => {
  it('paints AGL above the altitude tape and below the VSI without covering either', async () => {
    await mount({ aircraft: 'rescue_heli' });
    const layout = await paint({ width: 320, height: 763, state: { ...cruise, altitude: 300, speed: 0 } });
    const label = commands.find(command => command.method === 'fillText' && /^AGL \d+ ft$/.test(String(command.args[0])));
    expect(label).toBeTruthy();
    const background = commands.find(command => command.method === 'roundRect' && command.fill === 'rgba(2,6,23,0.8)'
      && command.args[0] + command.args[2] / 2 === label.args[1] && command.args[1] + 9 === label.args[2]);
    expect(background).toBeTruthy();
    const [x, y, w, h] = background.args;
    const badge = { x, y, w, h };
    const vsi = { x: layout.vsi.x - layout.vsi.r, y: layout.vsi.y - layout.vsi.r,
      w: layout.vsi.r * 2, h: layout.vsi.r * 2 };
    expect(y + h).toBeLessThan(layout.altitude.y);
    expect(overlaps(badge, layout.altitude)).toBe(false);
    expect(overlaps(badge, vsi)).toBe(false);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(320);
  });
});

describe('Outside air temperature follows the standard atmosphere', () => {
  it.each([
    // ICAO standard atmosphere, with the icing band FAA AC 91-74B gives:
    // most airframe icing forms between about 0 and -20 C in visible moisture.
    [2000, '11°C OAT', 'Normal'],
    [6000, '3°C OAT', 'Normal'],
    // Ice can still form in cloud a degree or two above freezing.
    [7000, '1°C OAT', 'Icing in cloud'],
    [8000, '-1°C OAT', 'Icing in cloud'],
    [20000, '-25°C OAT', 'Very cold'],
    // Isothermal above the tropopause: -56.5 C, not 15 - 2 C per 1,000 ft (-75 C).
    [45000, '-56°C OAT', 'Very cold'],
  ])('reads %i ft as %s (%s)', async (altitude, reading, advice) => {
    await mount();
    await paint({ state: { ...cruise, altitude } });
    const shown = texts();
    expect(shown).toContain(reading);
    const row = shown.indexOf(reading);
    expect(shown[row + 1]).toBe(advice);
  });
});
