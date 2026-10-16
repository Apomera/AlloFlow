import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, reactRoot, host, frameCallback, wallTime, errors;
const radians = value => value * Math.PI / 180;
const flight = patch => ({ lat: 0, lon: 179.9, heading: 90, altitude: 5000, ...patch });

// Independent local nautical geometry: one latitude degree is60nm and
// longitude degrees contract by cos(latitude). Repeat across the date line.
function expectedOffset(state, target, scale = 0.5, radius = 40) {
  let longitude = target.lon - state.lon;
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  return { x: longitude * Math.max(0.05, Math.cos(radians(state.lat))) * radius / (2 * scale),
    y: -(target.lat - state.lat) * radius / (2 * scale) };
}
function recordingContext() {
  let path = [], saved = [], translation = { x: 0, y: 0 };
  const target = { commands: [], globalAlpha: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new Proxy(target, { get(object, property) {
    if (property === 'then') return undefined;
    if (property in object) return object[property];
    return (...args) => {
      object.commands.push({ method: property, args, fill: object.fillStyle, stroke: object.strokeStyle,
        points: path.map(point => ({ ...point })), translation: { ...translation } });
      if (property === 'beginPath') path = [];
      if (property === 'moveTo' || property === 'lineTo') path.push({ type: property, x: args[0], y: args[1] });
      if (property === 'arc') path.push({ type: 'arc', x: args[0], y: args[1], radius: args[2] });
      if (property === 'translate') { translation.x += args[0]; translation.y += args[1]; }
      if (property === 'save') saved.push({ translation: { ...translation }, fill: object.fillStyle, stroke: object.strokeStyle });
      if (property === 'restore' && saved.length) { const prior = saved.pop(); translation = prior.translation; object.fillStyle = prior.fill; object.strokeStyle = prior.stroke; }
    };
  }, set(object, property, value) { object[property] = value; return true; } });
}
function mapFactory({ waypoints = [], places = [], cities = [], water = () => false, plan = {}, track = [], traffic = null } = {}) {
  const samples = [], canvases = [], graphics = recordingContext();
  const fakeDocument = { createElement(tag) {
    expect(tag).toBe('canvas'); const context = recordingContext();
    const canvas = { width: 0, height: 0, getContext: () => context, context }; canvases.push(canvas); return canvas;
  } };
  const from = source.indexOf('var drawMiniMapEnhanced = function');
  const to = source.indexOf('// ── Particle effects', from);
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  const factory = new Function('getFlightMapOffset', 'isWaterMask', 'document', 'flightPlanRef', 'WAYPOINTS',
    'GEO_PLACES', 'nearestRealCities', 'hudRef', 'timeRef', 'haversineNm',
    source.slice(from, to) + ';return drawMiniMapEnhanced;');
  const draw = factory(api.getFlightMapOffset, (lat, lon) => { samples.push({ lat, lon }); return water(lat, lon); },
    fakeDocument, { current: plan }, waypoints, places, () => cities,
    { current: { _track: track, _xtraffic: traffic } }, { current: 10 }, api.haversineNm);
  return { graphics, samples, canvases,
    draw(state = flight(), size = 80) { graphics.commands.length = 0; draw(graphics, 100, 100, size, state); return graphics.commands; } };
}
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => { if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

describe('geographic cockpit map projection', () => {
  it.each([
    [0, 179.9, -179.9], [0, -179.9, 179.9], [43, 539.9, -179.9],
    [-43, -539.9, 179.9], [75, 179.9, -179.9], [-75, -179.9, 179.9],
    [89.99, 20, 21], [-89.99, 20, 21],
  ])('uses the nearby longitude branch at latitude%s from%s to%s', (lat, lon, targetLon) => {
    const state = flight({ lat, lon }), point = { lat: lat + (lat > 89 ? -0.1 : 0.1), lon: targetLon };
    const expected = expectedOffset(state, point), actual = api.getFlightMapOffset(state, point, 0.5, 40);
    expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
    expect(Math.abs(actual.x)).toBeLessThan(41);
  });
  it('scales latitude and contracted longitude consistently with the displayed nautical radius', () => {
    const state = flight({ lat: 60, lon: -70 }), north = { lat: 61, lon: -70 }, east = { lat: 60, lon: -68 };
    const a = api.getFlightMapOffset(state, north, 0.5, 40), b = api.getFlightMapOffset(state, east, 0.5, 40);
    expect(-a.y).toBeCloseTo(40, 8); expect(b.x).toBeCloseTo(40, 8);
    expect(api.getFlightMapOffset(state, north, 1, 40).y).toBeCloseTo(a.y / 2, 8);
    expect(api.getFlightMapOffset(state, north, 0.5, 20).y).toBeCloseTo(a.y / 2, 8);
  });
  it('rejects malformed coordinates rather than sending nonfinite points to Canvas', () => {
    for (const point of [null, {}, { lat: NaN, lon: 0 }, { lat: 0, lon: Infinity }]) expect(api.getFlightMapOffset(flight(), point, 0.5, 40)).toBeNull();
    expect(api.getFlightMapOffset(flight({ lat: NaN }), { lat: 0, lon: 0 }, 0.5, 40)).toBeNull();
  });
});

async function mountCockpit(width, height) {
  vi.useFakeTimers(); wallTime = 1000; const contexts = new Map(); const refs = new Set();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!contexts.has(this)) contexts.set(this, recordingContext()); return contexts.get(this);
  });
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {}); delete window.THREE;
  const observedReact = { ...React, useRef(initial) { const ref = React.useRef(initial); refs.add(ref); return ref; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: true,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ React: observedReact, toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 90, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.timeRef.current = 10; hooks.pausedRef.current = true;
  let flip = false;
  return { hooks, contexts, refs, async frame() {
    flip = !flip;
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { value: width + (flip ? 0 : 2), configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
    }
    for (const context of contexts.values()) context.commands.length = 0;
    wallTime += 16; expect(frameCallback).toBeTypeOf('function');
    await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
  } };
}

describe('actual cockpit animation consumes real map geography', () => {
  it.each([{ width: 1280, height: 720 }, { width: 320, height: 568 }])
  ('draws and retains the detailed cached map at $width by $height', async ({ width, height }) => {
    const mounted = await mountCockpit(width, height); await mounted.frame();
    const backgrounds = [...mounted.contexts].filter(([canvas, context]) => !canvas.isConnected &&
      context.commands.filter(command => command.method === 'fillRect').length > 2000 && canvas.width < 512);
    expect(backgrounds).toHaveLength(1);
    const [background, backgroundContext] = backgrounds[0];
    const mapFills = backgroundContext.commands.filter(command => command.method === 'fillRect');
    expect(new Set(mapFills.map(command => command.fill)).size).toBeGreaterThanOrEqual(2);
    const mainContexts = [...mounted.contexts].filter(([canvas]) => canvas.isConnected).map(([, context]) => context);
    const mapPaint = () => mainContexts.flatMap(context => context.commands).filter(command => command.method === 'drawImage' && command.args[0] === background);
    expect(mapPaint()).toHaveLength(1);
    const initial = mapPaint()[0];
    mounted.hooks.flightRef.current.lon += 0.0001;
    await mounted.frame();
    expect(mapPaint()).toHaveLength(1);
    expect(mapPaint()[0].args[0]).toBe(initial.args[0]);
    expect(backgroundContext.commands.filter(command => command.method === 'fillRect')).toHaveLength(0);
    for (const context of mainContexts) for (const command of context.commands) {
      expect(command.args.filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
    }
    expect(host.querySelectorAll('[data-world-environment]')).toHaveLength(1);
  });
});


describe('production map background and overlays', () => {
  it('paints source land and water on a detailed lattice without a history-dependent quarter-degree memo', () => {
    const map = mapFactory({ water: (lat, lon) => lon >= 0 }); map.draw(flight({ lat: 0, lon: 0 }));
    expect(map.canvases).toHaveLength(1);
    const fills = map.canvases[0].context.commands.filter(command => command.method === 'fillRect');
    expect(fills.length).toBeGreaterThan(2000); expect(fills).toHaveLength(map.samples.length);
    fills.forEach((fill, index) => expect(fill.fill).toBe(map.samples[index].lon >= 0 ? '#193655' : '#365b43'));
    expect(new Set(map.samples.map(sample => sample.lon)).size).toBeGreaterThan(60);
    expect(new Set(map.samples.map(sample => sample.lat)).size).toBeGreaterThan(60);
    const east = map.samples.filter(sample => sample.lon > 0), west = map.samples.filter(sample => sample.lon < 0);
    expect(east.length).toBeGreaterThan(1000); expect(west.length).toBeGreaterThan(1000);
    expect(map.graphics.commands.filter(command => command.method === 'drawImage')).toHaveLength(1);
  });
  it('uses the same canonical geographic samples regardless of which point in a cell was visited first', () => {
    const a = mapFactory(), b = mapFactory();
    a.draw(flight({ lat: 0.001, lon: 0.001 })); b.draw(flight({ lat: -0.001, lon: -0.001 }));
    expect(a.samples).toEqual(b.samples);
    const before = a.samples.length; a.draw(flight({ lat: -0.001, lon: -0.001 }));
    expect(a.samples).toHaveLength(before);
  });
  it('pans cached geography by the same geographic distance as point symbols between lattice rebuilds', () => {
    const state = flight({ lat: 0, lon: 0 }), map = mapFactory();
    const first = map.draw(state).find(command => command.method === 'drawImage');
    const count = map.samples.length;
    const shifted = map.draw({ ...state, lat: 0.001, lon: 0.001 }).find(command => command.method === 'drawImage');
    expect(map.samples).toHaveLength(count); expect(shifted.args[0]).toBe(first.args[0]);
    const centre = command => ({ x: command.args[1] + command.args[3] / 2, y: command.args[2] + command.args[4] / 2 });
    expect(centre(shifted).x - centre(first).x).toBeCloseTo(-0.001 * Math.cos(radians(0.001)) * 40, 8);
    expect(centre(shifted).y - centre(first).y).toBeCloseTo(0.001 * 40, 8);
    expect(shifted.args[3] / shifted.args[4]).toBeCloseTo(Math.cos(radians(0.001)), 8);
  });
  it('reuses the bitmap at fixed pose, refreshes for range/size/movement, and retains one canvas', () => {
    const map = mapFactory(), state = flight({ lat: 0, lon: 0 }); map.draw(state); const initialCount = map.samples.length;
    map.draw(state); expect(map.samples).toHaveLength(initialCount);
    map.draw({ ...state, altitude: 15000 }); expect(map.samples).toHaveLength(initialCount * 2);
    map.draw({ ...state, altitude: 15000 }, 100); expect(map.samples).toHaveLength(initialCount * 3);
    map.draw({ ...state, lat: 3, altitude: 15000 }, 100); expect(map.samples).toHaveLength(initialCount * 4);
    expect(map.canvases).toHaveLength(1);
  });
  it('retains one range bucket through small altitude changes and rebuilds when crossing its boundary', () => {
    const map = mapFactory(), state = flight({ lat: 0, lon: 0, altitude: 10000 });
    const first = map.draw(state).find(command => command.method === 'drawImage'); const count = map.samples.length;
    for (const altitude of [9751, 9999, 10001, 10249, 10000]) {
      const commands = map.draw({ ...state, altitude });
      expect(map.samples).toHaveLength(count);
      expect(commands.find(command => command.method === 'drawImage').args[0]).toBe(first.args[0]);
      expect(commands.find(command => command.method === 'fillText').args[0]).toBe('120 nm');
    }
    const crossed = map.draw({ ...state, altitude: 10251 });
    expect(map.samples).toHaveLength(count * 2); expect(map.canvases).toHaveLength(1);
    expect(crossed.find(command => command.method === 'fillText').args[0]).toBe('126 nm');
  });
  it('keeps a cached scene on equivalent signed or unwrapped longitude branches', () => {
    const map = mapFactory(), state = flight({ lat: 10, lon: 179.99 });
    const first = map.draw(state).find(command => command.method === 'drawImage'); const before = map.samples.length;
    const after = map.draw({ ...state, lon: 539.99 }).find(command => command.method === 'drawImage');
    expect(map.samples).toHaveLength(before); expect(after.args[0]).toBe(first.args[0]);
    after.args.slice(1).forEach((value, index) => expect(value).toBeCloseTo(first.args[index + 1], 8));
  });
  it.each([179.9, -180.1, 539.9])('draws all geographic overlays nearby across the date line from longitude%s', lon => {
    const state = flight({ lon }), point = { lat: 0.1, lon: -179.9 }, expected = expectedOffset(state, point);
    const waypoint = { ...point, id: 'near', code: 'DATE' }, departure = { lat: -0.1, lon: 179.8 }, destination = { ...point, id: 'near', code: 'DATE' };
    const city = { ...point, name: 'Dateline City', popK: 1000 };
    const track = [{ lat: 0, lon: 179.8 }, { lat: 0, lon: -179.95 }, { lat: 0, lon: -179.9 }];
    const map = mapFactory({ waypoints: [waypoint, { lat: 0, lon: 0, code: 'FAR' }], places: [{ ...point, type: 'capital' }],
      cities: [city], plan: { departure, destination }, track, traffic: point });
    const commands = map.draw(state), at = { x: 140 + expected.x, y: 140 + expected.y };
    const label = commands.find(command => command.method === 'fillText' && command.args[0] === 'DATE');
    expect(label).toBeTruthy(); expect(label.args[1]).toBeCloseTo(at.x, 8); expect(label.args[2]).toBeCloseTo(at.y - 6, 8);
    expect(commands.some(command => command.method === 'fillText' && command.args[0] === 'FAR')).toBe(false);
    const route = commands.find(command => command.method === 'stroke' && command.stroke === 'rgba(251,191,36,0.5)');
    expect(route.points).toHaveLength(2);
    expect(route.points.at(-1).x).toBeCloseTo(at.x, 8); expect(route.points.at(-1).y).toBeCloseTo(at.y, 8);
    expect(Math.abs(route.points[1].x - route.points[0].x)).toBeLessThan(20);
    const place = commands.find(command => command.method === 'fillRect' && command.fill === 'rgba(251,191,36,0.4)');
    expect(place.args[0]).toBeCloseTo(at.x - 0.5, 8); expect(place.args[1]).toBeCloseTo(at.y - 0.5, 8);
    const cityLabel = commands.find(command => command.method === 'fillText' && command.args[0] === city.name);
    expect(cityLabel.args[1]).toBeCloseTo(at.x, 8); expect(cityLabel.args[2]).toBeCloseTo(at.y - 3, 8);
    const cityDot = commands.find(command => command.method === 'fillRect' && command.fill?.startsWith('rgba(255,235,190,'));
    expect(cityDot.args[0] + cityDot.args[2] / 2).toBeCloseTo(at.x, 8);
    const trail = commands.find(command => command.method === 'stroke' && command.stroke === 'rgba(74,222,128,0.5)');
    expect(trail.points.map(point => point.type)).toEqual(['moveTo', 'lineTo', 'lineTo']);
    expect(Math.max(...trail.points.map(point => point.x)) - Math.min(...trail.points.map(point => point.x))).toBeLessThan(20);
    const traffic = commands.find(command => command.method === 'fillRect' && command.fill === 'rgba(251,191,36,0.95)');
    expect(traffic.translation.x).toBeCloseTo(at.x, 8); expect(traffic.translation.y).toBeCloseTo(at.y, 8);
  });
  it('lifts the breadcrumb pen for invalid or off-dial observations instead of drawing chords', () => {
    const map = mapFactory({ track: [{ lat: 0, lon: 179.9 }, { lat: 0, lon: NaN }, { lat: 0, lon: -179.9 },
      { lat: 0, lon: 0 }, { lat: 0, lon: -179.8 }] });
    const trail = map.draw().find(command => command.method === 'stroke' && command.stroke === 'rgba(74,222,128,0.5)');
    expect(trail.points.map(point => point.type)).toEqual(['moveTo', 'moveTo', 'moveTo']);
  });
  it.each([89.99, -89.99])('keeps cached map samples and painting finite near latitude%s', lat => {
    const map = mapFactory(); const commands = map.draw(flight({ lat }));
    expect(map.samples.every(point => Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90)).toBe(true);
    const image = commands.find(command => command.method === 'drawImage'); expect(image).toBeTruthy();
    expect(image.args.slice(1).every(Number.isFinite)).toBe(true);
  });
  it('keeps the chart concise and names only the two most populous visible cities', () => {
    const cities = Array.from({ length: 8 }, (_, index) => ({ lat: 0, lon: 179.9, name: 'City' + index, popK: 500 + index * 100 }));
    const labels = mapFactory({ cities }).draw().filter(command => command.method === 'fillText').map(command => command.args[0]);
    expect(labels).toEqual(['City7', 'City6', '60 nm']);
  });
});
