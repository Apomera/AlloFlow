import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, commands, renderer;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

const vector = direction => new Three.Vector3(direction.x, direction.y, direction.z);
const bearingTo = direction => (Math.atan2(direction.x, -direction.z) * 180 / Math.PI + 360) % 360;
const solarHourAt = hooks => ((hooks.flightRef.current.lon / 15 + 12 + hooks.timeRef.current * 0.01) % 24 + 24) % 24;
function setSolarHour(hooks, hour) {
  // Exercise the production clock: no replacement day/night function or sky hook.
  hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
}

describe('SkySchool shared simplified solar geometry', () => {
  it.each([0, 6, 12, 18])('keeps normalized sun and opposite lunar paths at solar hour %s', hour => {
    const frame = api.getFlightSolarFrame(hour);
    expect(frame.solarHour).toBe(hour);
    for (const [name, bodyHour] of [['sun', hour], ['moon', (hour + 12) % 24]]) {
      const phase = Math.PI * (bodyHour - 6) / 12;
      const elevation = Math.sin(phase) * 1.15;
      const expected = new Three.Vector3(Math.cos(phase) * Math.cos(elevation), Math.sin(elevation), Math.sin(phase) * Math.cos(elevation));
      expect(frame[name].phaseRad).toBeCloseTo(phase, 12);
      expect(frame[name].elevationRad).toBeCloseTo(elevation, 12);
      expect(vector(frame[name].direction).length()).toBeCloseTo(1, 12);
      expect(vector(frame[name].direction).distanceTo(expected)).toBeLessThan(1e-12);
    }
    if (hour === 6) expect(frame.sun.direction.x).toBeCloseTo(1, 12);
    if (hour === 12) { expect(frame.sun.direction.z).toBeGreaterThan(0); expect(frame.sun.elevationRad).toBe(1.15); }
    if (hour === 18) expect(frame.sun.direction.x).toBeCloseTo(-1, 12);
    if (hour === 0) expect(frame.sun.direction.y).toBeLessThan(0);
  });
  it.each([[-1, 23], [25, 1], [48, 0], [-48, 0], [undefined, 12], [NaN, 12], [Infinity, 12]])(
    'wraps or safely defaults solar hour %s to %s', (input, expected) => {
      const frame = api.getFlightSolarFrame(input);
      expect(frame.solarHour).toBe(expected);
      expect(JSON.stringify(frame)).toBe(JSON.stringify(api.getFlightSolarFrame(expected)));
    });
});

describe('SkySchool perspective solar projection', () => {
  it.each([[320, 763], [1280, 720]])('matches an independent Three camera at %s by %s', (width, height) => {
    for (const hour of [7, 9, 12, 17, 19]) for (const body of ['sun', 'moon']) {
      const direction = api.getFlightSolarFrame(hour)[body].direction;
      for (const heading of [0, 90, 180, 270]) for (const [pitch, bank] of [[0, 0], [20, 35], [-20, -35]]) {
        const view = api.getFlightViewBasis(heading, pitch, bank);
        const depth = vector(direction).dot(vector(view.forward));
        const actual = api.projectFlightDirection(direction, view, width, height);
        if (depth <= 1e-6) { expect(actual).toBeNull(); continue; }
        const camera = new Three.PerspectiveCamera(60, width / height, 10, 300000);
        camera.quaternion.setFromEuler(new Three.Euler(pitch * Math.PI / 180, -heading * Math.PI / 180, -bank * Math.PI / 180, 'YXZ'));
        camera.updateMatrixWorld(true);
        const expected = vector(direction).multiplyScalar(100000).project(camera);
        expect(actual.x).toBeCloseTo((expected.x + 1) * width / 2, 7);
        expect(actual.y).toBeCloseTo((1 - expected.y) * height / 2, 7);
        expect(actual.depth).toBeCloseTo(depth, 12);
      }
    }
  });
  it('retains the original focal length when Canvas paints a padded banked world', () => {
    const direction = api.getFlightSolarFrame(7).sun.direction;
    const view = api.getFlightViewBasis(bearingTo(direction) - 10, 0, 0);
    view.focalLength = 720 / (2 * Math.tan(Math.PI / 6));
    const normal = api.projectFlightDirection(direction, view, 1280, 720);
    const padded = api.projectFlightDirection(direction, view, 1600, 1200);
    expect(padded.x - normal.x).toBeCloseTo(160, 9);
    expect(padded.y - normal.y).toBeCloseTo(240, 9);
  });
  it('rejects rear-facing, nonfinite, and malformed projections before Canvas drawing', () => {
    const direction = api.getFlightSolarFrame(7).sun.direction;
    const front = api.getFlightViewBasis(bearingTo(direction), 0, 0);
    const rear = api.getFlightViewBasis(bearingTo(direction) + 180, 0, 0);
    expect(api.projectFlightDirection(direction, rear, 320, 763)).toBeNull();
    for (const [width, height] of [[Infinity, 763], [320, Infinity], [NaN, 763], [320, 0]]) {
      expect(api.projectFlightDirection(direction, front, width, height)).toBeNull();
    }
    for (const invalid of [null, { x: NaN, y: 0, z: 0 }, { x: 1, y: Infinity, z: 0 }]) {
      expect(api.projectFlightDirection(invalid, front, 320, 763)).toBeNull();
    }
    expect(api.projectFlightDirection(direction, {}, 320, 763)).toBeNull();
  });
});

async function mountFlight(webgl = false, width = 1280, height = 720) {
  commands = []; wallTime = 1000; frameCallback = null;
  let path = [];
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ kind: 'radial', stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    beginPath() { path = []; },
    arc(...args) { path.push({ method: 'arc', args }); },
    ellipse(...args) { path.push({ method: 'ellipse', args }); },
    fill() { commands.push({ method: 'fill', path: [...path], fill: context.fillStyle }); },
  }, {
    get: (target, property) => property in target ? target[property] : (...args) => commands.push({ method: property, args, fill: context.fillStyle }),
    set: (target, property, value) => { target[property] = value; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, flightDetails: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  // Hold the pose while production camera, lighting, world passes, and HUD run.
  // Physics behavior is covered separately; this checks actual painting decisions.
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  return hooks;
}
async function draw() {
  commands.length = 0; wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
}
const solarDiscs = () => commands.filter(command => command.method === 'fill'
  && typeof command.fill === 'string' && /^rgba\(255,244,205,/.test(command.fill)
  && command.path.some(part => part.method === 'arc'));

describe('SkySchool production solar rendering', () => {
  it.each([[320, 763], [1280, 720]])('paints one world-facing Canvas sun and none behind the camera at %s by %s', async (width, height) => {
    const hooks = await mountFlight(false, width, height);
    setSolarHour(hooks, 7);
    const direction = api.getFlightSolarFrame(7).sun.direction;
    Object.assign(hooks.flightRef.current, { heading: bearingTo(direction), speed: 0, onGround: true });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    await draw();
    const discs = solarDiscs();
    expect(discs).toHaveLength(1);
    const arc = discs[0].path.find(part => part.method === 'arc').args;
    expect(arc[0]).toBeGreaterThan(0); expect(arc[0]).toBeLessThan(width);
    expect(arc[1]).toBeGreaterThan(0); expect(arc[1]).toBeLessThan(height / 2);
    Object.assign(hooks.flightRef.current, { heading: (bearingTo(direction) + 180) % 360 });
    await draw();
    expect(solarDiscs()).toHaveLength(0);
    expect(commands.some(command => typeof command.fill === 'string' && /^rgba\(255,240,200,/.test(command.fill))).toBe(false);
  });
  it.each([7, 22])('keeps the WebGL solar light and target coherent after world movement at solar hour %s', async hour => {
    const hooks = await mountFlight(true);
    const directions = [];
    const expectedDirections = [];
    const positions = [];
    for (const [latDelta, lonDelta] of [[0, 0], [1, 2]]) {
      Object.assign(hooks.flightRef.current, { lat: 43.646 + latDelta, lon: -70.309 + lonDelta, heading: 90, speed: 0, onGround: true });
      setSolarHour(hooks, hour); await draw();
      expect(renderer.render).toHaveBeenCalled();
      const [scene, camera] = renderer.render.mock.calls.at(-1);
      const light = scene.children.find(item => item.isDirectionalLight);
      expect(light).toBeTruthy();
      expect(light.target.parent).toBe(scene);
      const target = light.target.getWorldPosition(new Three.Vector3());
      expect(target.distanceTo(camera.position)).toBeLessThan(1e-8);
      const direction = light.getWorldPosition(new Three.Vector3()).sub(target).normalize();
      // The clock advances inside each real RAF; derive its expected change
      // independently so translation invariance does not assume identical dt.
      const actualHour = solarHourAt(hooks);
      const sunElevation = Math.sin(Math.PI * (actualHour - 6) / 12) * 1.15;
      const lightHour = sunElevation > 0.02 ? actualHour : (actualHour + 12) % 24;
      const phase = Math.PI * (lightHour - 6) / 12;
      const elevation = Math.sin(phase) * 1.15;
      const expected = new Three.Vector3(Math.cos(phase) * Math.cos(elevation), Math.sin(elevation), Math.sin(phase) * Math.cos(elevation));
      expect(direction.distanceTo(expected)).toBeLessThan(1e-9);
      directions.push(direction); expectedDirections.push(expected); positions.push(camera.position.clone());
    }
    expect(positions[1].distanceTo(positions[0])).toBeGreaterThan(100000);
    const observedChange = directions[1].clone().sub(directions[0]);
    const solarClockChange = expectedDirections[1].clone().sub(expectedDirections[0]);
    expect(observedChange.distanceTo(solarClockChange)).toBeLessThan(1e-9);
  });
  it('paints one weather-aware shadow pass instead of stacking legacy low-altitude shadows', async () => {
    const hooks = await mountFlight(false);
    const airport = api.WAYPOINTS.find(item => item.code === 'DEN');
    expect(airport).toBeTruthy();
    Object.assign(hooks.flightRef.current, { lat: airport.lat, lon: airport.lon, altitude: airport.alt, fieldElev: airport.alt, speed: 0, onGround: true });
    setSolarHour(hooks, 12); await draw();
    expect(commands.some(command => command.method === 'fill' && command.fill?.kind === 'radial'
      && command.fill.stops.some(([, color]) => color.startsWith('rgba(26,38,56,'))
      && command.path.some(part => part.method === 'ellipse'))).toBe(true);
    expect(commands.some(command => command.method === 'fill' && typeof command.fill === 'string'
      && command.fill.startsWith('rgba(20,30,40,') && command.path.some(part => part.method === 'ellipse'))).toBe(false);
  });
});

const renderedStarField = () => {
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  const stars = scene.children.find(item => item.isPoints && item.geometry?.attributes.position?.count === 600);
  expect(stars).toBeTruthy();
  return stars;
};

describe('SkySchool atmospheric star exposure', () => {
  it.each([7, 12, 17].flatMap(hour => [76, 40000].map(altitude => ({ hour, altitude }))))(
    'hides WebGL stars with the sun above the horizon at hour$hour / altitude$altitude', async ({ hour, altitude }) => {
      const hooks = await mountFlight(true);
      Object.assign(hooks.flightRef.current, { altitude, onGround: altitude === 76, speed: 0 });
      setSolarHour(hooks, hour); await draw();
      const stars = renderedStarField();
      expect(stars.material.opacity).toBe(0);
      expect(stars.visible).toBe(false);
    });
  it.each([
    { name: 'dawn', hours: [5.6, 5.8, 5.95, 5.999, 6.001], increasing: false },
    { name: 'dusk', hours: [17.999, 18.001, 18.05, 18.2, 18.4], increasing: true },
  ])('fades continuously through $name instead of switching at sunrise or sunset', async ({ hours, increasing }) => {
    const hooks = await mountFlight(true);
    const opacity = [];
    for (const hour of hours) {
      setSolarHour(hooks, hour); await draw();
      opacity.push(renderedStarField().material.opacity);
    }
    for (const value of opacity) expect(Number.isFinite(value) && value >= 0 && value <= 1).toBe(true);
    for (let index = 1; index < opacity.length; index++) {
      expect(increasing ? opacity[index] > opacity[index - 1] : opacity[index] < opacity[index - 1]).toBe(true);
    }
    const boundary = increasing ? opacity.slice(0, 2) : opacity.slice(-2);
    expect(Math.abs(boundary[1] - boundary[0])).toBeLessThan(0.01);
    const nightEnd = increasing ? opacity.at(-1) : opacity[0];
    const daylightEnd = increasing ? opacity[0] : opacity.at(-1);
    expect(nightEnd).toBe(1); expect(daylightEnd).toBe(0);
    expect(opacity.some(value => value > 0.03 && value < 1)).toBe(true);
  });
  it.each([76, 40000])('retains visible night stars at altitude%s', async altitude => {
    const hooks = await mountFlight(true);
    Object.assign(hooks.flightRef.current, { altitude, onGround: altitude === 76, speed: 0 });
    setSolarHour(hooks, 22); await draw();
    const stars = renderedStarField();
    expect(stars.material.opacity).toBe(1); expect(stars.visible).toBe(true);
  });
});
