import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20000 });
let FS, tool, root, host, latest, frameCallback, wallTime, paints, tips, errors, seen, width, height;
const hooks = () => window.__testHooks.flightSim;
const canvas = () => host.querySelector('canvas[role="application"]');
const readable = () => host.querySelector('[data-flight-next-discovery]');
const plan = () => hooks().getFlightPlanRef().current;
const next = () => FS.getNextFlightDiscovery(hooks().flightRef.current, seen);
const label = () => paints.find(item => item.font === 'bold 8px monospace' && item.color === 'rgba(34,211,238,0.9)' && item.y === 25);
const edge = () => paints.find(item => item.font === 'bold 10px monospace' && item.color === 'rgba(34,211,238,0.8)' && item.y === 34 && /[◀▶]/.test(item.text));
const heading = value => ((value % 360) + 360) % 360;

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  window.SkySchoolCityServices = { enabled: false };
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  paints = []; tips = []; seen = {}; width = 800; height = 500; wallTime = 1000;
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const gfx = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    fillText(text, x, y) { paints.push({ text: String(text), x, y, font: this.font, color: this.fillStyle }); },
    moveTo(x, y) { tips.push({ x, y, color: this.fillStyle }); },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {},
    set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  // Keep real discovery/navigation and canvas rendering. Freeze integration so
  // each marker can be checked against its stated position and heading.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, thrust: 0, drag: 0 } }));
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null; frameCallback = null;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__; delete window.SkySchoolCityServices;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(seed = {}) {
  seen = { ...seed.geoDiscovered };
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', railCollapsed: false,
      planDep: 'kpwm', planDest: 'kjfk', cityOnline: false, menuSections: { plan: true, challenges: true },
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function frame() {
  expect(frameCallback).toBeTypeOf('function');
  const state = hooks().flightRef.current;
  FS.GEO_PLACES.forEach(place => { if (FS.haversineNm(state.lat, state.lon, place.lat, place.lon) < 15) seen[place.name] = true; });
  wallTime += 100; paints.length = 0; tips.length = 0;
  await act(async () => { frameCallback(); vi.advanceTimersByTime(100); });
  expect(errors).not.toHaveBeenCalled();
}
async function readyFlight() {
  expect(latest.view).toBe('flying');
  Object.defineProperties(canvas(), { clientWidth: { configurable: true, value: width }, clientHeight: { configurable: true, value: height } });
  Object.assign(hooks().getWeatherRef().current, { type: 'clear', wind: 0, turbulence: 0 });
  await frame();
}
async function depart() {
  await click(host.querySelector('[aria-label="Free Flight from Portland, ME"]')); await readyFlight();
}
function pinAir(patch = {}) {
  Object.assign(hooks().flightRef.current, { altitude: 5000, onGround: false, speed: 100 / .5924838,
    vsi: 0, stalling: false, lowAirspeed: false, aoa: 3, ...patch });
  Object.assign(hooks().controlsRef.current, { throttle: .6, pitch: 0, bank: 0 });
}
async function info() {
  await act(async () => {
    canvas().focus();
    for (const type of ['keydown', 'keyup']) canvas().dispatchEvent(new KeyboardEvent(type, { key: 'i', bubbles: true, cancelable: true }));
  });
  await frame(); return document.getElementById('skyschool-a11y-live').textContent;
}
function expectMarker(targetBearing, targetLabel) {
  const tape = FS.getFlightInstrumentLayout(width, height, latest.thirdPerson).heading;
  const difference = ((targetBearing - hooks().flightRef.current.heading + 540) % 360) - 180;
  const x = tape.x + tape.w / 2 + difference * 3;
  if (x > tape.x && x < tape.x + tape.w) {
    expect(label()).toMatchObject({ text: targetLabel, y: 25 });
    const halfText = label().text.length * 3; // The fixture's measured six pixels per character.
    expect(label().x - halfText).toBeGreaterThanOrEqual(tape.x + 4 - 1e-7);
    expect(label().x + halfText).toBeLessThanOrEqual(tape.x + tape.w - 4 + 1e-7);
    if (x - halfText < tape.x + 4) expect(label().x - halfText).toBeCloseTo(tape.x + 4, 7);
    else if (x + halfText > tape.x + tape.w - 4) expect(label().x + halfText).toBeCloseTo(tape.x + tape.w - 4, 7);
    else expect(label().x).toBeCloseTo(x, 7);
    expect(tips.some(item => item.color === '#22d3ee' && Math.abs(item.x - x) < 1e-7 && item.y === 34)).toBe(true);
    expect(edge()).toBeUndefined();
  } else {
    expect(edge()).toMatchObject({ text: x < tape.x ? '◀' : '▶', y: 34 });
    expect(edge().x).toBeCloseTo(x < tape.x ? tape.x + 2 : tape.x + tape.w - 2, 7);
    expect(label()).toBeUndefined();
  }
  expect([label(), edge()].filter(Boolean).every(item => Number.isFinite(item.x) && Number.isFinite(item.y))).toBe(true);
}

describe('discovery course marker consistency', () => {
  it.each([[800, 500], [390, 640]])('uses the native PWM departure discovery in the rendered heading marker, NAV and I at %sx%s', async (w, h) => {
    width = w; height = h; await mount(); await depart();
    const discovery = next(); expect(discovery.place.name).toBe('Sebago Lake');
    expectMarker(discovery.bearingDeg, discovery.place.name);
    // The old airport fallback placed PWM straight ahead instead of pointing
    // toward the next discovery shown by the navigation computer.
    expect(label()?.text).not.toBe('PWM');
    pinAir({ heading: heading(discovery.bearingDeg - 6) }); await frame();
    expectMarker(discovery.bearingDeg, discovery.place.name);
    expect(readable().textContent).toContain(discovery.place.name);
    expect(paints.some(item => item.text === discovery.place.name && /^bold (9|11)px monospace$/.test(item.font))).toBe(true);
    expect(await info()).toContain(readable().textContent); expectMarker(discovery.bearingDeg, discovery.place.name);
  });

  it('advances the rendered course and label after a real geography discovery', async () => {
    await mount(); await depart(); const first = next();
    pinAir({ lat: first.place.lat, lon: first.place.lon }); await frame();
    const following = next(); expect(seen[first.place.name]).toBe(true);
    expect(following).not.toBeNull(); expect(following.place.name).not.toBe(first.place.name);
    hooks().flightRef.current.heading = heading(following.bearingDeg + 5); await frame();
    expectMarker(following.bearingDeg, following.place.name);
    expect(readable().textContent).toContain(following.place.name); expect(readable().textContent).not.toContain(first.place.name);
    expect(await info()).toContain(readable().textContent); expectMarker(following.bearingDeg, following.place.name);
  });

  it('fits a real long discovery name on a phone while preserving the full readable and spoken name', async () => {
    width = 390; height = 640;
    const placeName = 'Pemaquid Point Light';
    await mount({ geoDiscovered: { ...Object.fromEntries(FS.GEO_PLACES.map(place => [place.name, true])), [placeName]: false } });
    await depart(); const discovery = next(); expect(discovery.place.name).toBe(placeName);
    pinAir({ heading: discovery.bearingDeg }); await frame();
    expect(label().text).toMatch(/^Pemaquid/); expect(label().text.endsWith('…')).toBe(true);
    expect(label().text.length).toBeLessThan(placeName.length);
    expectMarker(discovery.bearingDeg, label().text);
    expect(readable().textContent).toContain(placeName); expect(await info()).toContain(placeName);
    expectMarker(discovery.bearingDeg, label().text);
  });

  it.each([['AP', -1], ['AP', 1], ['airport', -1], ['airport', 1]])('keeps the %s label inside phone tape edge %s without moving the target triangle', async (kind, side) => {
    width = 390; height = 640;
    await mount({ geoDiscovered: Object.fromEntries(FS.GEO_PLACES.map(place => [place.name, true])) }); await depart();
    pinAir(); await frame();
    let course, name;
    if (kind === 'AP') {
      await click(host.querySelector('[data-flight-assistance]')); course = latest.autopilot.tgtHdg; name = 'AP';
    } else {
      const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm'), state = hooks().flightRef.current;
      course = FS.bearing(state.lat, state.lon, airport.lat, airport.lon); name = airport.code;
    }
    const tape = FS.getFlightInstrumentLayout(width, height, latest.thirdPerson).heading;
    hooks().flightRef.current.heading = heading(course - side * (tape.w / 2 - 2) / 3); await frame();
    expectMarker(course, name);
    const triangleX = tape.x + (side < 0 ? 2 : tape.w - 2);
    expect(Math.abs(label().x - triangleX)).toBeGreaterThan(1);
    expect(tips.some(item => item.color === '#22d3ee' && item.y === 34 && Math.abs(item.x - triangleX) < 1e-7)).toBe(true);
  });

  it('keeps an explicitly captured heading ahead of discovery guidance', async () => {
    await mount(); await depart(); const discovery = next();
    pinAir({ heading: heading(discovery.bearingDeg + 12) }); await frame();
    await click(host.querySelector('[data-flight-assistance]')); await frame();
    expect(latest.autopilot.hdg).toBe(true); expectMarker(latest.autopilot.tgtHdg, 'AP');
    expect(readable().textContent).toContain(discovery.place.name);
  });

  it.each(['airport', 'city'])('keeps a newly filed native %s route ahead of discovery guidance', async kind => {
    await mount({ cityDestination: { name: 'London', lat: 51.5, lon: -.12 } });
    if (kind === 'airport') await click(host.querySelector('[aria-label="File Route: file the flight plan and depart"]'));
    else {
      const planner = host.querySelector('[data-flightsim-city-planner]'); await click(planner.querySelector('summary'));
      await click([...planner.querySelectorAll('button')].find(node => node.textContent.trim() === 'Depart toward city'));
    }
    await readyFlight(); const destination = plan().destination;
    const course = FS.bearing(hooks().flightRef.current.lat, hooks().flightRef.current.lon, destination.lat, destination.lon);
    pinAir({ heading: heading(course + 5) }); await frame();
    expectMarker(course, destination.code); expect(readable().hidden).toBe(true);
  });

  it('keeps the live rescue target ahead of airport and discovery guidance', async () => {
    await mount(); await click(host.querySelector('[data-flight-challenge-id="coastal_rescue"]')); await readyFlight();
    const guide = hooks().getMissionGuidance(); expect(guide.destination).toBeTruthy();
    hooks().flightRef.current.heading = heading(guide.bearingDeg - 5); await frame();
    expectMarker(guide.bearingDeg, guide.destination.code); expect(readable().hidden).toBe(true);
  });

  it('keeps a required challenge airport ahead of the nearer airport and discovery guidance', async () => {
    await mount(); await click(host.querySelector('[data-flight-challenge-id="cross_country"]')); await readyFlight();
    const target = FS.WAYPOINTS.find(item => item.id === 'kjfk');
    const course = FS.bearing(hooks().flightRef.current.lat, hooks().flightRef.current.lon, target.lat, target.lon);
    pinAir({ heading: heading(course - 5) }); await frame();
    expectMarker(course, 'JFK'); expect(readable().hidden).toBe(true);
  });

  it.each(['all discovered', 'out of range'])('falls back to the nearest airport when discovery is unavailable: %s', async reason => {
    await mount(reason === 'all discovered' ? { geoDiscovered: Object.fromEntries(FS.GEO_PLACES.map(place => [place.name, true])) } : {});
    await depart();
    if (reason === 'out of range') pinAir({ lat: 0, lon: 0 }); else pinAir();
    await frame(); expect(next()).toBeNull(); expect(readable().hidden).toBe(true);
    const state = hooks().flightRef.current;
    const nearest = [...FS.WAYPOINTS].sort((a, b) => FS.haversineNm(state.lat, state.lon, a.lat, a.lon) - FS.haversineNm(state.lat, state.lon, b.lat, b.lon))[0];
    const course = FS.bearing(state.lat, state.lon, nearest.lat, nearest.lon);
    state.heading = heading(course + 5); await frame(); expectMarker(course, nearest.code);
  });

  it('preserves the absence of a navigation marker before a first-flight airport-homing phase', async () => {
    await mount(); await click(host.querySelector('[data-flight-challenge-id="first_flight"]')); await readyFlight();
    expect(FS.getFlightChallengeDestination(hooks().getFlightChallengeRef().current)).toBeNull();
    expect(label()).toBeUndefined(); expect(edge()).toBeUndefined(); expect(readable().hidden).toBe(true);
  });

  it.each([534.5, -185.5])('uses a finite equivalent discovery course on continuous longitude %s without changing the flight position', async lon => {
    await mount(); await depart(); pinAir({ lat: -42.5, lon }); await frame();
    const discovery = next(); expect(discovery.place.name).toBe('Wellington');
    const canonical = FS.getNextFlightDiscovery({ lat: -42.5, lon: 174.5 }, seen);
    expect(discovery.bearingDeg).toBeCloseTo(canonical.bearingDeg, 7);
    hooks().flightRef.current.heading = heading(discovery.bearingDeg - 5); await frame();
    expectMarker(discovery.bearingDeg, discovery.place.name); expect(hooks().flightRef.current.lon).toBe(lon);
    expect(await info()).toContain(readable().textContent); expectMarker(discovery.bearingDeg, discovery.place.name);
    expect(hooks().flightRef.current.lon).toBe(lon);
  });
});
