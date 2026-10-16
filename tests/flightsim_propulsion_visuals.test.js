import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, commands, hooks, viewport, reducedMotion, motionListeners;
const KTS_PER_FPS = 0.5924838;
const aircraftIds = ['cessna172', 'boeing737', 'glider', 'f16', 'sr71', 'rescue_heli', 'drone'];
const supportedJets = new Set(['boeing737', 'f16', 'sr71']);

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
function resize(width, height) {
  viewport = { width, height };
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true });
  }
}
function captureCanvas() {
  commands = []; const saved = []; let matrix = [1, 0, 0, 1, 0, 0], path = [];
  function multiply([g, h, i, j, k, l]) {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a*g+c*h, b*g+d*h, a*i+c*j, b*i+d*j, a*k+c*l+e, b*k+d*l+f];
  }
  const target = { globalAlpha: 1,
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: (...args) => ({ kind: 'linear', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: (...args) => ({ kind: 'radial', args, stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return (...args) => {
        commands.push({ method: property, args, path: path.map(part => ({ method: part.method, args: [...part.args] })),
          matrix: [...matrix], fill: object.fillStyle, stroke: object.strokeStyle, alpha: object.globalAlpha });
        if (property === 'beginPath') path = [];
        else if (['moveTo', 'lineTo', 'arc', 'ellipse', 'rect'].includes(property)) path.push({ method: property, args });
        else if (property === 'save') saved.push({ matrix: [...matrix], fill: object.fillStyle, stroke: object.strokeStyle, alpha: object.globalAlpha });
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
async function mountFlight({ webgl = false, aircraft = 'boeing737', chase = true, motion = false, width = 1280, height = 720 } = {}) {
  vi.useFakeTimers(); wallTime = 1000; frameCallback = null; reducedMotion = motion; motionListeners = new Set();
  const context = captureCanvas(); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: query.includes('prefers-reduced-motion') && reducedMotion,
    addEventListener(type, listener) { if (type === 'change' && query.includes('prefers-reduced-motion')) motionListeners.add(listener); },
    removeEventListener(type, listener) { motionListeners.delete(listener); } }));
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  if (webgl) window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } }; else delete window.THREE;
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft, thirdPerson: chase,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } }); setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, value) => updateData(old => ({ ...old, [id]: { ...old[id], ...value } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  hooks = window.__testHooks.flightSim; resize(width, height);
  Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 33000, fieldElev: 76,
    speed: 300 / KTS_PER_FPS, vsi: 0, heading: 90, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.7, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  setSolarHour(12); hooks.pausedRef.current = true;
}
function setSolarHour(hour) { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; }
async function frame({ repaint = true } = {}) {
  if (repaint) resize(viewport.width + (viewport.width % 2 ? -1 : 1), viewport.height);
  commands.length = 0; wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback()); expect(errors).not.toHaveBeenCalled();
}
async function updateData(patch) {
  await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } })));
}
function scene() { expect(renderer.render).toHaveBeenCalled(); return renderer.render.mock.calls.at(-1)[0]; }
function airframe(id) { const aircraft = scene().children.find(item => item.userData.type === id); expect(aircraft).toBeTruthy(); return aircraft; }
function ownWebGLTrail() {
  const trail = scene().children.find(item => item.isMesh && item.geometry?.type === 'BoxGeometry'
    && item.geometry.parameters.width === 70 && item.geometry.parameters.height === 70 && item.geometry.parameters.depth === 9000);
  expect(trail).toBeTruthy(); return trail;
}
function atSprite(command) {
  return Math.abs(command.matrix[4] - viewport.width / 2) < 1e-7 && Math.abs(command.matrix[5] - viewport.height * 0.6) < 1e-7;
}
function canvasTrails() {
  return commands.filter(command => command.method === 'stroke' && atSprite(command)
    && command.stroke?.kind === 'linear' && command.stroke.stops.some(([offset, color]) => offset === 0 && color.startsWith('rgba(255,255,255,'))
    && command.path[0]?.method === 'moveTo' && command.path[0].args[0] >= 20 && command.path[0].args[0] <= 40
    && command.path.some(part => part.method === 'lineTo' && part.args[0] > 100));
}
function canvasProps() {
  return commands.filter(command => command.method === 'fill' && atSprite(command)
    && command.path.some(part => part.method === 'arc' && Math.abs(part.args[0]) === 30 && part.args[1] === 0 && part.args[2] === 1.5));
}
function canvasGlows() {
  return commands.filter(command => command.method === 'fillRect' && atSprite(command)
    && command.fill?.kind === 'radial' && command.fill.stops.some(([, color]) => color.startsWith('rgba(251,191,36,')));
}
function assertTrailVisible(webgl, expected) {
  if (webgl) { expect(ownWebGLTrail().visible).toBe(expected); if (expected) expect(ownWebGLTrail().material.opacity).toBeGreaterThan(0); }
  else expect(canvasTrails().length > 0).toBe(expected);
}
function observedOpacity(webgl) {
  if (webgl) return ownWebGLTrail().material.opacity;
  const paint = canvasTrails()[0]; expect(paint).toBeTruthy();
  const color = paint.stroke.stops.find(([offset]) => offset === 0)[1]; return Number(color.slice(color.lastIndexOf(',') + 1, -1));
}

// High-altitude poses are held test fixtures, including for aircraft that would
// not normally reach that envelope. They ensure cosmetic eligibility does not
// depend accidentally on flight-limit enforcement elsewhere in the product.
describe('own high-altitude jet trails in both production renderers', () => {
  it.each(aircraftIds.flatMap(aircraft => [false, true].map(webgl => ({ aircraft, webgl }))))(
    'uses actual propulsion for $aircraft with WebGL $webgl', async ({ aircraft, webgl }) => {
      await mountFlight({ aircraft, webgl }); await frame(); assertTrailVisible(webgl, supportedJets.has(aircraft));
      if (!webgl) {
        expect(canvasProps()).toHaveLength(aircraft === 'cessna172' ? 1 : 0);
        expect(canvasGlows()).toHaveLength(0);
      } else expect(airframe(aircraft).userData.type).toBe(aircraft);
    });
  it.each([false, true])('uses the same speed, altitude, power and airborne boundaries (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); await frame(); assertTrailVisible(webgl, true);
    const initialState = { ...hooks.flightRef.current }, initialControls = { ...hooks.controlsRef.current };
    for (const [statePatch, controlPatch, expected] of [
      [{ altitude: 25000 }, {}, false], [{ altitude: 25000.01 }, {}, true],
      [{ speed: 200 / KTS_PER_FPS }, {}, false], [{ speed: 200.001 / KTS_PER_FPS }, {}, true],
      [{ speed: 0 }, {}, false], [{}, { throttle: 0 }, false], [{}, { throttle: 0.05 }, false],
      [{}, { throttle: 0.050001 }, true], [{ onGround: true }, {}, false],
    ]) {
      Object.assign(hooks.flightRef.current, initialState, statePatch); Object.assign(hooks.controlsRef.current, initialControls, controlPatch);
      await frame(); assertTrailVisible(webgl, expected);
    }
  });
  it.each([false, true])('requires positive supported jet thrust rather than only an engine label (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); await frame(); assertTrailVisible(webgl, true);
    const aircraft = api.AIRCRAFT.find(candidate => candidate.id === 'boeing737'), savedThrust = aircraft.maxThrust;
    try {
      for (const maxThrust of [0, -1, NaN]) { aircraft.maxThrust = maxThrust; await frame(); assertTrailVisible(webgl, false); }
      aircraft.maxThrust = savedThrust; await frame(); assertTrailVisible(webgl, true);
    } finally { aircraft.maxThrust = savedThrust; }
  });
  it.each([false, true])('switches aircraft and camera without leaving a stale trail (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); await frame(); assertTrailVisible(webgl, true);
    await updateData({ aircraft: 'glider' }); await frame(); assertTrailVisible(webgl, false);
    await updateData({ aircraft: 'f16' }); await frame(); assertTrailVisible(webgl, true);
    await updateData({ thirdPerson: false }); await frame(); assertTrailVisible(webgl, false);
    await updateData({ thirdPerson: true }); await frame(); assertTrailVisible(webgl, true);
  });
  it.each([false, true])('honors reduced motion and the shared quality budget (WebGL %s)', async webgl => {
    await mountFlight({ webgl, motion: true }); await frame(); assertTrailVisible(webgl, false);
    reducedMotion = false; motionListeners.forEach(listener => listener({ matches: false })); await frame(); assertTrailVisible(webgl, true);
    hooks.qualityRef.current.tier = 2; await frame(); assertTrailVisible(webgl, false);
    hooks.qualityRef.current.tier = 1; await frame(); assertTrailVisible(webgl, true);
    reducedMotion = true; motionListeners.forEach(listener => listener({ matches: true })); await frame(); assertTrailVisible(webgl, false);
  });
  it.each([false, true])('retains the altitude/night fade and repaints without advancing a paused flight (WebGL %s)', async webgl => {
    await mountFlight({ webgl }); await frame(); const daylightOpacity = observedOpacity(webgl);
    setSolarHour(0); await frame(); assertTrailVisible(webgl, true); expect(observedOpacity(webgl)).toBeLessThan(daylightOpacity);
    setSolarHour(12); hooks.flightRef.current.altitude = 26000; await frame(); expect(observedOpacity(webgl)).toBeLessThan(daylightOpacity);
    hooks.flightRef.current.altitude = 33000; await frame(); expect(observedOpacity(webgl)).toBeCloseTo(daylightOpacity, 10);
    const before = { state: JSON.stringify(hooks.flightRef.current), controls: JSON.stringify(hooks.controlsRef.current),
      evidence: JSON.stringify(hooks.getLogRef().current), time: hooks.timeRef.current };
    resize(320, 763); await frame({ repaint: false }); assertTrailVisible(webgl, true);
    expect(JSON.stringify(hooks.flightRef.current)).toBe(before.state); expect(JSON.stringify(hooks.controlsRef.current)).toBe(before.controls);
    expect(JSON.stringify(hooks.getLogRef().current)).toBe(before.evidence); expect(hooks.timeRef.current).toBe(before.time);
    await frame({ repaint: false });
    expect(commands.every(command => command.method === 'setTransform')).toBe(true); expect(hooks.timeRef.current).toBe(before.time);
  });
  it.each([{ width: 320, height: 763 }, { width: 1280, height: 720 }])(
    'attaches Canvas trails behind the sprite and paints them before primary instruments at $width×$height', async ({ width, height }) => {
      await mountFlight({ webgl: false, width, height }); await frame(); const trails = canvasTrails(); expect(trails.length).toBeGreaterThan(0);
      const bodyIndex = commands.findIndex(command => command.method === 'fill' && command.fill === '#d1d5db' && atSprite(command));
      const instrumentIndex = commands.findIndex(command => (command.method === 'fillRect' && command.fill === '#1e40af')
        || (command.method === 'fillText' && command.args[0] === 'IAS'));
      expect(bodyIndex).toBeGreaterThan(0); expect(instrumentIndex).toBeGreaterThan(bodyIndex);
      for (const trail of trails) {
        expect(commands.indexOf(trail)).toBeLessThan(bodyIndex); expect(commands.indexOf(trail)).toBeLessThan(instrumentIndex);
        const points = trail.path.filter(part => ['moveTo', 'lineTo'].includes(part.method)).map(part => part.args);
        expect(points[0][0]).toBeGreaterThan(25); // Tail is local x25; the nose/prop is on the negative side.
        for (const [x, y] of points) { expect(x).toBeGreaterThanOrEqual(points[0][0]); expect(Math.abs(y)).toBeLessThanOrEqual(20); }
        expect(points.at(-1)[0]).toBeGreaterThan(points[0][0] + 70);
      }
    });
});

describe('Canvas propeller and afterburner identity', () => {
  it('retains the trainer propeller on the nose side and omits glider props and engine glow', async () => {
    await mountFlight({ aircraft: 'cessna172' }); await frame(); expect(canvasProps()).toHaveLength(1);
    const hub = canvasProps()[0].path.find(part => part.method === 'arc' && part.args[2] === 1.5); expect(hub.args[0]).toBeLessThan(0);
    const blur = commands.find(command => command.method === 'fill' && atSprite(command)
      && command.path.some(part => part.method === 'ellipse' && part.args[0] === hub.args[0] && part.args[2] === 2 && part.args[3] === 8));
    expect(blur).toBeTruthy(); expect(canvasGlows()).toHaveLength(0);
    hooks.controlsRef.current.throttle = 1; await updateData({ aircraft: 'glider' }); await frame();
    expect(canvasProps()).toHaveLength(0); expect(canvasGlows()).toHaveLength(0); expect(canvasTrails()).toHaveLength(0);
  });
  it.each(['f16', 'sr71'])('uses the top power detent for %s Canvas afterburner glow', async aircraft => {
    await mountFlight({ aircraft });
    const opacity = [];
    for (const throttle of [0, 0.85, 0.9, 0.95, 1]) {
      hooks.controlsRef.current.throttle = throttle; await frame(); expect(canvasProps()).toHaveLength(0);
      if (throttle <= 0.85) expect(canvasGlows()).toHaveLength(0);
      else { expect(canvasGlows().length).toBeGreaterThan(0); opacity.push(canvasGlows()[0].fill.stops[0][1]); }
    }
    const alphas = opacity.map(color => Number(color.slice(color.lastIndexOf(',') + 1, -1)));
    expect(alphas[0]).toBeGreaterThan(0); expect(alphas[1]).toBeGreaterThan(alphas[0]); expect(alphas[2]).toBeGreaterThan(alphas[1]);
  });
  it.each(['f16', 'sr71'])('matches %s WebGL flames to the same top power detent and clears idle flames', async aircraft => {
    await mountFlight({ aircraft, webgl: true }); const opacities = [];
    for (const throttle of [0, 0.85, 0.9, 0.95, 1, 0]) {
      hooks.controlsRef.current.throttle = throttle; await frame(); const flames = airframe(aircraft).userData.flames;
      expect(flames).toHaveLength(aircraft === 'f16' ? 1 : 2);
      for (const flame of flames) {
        expect(flame.visible).toBe(throttle > 0.85);
        if (throttle > 0.85) { expect(flame.material.opacity).toBeGreaterThan(0); expect(flame.material.opacity).toBeLessThanOrEqual(0.8); }
      }
      if (throttle > 0.85) opacities.push(flames[0].material.opacity);
    }
    expect(opacities[1]).toBeGreaterThan(opacities[0]); expect(opacities[2]).toBeGreaterThan(opacities[1]);
  });
  it('keeps a powered airliner free of afterburner glow in Canvas', async () => {
    await mountFlight({ aircraft: 'boeing737' }); hooks.controlsRef.current.throttle = 1; await frame();
    expect(canvasGlows()).toHaveLength(0); expect(canvasProps()).toHaveLength(0); assertTrailVisible(false, true);
  });
});
