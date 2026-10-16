import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const vendorContext = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendorContext);
const Three = vendorContext.THREE;
let tool, host, root, latest, frameCallback, context, errors, warnings, wallTime;
const hooks = () => window.__testHooks.flightSim;
const status = () => host.querySelector('[aria-label="Flight visual status"]');
async function mount(three, seed = {}) {
  window.THREE = three;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await act(async () => hooks().startFlightChallenge('energy_management'));
}
async function frame(elapsed = 100) {
  wallTime += elapsed;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
async function click(text) {
  const button = [...host.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
// The sky paints inside the padded, banked world pass. Corner coverage is
// checked in the weather atmosphere integration suite; here we witness its paint.
const hasCanvasSkyPaint = () => context.fillRect.mock.calls.some((args, index) => {
  const paint = context.fillRect.mock.results[index].value;
  return args[0] === 0 && args[1] === 0 && args[2] > 0 && args[3] > 0 &&
    paint?.kind === 'linear' && paint.stops.length === 17 &&
    paint.stops[0][0] === 0 && paint.stops[16][0] === 1 &&
    paint.stops.every(([offset, color]) => offset >= 0 && offset <= 1 && /^rgb\(/.test(color));
});
function workingRenderer() {
  let pixelRatio = 1;
  const renderer = {
    domElement: { width: 800, height: 500 }, shadowMap: {},
    capabilities: { getMaxAnisotropy: () => 1 },
    setSize: vi.fn((width, height) => { renderer.domElement.width = Math.round(width * pixelRatio); renderer.domElement.height = Math.round(height * pixelRatio); }),
    setPixelRatio: vi.fn(value => { pixelRatio = value; }), render: vi.fn(), dispose: vi.fn(),
    getContext: vi.fn(() => ({ isContextLost: () => false })),
  };
  return renderer;
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ kind: 'linear', stops: [], addColorStop(offset, color) { this.stops.push([offset, color]); } }),
    createRadialGradient: () => ({ kind: 'radial', addColorStop() {} }), fillRect: vi.fn(() => context.fillStyle),
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  }, { get: (target, property) => property in target ? target[property] : () => {}, set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000; vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__testHooks; delete window.THREE; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool WebGL failure fallback', () => {
  it('tries unsupported context creation once per flight and keeps Canvas flight evidence and pause working', async () => {
    const WebGLRenderer = vi.fn(function() { throw new Error('Error creating WebGL context'); });
    await mount({ WebGLRenderer });
    expect(status().textContent).toContain('Canvas');
    await frame();
    expect(WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(status().textContent).not.toContain('3D terrain');
    const start = hooks().flightRef.current.lon;
    for (let index = 0; index < 25; index++) await frame();
    expect(WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
    expect(hooks().flightRef.current.lon).not.toBe(start);
    expect(hooks().timeRef.current).toBeGreaterThan(2);
    await click('⏸ Pause');
    const pausedTime = hooks().timeRef.current;
    await frame(); await frame();
    expect(hooks().timeRef.current).toBe(pausedTime);
    await click('End challenge');
    expect(latest.lastDebrief.samples.length).toBeGreaterThan(0);
    await click('Retry challenge');
    await frame(); await frame();
    expect(WebGLRenderer).toHaveBeenCalledTimes(2);
    expect(warnings).toHaveBeenCalledTimes(2);
    expect(status().textContent).toContain('Canvas');
  });

  it('disposes partial initialization and paints Canvas in the same failing frame', async () => {
    const renderer = workingRenderer();
    const WebGLRenderer = vi.fn(function() { return renderer; });
    await mount({ ...Three, WebGLRenderer, Scene: function() { throw new Error('Scene initialization failed'); } });
    await frame();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(hasCanvasSkyPaint()).toBe(true);
    await frame(); await frame();
    expect(WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(status().textContent).toContain('Canvas');
  });

  it.each(['setSize', 'setPixelRatio'])('disposes a created renderer when %s setup fails', async method => {
    const renderer = workingRenderer();
    renderer[method].mockImplementation(() => { throw new Error('Renderer setup failed'); });
    const WebGLRenderer = vi.fn(function() { return renderer; });
    await mount({ ...Three, WebGLRenderer });
    await frame(); await frame();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(status().textContent).toContain('Canvas');
  });

  it('shows 3D only after a successful frame and recovers from a later render failure once', async () => {
    const renderer = workingRenderer();
    const WebGLRenderer = vi.fn(function() { return renderer; });
    await mount({ ...Three, WebGLRenderer });
    expect(status().textContent).toContain('Canvas');
    await frame();
    expect(warnings.mock.calls).toEqual([]);
    expect(renderer.render).toHaveBeenCalled();
    expect(status().textContent).toContain('3D terrain');
    expect(hasCanvasSkyPaint()).toBe(false);
    renderer.render.mockImplementation(() => { throw new Error('GPU render failed'); });
    context.fillRect.mockClear();
    await frame();
    expect(status().textContent).toContain('Canvas');
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    const renderCalls = renderer.render.mock.calls.length;
    await frame(); await frame();
    expect(renderer.render).toHaveBeenCalledTimes(renderCalls);
    expect(WebGLRenderer).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it('recognizes a lost context before treating its invisible render as successful', async () => {
    const renderer = workingRenderer();
    await mount({ ...Three, WebGLRenderer: function() { return renderer; } });
    await frame();
    renderer.getContext.mockReturnValue({ isContextLost: () => true });
    context.fillRect.mockClear();
    await frame();
    expect(status().textContent).toContain('Canvas');
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenCalledTimes(1);
  });

  it('falls back when the context becomes lost during an otherwise normal render call', async () => {
    const renderer = workingRenderer();
    const gl = { isContextLost: vi.fn(() => false) };
    renderer.getContext.mockReturnValue(gl);
    renderer.render.mockImplementation(() => { gl.isContextLost.mockReturnValue(true); });
    await mount({ ...Three, WebGLRenderer: function() { return renderer; } });
    await frame();
    expect(renderer.render).toHaveBeenCalledTimes(1);
    expect(status().textContent).toContain('Canvas');
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenCalledTimes(1);
  });

  it.each(['lost', 'unreadable'])('repaints Canvas for a %s context in a held paused frame without advancing the flight', async failure => {
    const renderer = workingRenderer();
    await mount({ ...Three, WebGLRenderer: function() { return renderer; } });
    await frame();
    hooks().controlsRef.current.pitch = 6;
    hooks().controlsRef.current.bank = 8;
    await click('⏸ Pause'); await frame(); await frame();
    const pausedTime = hooks().timeRef.current;
    const pausedFlight = { ...hooks().flightRef.current };
    const pausedControls = { ...hooks().controlsRef.current };
    const pausedPractice = JSON.parse(JSON.stringify(hooks().getLogRef().current));
    const pausedChallenge = JSON.parse(JSON.stringify(latest.flightChallenge));
    if (failure === 'unreadable') renderer.getContext.mockImplementation(() => { throw new Error('Context unavailable'); });
    else renderer.getContext.mockReturnValue({ isContextLost: () => true });
    context.fillRect.mockClear();
    await frame();
    expect(hooks().timeRef.current).toBe(pausedTime);
    expect(hooks().flightRef.current).toMatchObject({ lat: pausedFlight.lat, lon: pausedFlight.lon, altitude: pausedFlight.altitude });
    expect(hooks().controlsRef.current).toEqual(pausedControls);
    expect(hooks().getLogRef().current).toEqual(pausedPractice);
    expect(latest.flightChallenge).toEqual(pausedChallenge);
    expect(status().textContent).toContain('Canvas');
    expect(hasCanvasSkyPaint()).toBe(true);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(warnings).toHaveBeenCalledTimes(1);
    const fills = context.fillRect.mock.calls.length;
    await frame(); await frame();
    expect(context.fillRect.mock.calls.length).toBe(fills);
  });
});

function setViewport(width, height) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  }
}

describe('SkySchool viewport and chase camera rendering', () => {
  it('sizes HiDPI backing pixels once and updates renderer and bloom only when CSS size or DPR changes', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const renderer = workingRenderer();
    await mount({ ...Three, WebGLRenderer: function() { return renderer; } });
    await frame(); await frame(); await frame();
    expect(renderer.domElement).toEqual({ width: 1600, height: 1000 });
    expect(renderer.setSize).toHaveBeenCalledTimes(1);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(1);
    const composer = { setSize: vi.fn(), setPixelRatio: vi.fn(), render: vi.fn(), passes: [] };
    renderer._alloComposer = composer;
    setViewport(640, 360);
    await frame(); await frame();
    expect(renderer.setSize).toHaveBeenCalledTimes(2);
    expect(renderer.setSize).toHaveBeenLastCalledWith(640, 360, false);
    expect(composer.setSize).toHaveBeenCalledTimes(1);
    expect(composer.setSize).toHaveBeenLastCalledWith(640, 360);
    expect(composer.setPixelRatio).not.toHaveBeenCalled();
    vi.stubGlobal('devicePixelRatio', 1.5);
    await frame(); await frame();
    expect(renderer.domElement).toEqual({ width: 960, height: 540 });
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1.5);
    expect(renderer.setPixelRatio).toHaveBeenCalledTimes(2);
    expect(renderer.setSize).toHaveBeenCalledTimes(3);
    expect(composer.setPixelRatio).toHaveBeenCalledOnce();
    expect(composer.setPixelRatio).toHaveBeenLastCalledWith(1.5);
    expect(composer.setSize).toHaveBeenCalledTimes(2);
    expect(errors).not.toHaveBeenCalled();
  });

  it.each(['Canvas', 'WebGL'])('repaints a held %s frame once after viewport and DPR changes without advancing state, controls or evidence', async mode => {
    const renderer = workingRenderer();
    const WebGLRenderer = mode === 'Canvas' ? function() { throw new Error('No WebGL'); } : function() { return renderer; };
    await mount({ ...Three, WebGLRenderer }, { thirdPerson: true });
    await frame();
    hooks().controlsRef.current.pitch = 6;
    hooks().controlsRef.current.bank = 8;
    await click('⏸ Pause'); await frame(); await frame();
    const pausedTime = hooks().timeRef.current;
    const pausedFlight = JSON.stringify(hooks().flightRef.current);
    const pausedControls = { ...hooks().controlsRef.current };
    const pausedPractice = JSON.stringify(hooks().getLogRef().current);
    const pausedChallenge = JSON.stringify(latest.flightChallenge);
    const renders = renderer.render.mock.calls.length;
    context.fillRect.mockClear();
    setViewport(640, 360);
    vi.stubGlobal('devicePixelRatio', 2);
    await frame();
    const canvas = host.querySelector('canvas[role="application"]');
    expect(canvas.width).toBe(1280); expect(canvas.height).toBe(720);
    expect(context.fillRect.mock.calls.some(args => args[0] === 0 && args[1] === 0 && args[2] === 640 && args[3] === 360)).toBe(true);
    expect(hooks().timeRef.current).toBe(pausedTime);
    expect(JSON.stringify(hooks().flightRef.current)).toBe(pausedFlight);
    expect(hooks().controlsRef.current).toEqual(pausedControls);
    expect(JSON.stringify(hooks().getLogRef().current)).toBe(pausedPractice);
    expect(JSON.stringify(latest.flightChallenge)).toBe(pausedChallenge);
    if (mode === 'WebGL') expect(renderer.render).toHaveBeenCalledTimes(renders + 1);
    const fills = context.fillRect.mock.calls.length;
    await frame(); await frame();
    expect(context.fillRect.mock.calls.length).toBe(fills);
    if (mode === 'WebGL') expect(renderer.render).toHaveBeenCalledTimes(renders + 1);
    expect(errors).not.toHaveBeenCalled();
  });

  it('places the first parked chase camera above the airport instead of lerping from underground', async () => {
    const renderer = workingRenderer();
    await mount({ ...Three, WebGLRenderer: function() { return renderer; } }, { thirdPerson: true });
    Object.assign(hooks().flightRef.current, { altitude: 77, fieldElev: 77, vsi: 0, speed: 0, onGround: true });
    Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, throttle: 0 });
    await frame();
    const camera = renderer.render.mock.calls[0][1];
    expect(camera.position.y).toBeGreaterThanOrEqual(hooks().flightRef.current.fieldElev + 6);
    const aircraft = renderer.render.mock.calls[0][0].children.find(item => item.userData.type === 'cessna172');
    const chaseDistance = window.__RR_TEST_EXPORTS__.flightSim.getChaseCameraDistance(aircraft.userData.visualRadius, camera.aspect, camera.fov, camera.near);
    // First-frame placement is immediate, with room for the near-plane footprint.
    const firstEyeHeight = Math.max(aircraft.position.y + chaseDistance * 8 / 30,
      hooks().flightRef.current.fieldElev + camera.near * 2);
    expect(camera.position.y).toBeCloseTo(firstEyeHeight, 5);
    camera.updateMatrixWorld(true);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const corner = new Three.Vector3(sx, sy, -1).unproject(camera);
      expect(corner.y).toBeGreaterThan(hooks().flightRef.current.fieldElev);
    }
    expect(Math.hypot(camera.position.x, camera.position.z)).toBeCloseTo(chaseDistance, 5);
    const parkedBounds = new Three.Box3().setFromObject(aircraft);
    expect(parkedBounds.min.y).toBeGreaterThanOrEqual(hooks().flightRef.current.fieldElev + 2 - 1e-6);
    const groundDatumOffset = aircraft.position.y - hooks().flightRef.current.altitude;
    expect(groundDatumOffset).toBeGreaterThan(2);
    Object.assign(hooks().flightRef.current, { altitude: 1000, onGround: false, vsi: 0, speed: 220 });
    await frame();
    expect(aircraft.position.y - hooks().flightRef.current.altitude).toBeCloseTo(groundDatumOffset, 5);
    await click('⏸ Pause'); await frame();
    const heldPosition = camera.position.clone();
    setViewport(500, 400); await frame();
    // Both sizes remain limited by vertical FOV, so framing stays steady.
    expect(camera.position.toArray()).toEqual(heldPosition.toArray());
    const resizeDistance = window.__RR_TEST_EXPORTS__.flightSim.getChaseCameraDistance(aircraft.userData.visualRadius, camera.aspect, camera.fov, camera.near);
    expect(camera.position.distanceTo(aircraft.position)).toBeGreaterThanOrEqual(resizeDistance);
    const resizedPosition = camera.position.clone();
    await frame();
    expect(camera.position.toArray()).toEqual(resizedPosition.toArray());
    expect(errors).not.toHaveBeenCalled();
  });
});
