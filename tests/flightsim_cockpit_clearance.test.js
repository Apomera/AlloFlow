import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const hooks = () => window.__testHooks.flightSim;
const phoneViews = [320, 375].flatMap(width => [500, 619].flatMap(height =>
  [false, true].map(chase => [width, height, chase])));
const compactApproachViews = [...phoneViews, [320, 488, false], [320, 488, true]];
let FS, tool, host, reactRoot, patchSaved, frameCallback, errors, wallTime, physicsSnapshot;
let texts, rectangles, arcs, greenPaths;

const fontSize = font => Number(/([\d.]+)px/.exec(font || '')?.[1]) || 10;
const measure = (value, font) => Array.from(String(value)).length * fontSize(font) * 0.6;
const textBox = item => {
  const width = Math.min(measure(item.text, item.font), item.maxWidth ?? Infinity);
  const height = fontSize(item.font);
  const x = item.x - (item.align === 'center' ? width / 2 : item.align === 'right' || item.align === 'end' ? width : 0);
  const y = item.y - (item.baseline === 'middle' ? height / 2 : item.baseline === 'top' || item.baseline === 'hanging' ? 0 : height);
  return { x, y, w: width, h: height };
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const contains = (outer, inner) => outer.x <= inner.x && outer.y <= inner.y
  && outer.x + outer.w >= inner.x + inner.w && outer.y + outer.h >= inner.y + inner.h;
const paintedTexts = () => texts.map(item => item.text);
const controls = patch => ({ throttle: 0.6, pitch: 0, bank: 0, yawRate: 0, brake: 0, flaps: 0, ...patch });

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab();
  window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  delete window.THREE;
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  physicsSnapshot = Object.getOwnPropertyDescriptors(FS.Physics);
  wallTime = 1000; texts = []; rectangles = []; arcs = []; greenPaths = [];
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

async function mountFlight(width, height, chase = false) {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const savedStyles = [];
  let path = [];
  const styleKeys = ['font', 'textAlign', 'textBaseline', 'fillStyle', 'strokeStyle', 'globalAlpha', 'lineWidth'];
  const context = new Proxy({
    font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1,
    save() { savedStyles.push(Object.fromEntries(styleKeys.map(key => [key, context[key]]))); },
    restore() { if (savedStyles.length) Object.assign(context, savedStyles.pop()); },
    measureText(value) { return { width: measure(value, context.font) }; },
    fillText(value, x, y, maxWidth) {
      texts.push({ text: String(value), x, y, maxWidth, font: context.font,
        align: context.textAlign, baseline: context.textBaseline, fill: context.fillStyle });
    },
    roundRect(x, y, w, h) { rectangles.push({ x, y, w, h, fill: context.fillStyle, kind: 'roundRect' }); },
    fillRect(x, y, w, h) { rectangles.push({ x, y, w, h, fill: context.fillStyle, kind: 'fillRect' }); },
    arc(x, y, r) { arcs.push({ x, y, r, fill: context.fillStyle, stroke: context.strokeStyle }); },
    beginPath() { path = []; },
    moveTo(x, y) { path.push([x, y]); },
    lineTo(x, y) { path.push([x, y]); },
    fill() { if (context.fillStyle === '#22c55e') greenPaths.push(path.map(point => [...point])); },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
    if (callback.name === 'loop') frameCallback = callback;
    return 1;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host);
  reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(FS.ACHIEVEMENTS.map(item => [item.id, true])) } });
    patchSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => reactRoot.render(React.createElement(App)));
  await act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  }
  const dock = host.querySelector('[data-flightsim-hud-dock]');
  for (const [key, value] of Object.entries({ offsetLeft: 8, offsetTop: 62, offsetWidth: 215, offsetHeight: 64 })) {
    Object.defineProperty(dock, key, { configurable: true, value });
  }
  Object.assign(hooks().getWeatherRef().current, { wind: 0, turbulence: 0 });
  // Hold the flight state so the real RAF can record and paint the active
  // approach cues. Physics behavior is covered in its separate suites.
  vi.spyOn(FS.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: FS.Physics.WEIGHT, weight: FS.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  hooks().timeRef.current = 10;
}

function runwayFlight(heightAboveField, distanceBeforeThresholdFt = 0.65 * 6076.12, patch = {}) {
  const airport = FS.WAYPOINTS.find(item => item.id === 'kpwm');
  const runway = FS.getFlightRunway(airport), end = runway.ends[0];
  const position = FS.getFlightRunwayPosition(runway, 0,
    end.thresholdAlongFt - end.sign * distanceBeforeThresholdFt, heightAboveField);
  return { ...position, speed: 120, fieldElev: airport.alt, heading: end.headingDeg,
    vsi: -2, onGround: false, aoa: 4, stalling: false, lowAirspeed: false, hitCeiling: false, ...patch };
}

async function paintFrame(state, input = controls()) {
  Object.assign(hooks().flightRef.current, state);
  Object.assign(hooks().controlsRef.current, input);
  texts.length = 0; rectangles.length = 0; arcs.length = 0; greenPaths.length = 0;
  wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}

const attitudeBox = layout => ({ x: layout.horizon.x - layout.horizon.r,
  y: layout.horizon.y - layout.horizon.r - 5, w: layout.horizon.r * 2, h: layout.horizon.r * 2 + 5 });
const primaryBoxes = layout => [attitudeBox(layout), layout.speed, layout.altitude,
  { x: layout.vsi.x - layout.vsi.r, y: layout.vsi.y - layout.vsi.r, w: layout.vsi.r * 2, h: layout.vsi.r * 2 },
  { x: layout.gForce.x, y: layout.gForce.y, w: 40, h: 30 }];
const fullSizeFlareArrows = width => greenPaths.filter(path => {
  if (path.length !== 7 || path[0][0] !== width / 2) return false;
  const center = width / 2, base = path[0][1] + 28;
  const expected = [[center, base - 28], [center - 16, base], [center - 6, base],
    [center - 6, base + 16], [center + 6, base + 16], [center + 6, base], [center + 16, base]];
  return path.every(([x, y], index) => x === expected[index][0] && y === expected[index][1]);
});

describe('folded cockpit primary information clearance', () => {
  it.each(phoneViews)('keeps primary status and airport text separate at %i by %i, chase%s', async (width, height, chase) => {
    await mountFlight(width, height, chase);
    const state = runwayFlight(12345, 0.65 * 6076.12, { speed: 250, vsi: 20 });
    await paintFrame(state);
    const telemetry = hooks().getTelemetry();
    const status = texts.find(item => /^(IAS |GS |HDG )/.test(item.text) && item.y === 21);
    expect(status).toBeTruthy();
    expect(status.text).toContain('IAS ' + Math.round(telemetry.iasKts));
    expect(status.text).toContain('ALT ' + Math.round(state.altitude).toLocaleString());
    const statusBounds = textBox(status);
    expect(statusBounds.x).toBeGreaterThanOrEqual(8);
    expect(statusBounds.x + statusBounds.w).toBeLessThanOrEqual(width - 40);
    const airportLabels = texts.filter(item => /\bnm\s+BRG\b/.test(item.text) && item.y === 21);
    for (const label of airportLabels) {
      const bounds = textBox(label);
      expect(overlaps(statusBounds, bounds)).toBe(false);
      expect(bounds.x).toBeGreaterThanOrEqual(statusBounds.x + statusBounds.w + 8);
      expect(bounds.x + bounds.w).toBeLessThanOrEqual(width - 40);
    }
    // The airport is still available in the default minimap even if its
    // duplicate distance/bearing line yields the cramped status strip.
    const map = FS.getFlightInstrumentLayout(width, height, chase).map;
    expect(arcs.some(item => item.x === map.x + map.size / 2
      && item.y === map.y + map.size / 2 && item.r === map.size / 2)).toBe(true);
  });

  it.each([[800, false], [1280, true]])('lets the approach banner own the drift-cue band at width%i, chase%s', async (width, chase) => {
    await mountFlight(width, 720, chase);
    Object.assign(hooks().getWeatherRef().current, { wind: 20, windDir: 120 });
    await paintFrame(runwayFlight(5000, undefined, { vsi: 0 }));
    expect(Math.abs(hooks().getTelemetry().driftAngleDeg)).toBeGreaterThan(1);
    expect(hooks().getTelemetry().approachActive).toBe(false);
    expect(paintedTexts().some(text => text.startsWith('DRIFT '))).toBe(true);
    expect(paintedTexts().some(text => /^APP (STABLE|CHECK)/.test(text))).toBe(false);

    const heightOnSlope = 5 + Math.tan(3 * Math.PI / 180) * (0.65 * 6076.12 + 1000);
    await paintFrame(runwayFlight(heightOnSlope, undefined, { vsi: -4 }));
    expect(hooks().getTelemetry().approachActive).toBe(true);
    expect(Math.abs(hooks().getTelemetry().driftAngleDeg)).toBeGreaterThan(1);
    const banner = texts.find(item => /^APP (STABLE|CHECK)/.test(item.text));
    expect(banner).toBeTruthy();
    expect(paintedTexts().some(text => text.startsWith('DRIFT '))).toBe(false);
    expect(rectangles.some(rect => rect.kind === 'roundRect' && rect.h <= 28 && contains(rect, textBox(banner)))).toBe(true);
  });

  it.each([[800, false], [1280, true]])('keeps drift out of the engaged autopilot band at width%i, chase%s', async (width, chase) => {
    await mountFlight(width, 720, chase);
    Object.assign(hooks().getWeatherRef().current, { wind: 20, windDir: 120 });
    await act(async () => patchSaved({ autopilot: { hdg: true, tgtHdg: 30, alt: false, spd: false } }));
    await paintFrame(runwayFlight(5000, undefined, { vsi: 0 }));
    expect(Math.abs(hooks().getTelemetry().driftAngleDeg)).toBeGreaterThan(1);
    expect(paintedTexts().some(text => text.startsWith('AP: HDG 30'))).toBe(true);
    expect(paintedTexts().some(text => text.startsWith('DRIFT '))).toBe(false);
  });
});

describe('compact approach coaching clears primary instruments', () => {
  it.each(compactApproachViews)('keeps radio altitude and flare usable at %i by %i, chase%s', async (width, height, chase) => {
    await mountFlight(width, height, chase);
    const layout = FS.getFlightInstrumentLayout(width, height, chase);
    await paintFrame(runwayFlight(500));
    expect(hooks().flightRef.current._raCallouts['500']).toBeGreaterThan(0);
    expect(paintedTexts()).toContain('AGL 500 ft');
    expect(paintedTexts()).not.toContain('RADIO ALT');
    expect(paintedTexts()).not.toContain('500 ft');
    // Short windshields retain primary flight data and throttle; the optional
    // engine and auxiliary stack appears only below its reserved top band.
    const engineFits = !layout.compact || layout.vsi.y - layout.vsi.r >= 216;
    const auxiliaryFits = !layout.compact || layout.auxiliary.y - 42 >= 216;
    expect(paintedTexts().some(text => /^\d+ RPM$/.test(text))).toBe(engineFits);
    expect(paintedTexts().some(text => text.includes('°C OAT'))).toBe(auxiliaryFits);
    expect(paintedTexts().some(text => /^\d{2}:\d{2}$/.test(text))).toBe(auxiliaryFits);
    await act(async () => vi.advanceTimersByTime(60));
    expect(document.getElementById('skyschool-a11y-live').textContent).toBe('500');
    expect(arcs.some(item => item.x === layout.horizon.x
      && item.y === layout.horizon.y && item.r === layout.horizon.r)).toBe(true);

    const final = runwayFlight(20, 500);
    expect(FS.getFlightRunwayApproach(final, FS.WAYPOINTS.find(item => item.id === 'kpwm')).available).toBe(true);
    await paintFrame(final);
    const flare = texts.filter(item => item.text.startsWith('FLARE'));
    expect(flare).toHaveLength(1);
    expect(flare[0].text).toBe('FLARE — ease back on W');
    expect(paintedTexts()).toContain('AGL 20 ft');
    const bounds = textBox(flare[0]);
    const plate = rectangles.find(rect => rect.kind === 'roundRect' && rect.h <= 32
      && rect.w < width - 16 && contains(rect, bounds));
    expect(plate).toBeTruthy();
    expect(plate.x + plate.w / 2).toBeCloseTo(layout.horizon.x, 5);
    expect(plate.y + plate.h + 16).toBeLessThanOrEqual(attitudeBox(layout).y);
    // The outside-view nose/flight-path cue also needs clear space near the
    // viewport center, even when the attitude gauge itself is farther below.
    expect(plate.y + plate.h + 16).toBeLessThanOrEqual(height / 2 - 8);
    expect(plate.x).toBeGreaterThanOrEqual(8);
    expect(plate.y).toBeGreaterThanOrEqual(0);
    expect(plate.x + plate.w).toBeLessThanOrEqual(width - 8);
    for (const primary of primaryBoxes(layout)) expect(overlaps(plate, primary)).toBe(false);
    expect(fullSizeFlareArrows(width)).toEqual([]);
  });

  it.each([[800, false], [1280, true]])('retains the full-size approach callout and flare arrow at width%i, chase%s', async (width, chase) => {
    const height = 720;
    await mountFlight(width, height, chase);
    await paintFrame(runwayFlight(500));
    expect(paintedTexts()).toContain('RADIO ALT');
    expect(paintedTexts()).toContain('500 ft');
    const layout = FS.getFlightInstrumentLayout(width, height, chase);
    const radio = rectangles.find(rect => rect.kind === 'roundRect'
      && rect.fill === 'rgba(2,6,23,0.82)' && rect.h === 42);
    expect(radio).toBeTruthy();
    expect(overlaps(radio, attitudeBox(layout))).toBe(false);
    await paintFrame(runwayFlight(20, 500));
    expect(paintedTexts()).toContain('FLARE — ease back on W');
    const arrows = fullSizeFlareArrows(width);
    expect(arrows).toHaveLength(1);
    const flareY = Math.min(height * 0.72, layout.horizon.y - layout.horizon.r - 56);
    expect(arrows[0][0][1]).toBe(flareY - 28);
    const flare = texts.find(item => item.text === 'FLARE — ease back on W');
    const label = textBox(flare);
    expect(flare.y).toBe(flareY + 22);
    expect(label.y + label.h + 16).toBeLessThanOrEqual(attitudeBox(layout).y);
    for (const primary of primaryBoxes(layout)) expect(overlaps(label, primary)).toBe(false);
  });
});
