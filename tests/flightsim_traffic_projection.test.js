import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, commands, refs, hooks, hud, viewport, originLat;
const radians = value => value * Math.PI / 180;
const viewports = [{ width: 320, height: 763 }, { width: 1280, height: 720 }];

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

function captureCanvas() {
  commands = []; const saved = []; let matrix = [1, 0, 0, 1, 0, 0];
  function multiply([g, h, i, j, k, l]) {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f];
  }
  const target = { globalAlpha: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return (...args) => {
        commands.push({ method: property, args, matrix: [...matrix], fill: object.fillStyle, stroke: object.strokeStyle, depth: saved.length });
        if (property === 'save') saved.push({ matrix: [...matrix], fill: object.fillStyle, stroke: object.strokeStyle, alpha: object.globalAlpha });
        else if (property === 'restore' && saved.length) {
          const previous = saved.pop(); matrix = previous.matrix; object.fillStyle = previous.fill; object.strokeStyle = previous.stroke; object.globalAlpha = previous.alpha;
        } else if (property === 'translate') multiply([1, 0, 0, 1, args[0], args[1]]);
        else if (property === 'rotate') multiply([Math.cos(args[0]), Math.sin(args[0]), -Math.sin(args[0]), Math.cos(args[0]), 0, 0]);
        else if (property === 'scale') multiply([args[0], 0, 0, args[1], 0, 0]);
        else if (property === 'setTransform') matrix = args.length === 6 ? [...args] : [1, 0, 0, 1, 0, 0];
        else if (property === 'resetTransform') matrix = [1, 0, 0, 1, 0, 0];
      };
    }, set(object, property, value) { object[property] = value; return true; }
  });
}
function resize(width, height) {
  viewport = { width, height };
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
}
async function mountFlight({ webgl = false, chase = false, width = 1280, height = 720, pitch = 0, bank = 0, flight = {} } = {}) {
  vi.useFakeTimers(); wallTime = 1000; frameCallback = null; refs = new Set();
  const context = captureCanvas(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } }; else delete window.THREE;
  // Capture existing refs through the supplied React context. Production gains
  // no new hook/API, and the traffic painter and animation loop remain intact.
  const observedReact = { ...React, useRef(initial) { const ref = React.useRef(initial); refs.add(ref); return ref; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', thirdPerson: chase,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    setData = updateData;
    return tool.render(makeCtx({ React: observedReact, toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 5000, fieldElev: 76,
    speed: 150, vsi: 0, heading: 35, onGround: false, ...flight }); originLat = hooks.flightRef.current.lat;
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch, bank, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.timeRef.current = 10; hooks.pausedRef.current = true; resize(width, height);
  await frame();
  const captured = [...refs].filter(ref => ref.current?.flightView && ref.current?.canvasWorldView && ref.current?.telemetry);
  expect(captured).toHaveLength(1); hud = captured[0].current;
}
async function frame({ repaint = false } = {}) {
  if (repaint) resize(viewport.width + (viewport.width % 2 ? -1 : 1), viewport.height);
  commands.length = 0; wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
}
function targetFromBearing(bearing, distanceNm = 3, heightOffset = 200) {
  const state = hooks.flightRef.current, distanceFt = distanceNm * 6076.12;
  return { lat: state.lat + Math.cos(radians(bearing)) * distanceFt / 364800,
    lon: state.lon + Math.sin(radians(bearing)) * distanceFt / (364800 * Math.cos(radians(originLat))),
    alt: state.altitude + heightOffset };
}
function seedTraffic(target, patch = {}) {
  hud._xtraffic = { speedKts: 0, heading: hooks.flightRef.current.heading + 90,
    spawnedAt: hooks.timeRef.current, called: true, callTxt: null, calledAt: -100, ...target, ...patch };
}
function trafficPaint() {
  return commands.filter(command => command.method === 'fillRect' && command.fill === 'rgba(40,45,55,0.9)');
}
function actualCentre() {
  const body = trafficPaint()[0]; expect(body).toBeTruthy();
  // The fuselage rectangle is centred at local0/0, including its own track
  // rotation. Its captured affine translation is the visible screen centre.
  return { x: body.matrix[4], y: body.matrix[5], body };
}
function independentCamera(webgl, chase = false) {
  const { width, height } = viewport, state = hooks.flightRef.current, controls = hooks.controlsRef.current;
  if (webgl) {
    expect(renderer.render).toHaveBeenCalled(); return renderer.render.mock.calls.at(-1)[1];
  }
  const camera = new Three.PerspectiveCamera(60, width / height, 10, 300000);
  camera.position.set(0, state.altitude + 6, 0);
  const pitch = chase ? controls.pitch * 0.5 - 12 : controls.pitch, bank = controls.bank * (chase ? 0.35 : 1);
  camera.quaternion.setFromEuler(new Three.Euler(radians(pitch), -radians(state.heading), -radians(bank), 'YXZ'));
  camera.updateMatrixWorld(true); return camera;
}
function independentProjection(target, webgl, chase = false) {
  const state = hooks.flightRef.current, camera = independentCamera(webgl, chase);
  // Independent geographic conversion; Three does the camera projection.
  let longitude = target.lon - state.lon;
  while (longitude > 180) longitude -= 360; while (longitude < -180) longitude += 360;
  const east = longitude * 364800 * Math.cos(radians(originLat)), south = -(target.lat - state.lat) * 364800;
  let position;
  if (webgl) {
    const [scene] = renderer.render.mock.calls.at(-1), aircraft = scene.children.find(item => item.userData.type === 'cessna172');
    expect(aircraft).toBeTruthy();
    position = aircraft.position.clone().add(new Three.Vector3(east, target.alt - state.altitude - aircraft.userData.groundDatumOffset, south));
  } else position = new Three.Vector3(east, target.alt, south);
  const viewPoint = position.clone().applyMatrix4(camera.matrixWorldInverse);
  const projected = position.project(camera);
  return { x: (projected.x + 1) * viewport.width / 2, y: (1 - projected.y) * viewport.height / 2, depth: -viewPoint.z };
}
function expectProjected(target, webgl, chase = false) {
  const expected = independentProjection(target, webgl, chase), actual = actualCentre();
  expect(expected.depth).toBeGreaterThan(0);
  expect(actual.x).toBeCloseTo(expected.x, 5); expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(trafficPaint()).toHaveLength(3); return { expected, actual };
}

describe('production converging traffic uses the scenery camera', () => {
  it.each(viewports.flatMap(view => [false, true].flatMap(webgl => [false, true].map(chase => ({ ...view, webgl, chase })))))(
    'matches independent camera at $width×$height, WebGL $webgl, chase $chase', async ({ width, height, webgl, chase }) => {
      await mountFlight({ width, height, webgl, chase, pitch: 10, bank: 30 });
      const target = targetFromBearing(hooks.flightRef.current.heading + 4); seedTraffic(target); await frame({ repaint: true });
      expectProjected(target, webgl, chase);
    });
  it.each([false, true])('omits a target25degrees right on a narrow phone (WebGL %s)', async webgl => {
    await mountFlight({ webgl, width: 320, height: 763 });
    const target = targetFromBearing(hooks.flightRef.current.heading + 25, 3, 0); seedTraffic(target); await frame({ repaint: true });
    expect(independentProjection(target, webgl).x).toBeGreaterThan(viewport.width + 100); expect(trafficPaint()).toHaveLength(0);
  });
  it.each([false, true])('culls rear, side and vertically offscreen traffic rather than clamping it to the horizon (WebGL %s)', async webgl => {
    await mountFlight({ webgl });
    for (const [bearingOffset, heightOffset] of [[180, 0], [70, 0], [0, 20000], [0, -20000]]) {
      const target = targetFromBearing(hooks.flightRef.current.heading + bearingOffset, 1, heightOffset);
      seedTraffic(target); await frame({ repaint: true }); expect(trafficPaint()).toHaveLength(0);
    }
  });
  it.each([false, true])('omits malformed traffic coordinates without interrupting the flight frame (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); const valid = targetFromBearing(hooks.flightRef.current.heading);
    for (const patch of [{ lat: NaN }, { lon: Infinity }, { alt: NaN }]) {
      seedTraffic({ ...valid, ...patch }); await frame({ repaint: true }); expect(trafficPaint()).toHaveLength(0);
      expect(commands.some(command => command.method === 'fillText' && command.args[0] === 'IAS')).toBe(true);
    }
  });
  it.each([false, true])('projects across the dateline using the nearby longitude branch (WebGL %s)', async webgl => {
    await mountFlight({ webgl, flight: { lat: 0, lon: 179.99, heading: 90 } });
    const target = { lat: 0, lon: -179.99, alt: 5200 }; seedTraffic(target); await frame({ repaint: true });
    const { expected } = expectProjected(target, webgl); expect(expected.x).toBeGreaterThan(0); expect(expected.x).toBeLessThan(viewport.width);
    expect(hud._xtraffic).not.toBeNull();
  });
  it.each([35, -35])('preserves the original focal length through a padded Canvas roll at bank %s', async bank => {
    await mountFlight({ webgl: false, width: 320, height: 763, pitch: 10, bank });
    const target = targetFromBearing(hooks.flightRef.current.heading + 3, 3, 150); seedTraffic(target); await frame({ repaint: true });
    const { actual } = expectProjected(target, false);
    expect(Math.abs(actual.body.matrix[1])).toBeGreaterThan(0.1);
    const paddedSky = commands.find(command => command.method === 'fillRect' && command.args[0] === 0 && command.args[1] === 0
      && command.args[2] > viewport.width && Math.abs(command.matrix[1]) > 0.1);
    expect(paddedSky).toBeTruthy();
    expect(paddedSky.args[3]).not.toBe(viewport.height);
  });
  it('uses the smoothed WebGL chase camera instead of assuming its heading matches the aircraft', async () => {
    await mountFlight({ webgl: true, chase: true, pitch: 7, bank: 25 });
    const target = targetFromBearing(hooks.flightRef.current.heading + 3); seedTraffic(target); await frame({ repaint: true });
    expectProjected(target, true, true);
    hooks.flightRef.current.heading += 15; // The held chase camera retains its eye despite the changed aircraft heading.
    await frame({ repaint: true }); expectProjected(target, true, true);
  });
  it.each([false, true])('reprojects paused traffic after resize without advancing traffic, flight or evidence (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); const target = targetFromBearing(hooks.flightRef.current.heading + 4); seedTraffic(target); await frame({ repaint: true });
    expectProjected(target, webgl); const before = { state: JSON.stringify(hooks.flightRef.current), controls: JSON.stringify(hooks.controlsRef.current),
      evidence: JSON.stringify(hooks.getLogRef().current), traffic: JSON.stringify(hud._xtraffic), time: hooks.timeRef.current };
    resize(320, 763); await frame(); expectProjected(target, webgl);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(before.state); expect(JSON.stringify(hooks.controlsRef.current)).toBe(before.controls);
    expect(JSON.stringify(hooks.getLogRef().current)).toBe(before.evidence); expect(JSON.stringify(hud._xtraffic)).toBe(before.traffic);
    expect(hooks.timeRef.current).toBe(before.time); await frame();
    // The held loop normalizes the DPR transform before returning; it must not paint.
    expect(commands).toEqual([expect.objectContaining({ method: 'setTransform', args: [1, 0, 0, 1, 0, 0] })]);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(before.state); expect(JSON.stringify(hooks.controlsRef.current)).toBe(before.controls);
    expect(JSON.stringify(hooks.getLogRef().current)).toBe(before.evidence); expect(JSON.stringify(hud._xtraffic)).toBe(before.traffic);
    expect(hooks.timeRef.current).toBe(before.time);
  });
  it('retains the existing traffic callout and minimap blip while moving only the world silhouette', async () => {
    await mountFlight({ webgl: true }); const target = targetFromBearing(hooks.flightRef.current.heading + 3, 1);
    const message = "TRAFFIC — 12 o'clock, 1 mile, similar altitude";
    seedTraffic(target, { callTxt: message, calledAt: hooks.timeRef.current }); await frame({ repaint: true }); expectProjected(target, true);
    expect(commands.some(command => command.method === 'fillText' && command.args[0] === message)).toBe(true);
    expect(commands.some(command => command.method === 'fillRect' && command.fill === 'rgba(251,191,36,0.95)' && command.args[2] === 4.4)).toBe(true);
  });
});
