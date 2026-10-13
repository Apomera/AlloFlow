import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const vendorContext = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendorContext);
const Three = vendorContext.THREE;
let tool, host, root, updateData, frameCallback, wallTime, renderer, errors;
const helpers = () => window.__RR_TEST_EXPORTS__.flightSim;
const hooks = () => window.__testHooks.flightSim;

// Project points on a full sphere, including points behind its centre. Testing
// only an aircraft's width/height at centre depth misses perspective clipping.
function sphereProjection(camera, centre, radius) {
  camera.updateMatrixWorld(true);
  let maxX = 0, maxY = 0, nearestDepth = Infinity;
  for (let latitude = -90; latitude <= 90; latitude += 10) {
    const vertical = latitude * Math.PI / 180;
    for (let longitude = 0; longitude < 360; longitude += 10) {
      const horizontal = longitude * Math.PI / 180;
      const point = new Three.Vector3(
        radius * Math.cos(vertical) * Math.cos(horizontal),
        radius * Math.sin(vertical),
        radius * Math.cos(vertical) * Math.sin(horizontal),
      ).add(centre);
      const viewPoint = point.clone().applyMatrix4(camera.matrixWorldInverse);
      nearestDepth = Math.min(nearestDepth, -viewPoint.z);
      const projected = point.project(camera);
      maxX = Math.max(maxX, Math.abs(projected.x));
      maxY = Math.max(maxY, Math.abs(projected.y));
    }
  }
  return { maxX, maxY, nearestDepth };
}

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks; delete window.THREE;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool chase distance geometry', () => {
  const viewports = [
    { name: 'portrait phone', aspect: 320 / 763 },
    { name: 'portrait tablet', aspect: 768 / 1024 },
    { name: 'desktop', aspect: 1280 / 720 },
    { name: 'wide desktop', aspect: 1920 / 500 },
  ];
  const shapes = [
    { name: 'trainer', radius: 14 },
    { name: 'long wing glider', radius: 18 },
    { name: 'airliner', radius: 27 },
  ];
  it.each(viewports.flatMap(view => shapes.map(shape => ({ ...view, ...shape, label: view.name + ' / ' + shape.name }))))(
    'keeps the entire $label sphere inside both screen axes with margin', ({ aspect, radius }) => {
      const distance = helpers().getChaseCameraDistance(radius, aspect, 60, 10);
      const camera = new Three.PerspectiveCamera(60, aspect, 10, 300000);
      camera.position.set(0, 0, distance);
      camera.lookAt(new Three.Vector3());
      const projected = sphereProjection(camera, new Three.Vector3(), radius);
      expect(projected.maxX).toBeLessThanOrEqual(1 / 1.2 + 1e-6);
      expect(projected.maxY).toBeLessThanOrEqual(1 / 1.2 + 1e-6);
      expect(projected.nearestDepth).toBeGreaterThan(camera.near);
    },
  );

  it('retains a useful minimum distance for small models', () => {
    expect(helpers().getChaseCameraDistance(1, 2, 60, 10)).toBe(30);
    expect(helpers().getChaseCameraDistance(0, 2, 60, 10)).toBe(30);
  });
  it('keeps a large near clipping plane outside the complete model', () => {
    const distance = helpers().getChaseCameraDistance(20, 2, 120, 100);
    expect(distance - 20).toBeGreaterThanOrEqual(102);
  });
  it('moves farther away as the viewport or lens narrows', () => {
    const distance = helpers().getChaseCameraDistance;
    expect(distance(20, 0.4, 60, 10)).toBeGreaterThan(distance(20, 1.6, 60, 10));
    expect(distance(20, 1, 35, 10)).toBeGreaterThan(distance(20, 1, 80, 10));
  });
  it.each([
    [undefined, undefined, undefined, undefined],
    [NaN, NaN, NaN, NaN],
    [Infinity, Infinity, Infinity, Infinity],
    [-Infinity, -Infinity, -Infinity, -Infinity],
    [-20, -1, -60, -10],
    [20, 0, 0, 10],
    [20, 1, 180, 10],
    [20, 1e-12, 1e-12, 10],
  ])('returns finite positive framing for invalid or degenerate inputs %j', (radius, aspect, fov, near) => {
    const distance = helpers().getChaseCameraDistance(radius, aspect, fov, near);
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThanOrEqual(30);
  });
});

function setViewport(width, height) {
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
    Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  }
}
async function mountRenderer(aircraftType, width, height) {
  vi.useFakeTimers();
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false);
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, { get: (target, property) => property in target ? target[property] : () => {}, set: (target, property, value) => { target[property] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  wallTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  frameCallback = null;
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { if (callback.name === 'loop') frameCallback = callback; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  renderer = {
    domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize: vi.fn(), setPixelRatio: vi.fn(), dispose: vi.fn(),
    getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }),
  };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: true, railCollapsed: false } });
    updateData = setData;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
  await act(async () => hooks().startFlightChallenge('energy_management'));
  await act(async () => updateData(old => ({ ...old, flightSim: { ...old.flightSim, aircraft: aircraftType } })));
  Object.assign(hooks().flightRef.current, { altitude: 5000, fieldElev: 77, vsi: 0, heading: 0, onGround: false });
  Object.assign(hooks().controlsRef.current, { pitch: 0, bank: 0, throttle: 0 });
  setViewport(width, height);
}
async function frame() {
  wallTime += 100;
  expect(frameCallback).toBeTypeOf('function');
  await act(async () => frameCallback());
}
function renderedAircraft(type) {
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const aircraft = scene.children.find(item => item.userData.type === type);
  expect(aircraft).toBeTruthy();
  return { aircraft, camera };
}
function expectFramed(aircraft, camera) {
  const radius = aircraft.userData.visualRadius;
  expect(Number.isFinite(radius)).toBe(true);
  expect(radius).toBeGreaterThan(0);
  // Every actual mesh vertex stays inside the stored model sphere regardless
  // of the model's attitude, rather than trusting metadata alone.
  aircraft.traverse(mesh => {
    const positions = mesh.geometry?.attributes?.position;
    if (!positions) return;
    for (let index = 0; index < positions.count; index++) {
      const point = new Three.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
      expect(point.distanceTo(aircraft.position)).toBeLessThanOrEqual(radius + 1e-5);
    }
  });
  const projected = sphereProjection(camera, aircraft.position, radius);
  expect(projected.maxX).toBeLessThan(0.95);
  expect(projected.maxY).toBeLessThan(0.95);
  expect(projected.nearestDepth).toBeGreaterThan(camera.near);
}

describe('SkySchool live model chase framing', () => {
  it.each(['cessna172', 'glider', 'boeing737'].flatMap(type => [
    { type, width: 320, height: 763 },
    { type, width: 1280, height: 720 },
  ]))('frames the full $type model on first render at $width × $height', async ({ type, width, height }) => {
    await mountRenderer(type, width, height);
    await frame();
    const { aircraft, camera } = renderedAircraft(type);
    expectFramed(aircraft, camera);
    const distance = helpers().getChaseCameraDistance(aircraft.userData.visualRadius, camera.aspect, camera.fov, camera.near);
    expect(Math.hypot(camera.position.x - aircraft.position.x, camera.position.z - aircraft.position.z)).toBeCloseTo(distance, 5);
    expect(camera.position.y - aircraft.position.y).toBeCloseTo(distance * 8 / 30, 5);
    expect(errors).not.toHaveBeenCalled();
  });

  it('reframes a paused airliner after narrowing the viewport without moving flight state or evidence', async () => {
    await mountRenderer('boeing737', 1280, 720);
    await frame();
    const pause = [...host.querySelectorAll('button')].find(button => button.textContent.trim() === '⏸ Pause');
    expect(pause).toBeTruthy();
    await act(async () => pause.click());
    await frame(); await frame();
    const { aircraft, camera } = renderedAircraft('boeing737');
    const heldCamera = camera.position.clone();
    const heldAircraft = aircraft.position.clone();
    const heldFlight = JSON.stringify(hooks().flightRef.current);
    const heldControls = JSON.stringify(hooks().controlsRef.current);
    const heldEvidence = JSON.stringify(hooks().getLogRef().current);
    const heldTime = hooks().timeRef.current;
    setViewport(320, 763);
    await frame();
    expect(camera.aspect).toBeCloseTo(320 / 763, 6);
    expect(camera.position.distanceTo(aircraft.position)).toBeGreaterThan(heldCamera.distanceTo(heldAircraft));
    expectFramed(aircraft, camera);
    expect(aircraft.position.toArray()).toEqual(heldAircraft.toArray());
    expect(JSON.stringify(hooks().flightRef.current)).toBe(heldFlight);
    expect(JSON.stringify(hooks().controlsRef.current)).toBe(heldControls);
    expect(JSON.stringify(hooks().getLogRef().current)).toBe(heldEvidence);
    expect(hooks().timeRef.current).toBe(heldTime);
    const resizedCamera = camera.position.clone();
    const renderCount = renderer.render.mock.calls.length;
    await frame(); await frame();
    expect(camera.position.toArray()).toEqual(resizedCamera.toArray());
    expect(renderer.render).toHaveBeenCalledTimes(renderCount);
    expect(errors).not.toHaveBeenCalled();
  });
});
