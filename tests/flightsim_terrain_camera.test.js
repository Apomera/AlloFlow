import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, viewport;
let resizeFlip = false;

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

function rayIntersection(mesh, x, z) {
  mesh.updateMatrixWorld(true);
  const ray = new Three.Raycaster(new Three.Vector3(x, 200000, z), new Three.Vector3(0, -1, 0), 0, 400000);
  return ray.intersectObject(mesh, false)[0] ?? null;
}
function rayHeight(mesh, x, z) { return rayIntersection(mesh, x, z)?.point.y ?? null; }
function texturePhases(mesh, x, z) {
  const hit = rayIntersection(mesh, x, z);
  expect(hit?.uv).toBeTruthy();
  const detail = mesh.children.find(child => child.isMesh && child.material?.blending === Three.MultiplyBlending);
  expect(detail).toBeTruthy();
  return [mesh.material.map, detail.material.map].map(texture => {
    texture.updateMatrix();
    return texture.transformUv(hit.uv.clone()).toArray();
  });
}
function ringHeights(mesh, x, z, near) {
  const radius = Math.max(6, near * 2);
  const samples = [rayHeight(mesh, x, z)];
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    samples.push(rayHeight(mesh, x + Math.cos(angle) * radius, z + Math.sin(angle) * radius));
  }
  return samples.filter(value => value !== null);
}
function makeTerrain(heightAt) {
  const geometry = new Three.PlaneGeometry(400, 400, 8, 8);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setZ(i, heightAt(positions.getX(i), -positions.getY(i)));
  geometry.setAttribute('landCoverage', new Three.Float32BufferAttribute(new Float32Array(positions.count).fill(1), 1));
  const mesh = new Three.Mesh(geometry, new Three.MeshBasicMaterial({ side: Three.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(1200, 80, -1700);
  mesh.updateMatrixWorld(true);
  return mesh;
}
function disposeTerrain(mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }

async function mountFlight(thirdPerson = true) {
  wallTime = 1000; viewport = { width: 1280, height: 720 }; frameCallback = null;
  const graphics = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) }, {
    get: (target, key) => key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; }
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(graphics);
  vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('AlloPostFXEnabled', false); vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('requestAnimationFrame', callback => { if (callback.name === 'loop') frameCallback = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
    setSize() {}, setPixelRatio() {}, dispose: vi.fn(), getContext: () => ({ isContextLost: () => false }),
    render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'menu', aircraft: 'cessna172', thirdPerson,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
    setData = updateData;
    return tool.render(makeCtx({ toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => host.querySelector('button[aria-label="Free Flight from Portland, ME"]').click());
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.flightRef.current, { lat: 39.73, lon: -104.96, altitude: 6500,
    fieldElev: 0, heading: 290, speed: 150, vsi: 0, onGround: false });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.timeRef.current = 10; hooks.pausedRef.current = true;
  await frame();
  return hooks;
}
async function frame({ forceResize = true } = {}) {
  if (forceResize) resizeFlip = !resizeFlip;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: viewport.width + (resizeFlip ? 0 : 2), configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: viewport.height, configurable: true });
  }
  wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled(); expect(renderer.render).toHaveBeenCalled();
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  const aircraft = scene.children.find(item => item.userData?.type === 'cessna172' && item.userData?.visualRadius > 0);
  expect(terrain).toBeTruthy(); expect(aircraft).toBeTruthy();
  return { scene, camera, terrain, aircraft };
}
function assertNearPlane(camera, expected) {
  expect(camera.near).toBe(expected);
  const nearCentre = new Three.Vector3(0, 0, -1).unproject(camera);
  const actualDepth = nearCentre.sub(camera.position).dot(camera.getWorldDirection(new Three.Vector3()));
  expect(actualDepth).toBeCloseTo(expected, 6);
}
function assertClearance({ camera, terrain }) {
  const samples = ringHeights(terrain, camera.position.x, camera.position.z, camera.near);
  expect(samples).toHaveLength(9);
  expect(camera.position.y).toBeGreaterThanOrEqual(Math.max(...samples) + Math.max(6, camera.near * 2) - 0.002);
  expect(camera.position.toArray().every(Number.isFinite)).toBe(true);
  expect(camera.quaternion.toArray().every(Number.isFinite)).toBe(true);
}
function assertOrientation({ camera, aircraft }, heading, thirdPerson) {
  const actual = camera.getWorldDirection(new Three.Vector3());
  const target = thirdPerson ? aircraft.position.clone().add(new Three.Vector3(0, 2, 0)).sub(camera.position).normalize()
    : new Three.Vector3(Math.sin(heading * Math.PI / 180), 0, -Math.cos(heading * Math.PI / 180));
  expect(actual.dot(target)).toBeCloseTo(1, 8);
}

describe('terrain clearance under the rendered flight camera', () => {
  it('uses the analytic ground fallback when the rendered mesh is unavailable or out of bounds', () => {
    expect(api.getFlightCameraTerrainFloor(null, 0, 0, 10, 5200)).toBe(5220);
    const terrain = makeTerrain(() => 100);
    expect(api.getFlightCameraTerrainFloor(terrain, 10000, -10000, 2, 5200)).toBe(5206);
    expect(api.getFlightCameraTerrainFloor(terrain, 1200, -1700, 10, 5200)).toBe(5220);
    disposeTerrain(terrain);
  });

  it.each([1, 10, 35])('clears the uphill ring as well as the centre for a near plane of %s feet', near => {
    const terrain = makeTerrain((x, z) => 400 + x * 0.7 + z * 1.1);
    const x = 1217, z = -1723;
    const heights = ringHeights(terrain, x, z, near);
    expect(heights).toHaveLength(9);
    expect(Math.max(...heights)).toBeGreaterThan(heights[0] + 5);
    expect(api.getFlightCameraTerrainFloor(terrain, x, z, near, 0)).toBeCloseTo(Math.max(...heights) + Math.max(6, near * 2), 5);
    disposeTerrain(terrain);
  });

  it.each([true, false])('keeps the %s chase-mode camera above low Denver and Rockies terrain in the real frame loop', async thirdPerson => {
    const hooks = await mountFlight(thirdPerson);
    const initialAltitude = hooks.flightRef.current.altitude, initialTime = hooks.timeRef.current;
    let rendered = await frame();
    assertClearance(rendered); assertOrientation(rendered, 290, thirdPerson);
    const heldRenderCount = renderer.render.mock.calls.length;
    await frame({ forceResize: false });
    expect(renderer.render.mock.calls).toHaveLength(heldRenderCount);
    expect(hooks.flightRef.current.altitude).toBe(initialAltitude); expect(hooks.timeRef.current).toBe(initialTime);
    viewport = { width: 320, height: 568 };
    rendered = await frame(); assertClearance(rendered); assertOrientation(rendered, 290, thirdPerson);
    Object.assign(hooks.flightRef.current, { lat: 39.70, lon: -105.2, altitude: 6500 });
    rendered = await frame(); assertClearance(rendered); assertOrientation(rendered, 290, thirdPerson);
    expect(hooks.timeRef.current).toBe(initialTime);
  });

  it.each([true, false])('sets orientation after correcting a %s chase-mode camera against raised rendered triangles', async thirdPerson => {
    await mountFlight(thirdPerson);
    const current = await frame();
    const positions = current.terrain.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setZ(i, 50000);
    positions.needsUpdate = true; current.terrain.geometry.computeBoundingSphere();
    const rendered = await frame();
    expect(rendered.camera.position.y).toBeGreaterThanOrEqual(50000 + Math.max(6, rendered.camera.near * 2));
    assertClearance(rendered); assertOrientation(rendered, 290, thirdPerson);
  });


  it('keeps every ultrawide near-plane corner above steep rendered ground', () => {
    const terrain = makeTerrain((x, z) => 1800 + 6 * x + 1.2 * z);
    const camera = new Three.PerspectiveCamera(60, 8, 10, 100000);
    const x = 1200, z = -1700;
    const floor = api.getFlightCameraTerrainFloor(terrain, x, z, camera.near, 0, camera.fov, camera.aspect);
    expect(floor).toBeGreaterThan(api.getFlightCameraTerrainFloor(terrain, x, z, camera.near, 0));
    for (const attitude of [[0, 0, 0], [0.2, 1.1, 0.5]]) {
      camera.position.set(x, floor, z); camera.rotation.set(...attitude, 'YXZ'); camera.updateMatrixWorld(true);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const corner = new Three.Vector3(sx, sy, -1).unproject(camera);
          const ground = rayHeight(terrain, corner.x, corner.z);
          expect(ground).not.toBeNull();
          expect(corner.y).toBeGreaterThan(ground);
        }
      }
    }
    disposeTerrain(terrain);
  });

  it('keeps the parked cockpit near the runway eye height and restores the chase near plane', async () => {
    const hooks = await mountFlight(false);
    Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 76, fieldElev: 76, onGround: true });
    let rendered = await frame();
    assertNearPlane(rendered.camera, 1);
    const runwayHeight = rayHeight(rendered.terrain, rendered.camera.position.x, rendered.camera.position.z);
    expect(runwayHeight).toBeCloseTo(76, 2);
    expect(rendered.camera.position.y - runwayHeight).toBeGreaterThanOrEqual(6 - 0.002);
    expect(rendered.camera.position.y - runwayHeight).toBeLessThan(8);
    expect(hooks.flightRef.current.altitude).toBe(76);
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: true } })));
    rendered = await frame(); assertNearPlane(rendered.camera, 10); assertClearance(rendered);
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: false } })));
    rendered = await frame(); assertNearPlane(rendered.camera, 1);
    expect(rendered.camera.position.y - rayHeight(rendered.terrain, rendered.camera.position.x, rendered.camera.position.z)).toBeLessThan(8);
    assertClearance(rendered);
  });

  it('keeps the same land point on the same rendered surface after the terrain recentres', async () => {
    const hooks = await mountFlight(false);
    const first = await frame();
    const x = first.aircraft.position.x + 173, z = first.aircraft.position.z - 229;
    const before = rayHeight(first.terrain, x, z), version = first.terrain.userData.surfaceVersion;
    const phasesBefore = texturePhases(first.terrain, x, z);
    expect(before).not.toBeNull();
    hooks.flightRef.current.lat += 0.035;
    const second = await frame();
    expect(second.terrain.userData.surfaceVersion).toBeGreaterThan(version);
    expect(rayHeight(second.terrain, x, z)).toBeCloseTo(before, 2);
    const phasesAfter = texturePhases(second.terrain, x, z);
    for (let pass = 0; pass < 2; pass++) {
      for (let axis = 0; axis < 2; axis++) {
        const delta = phasesAfter[pass][axis] - phasesBefore[pass][axis];
        expect(Math.abs(delta - Math.round(delta))).toBeLessThan(0.0001);
      }
    }
    assertClearance(second);
  });

  it('leaves safe-altitude framing unchanged when switching views while paused', async () => {
    const hooks = await mountFlight(false);
    hooks.flightRef.current.altitude = 40000;
    let rendered = await frame();
    assertNearPlane(rendered.camera, 1);
    const heading = hooks.flightRef.current.heading * Math.PI / 180;
    const cockpitOffset = new Three.Vector3(0, 1.2, 1.5).applyEuler(new Three.Euler(0, -heading, 0, 'YXZ'));
    expect(rendered.camera.position.distanceTo(rendered.aircraft.position.clone().add(cockpitOffset))).toBeLessThan(1e-7);
    assertOrientation(rendered, 290, false);
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, thirdPerson: true } })));
    rendered = await frame();
    assertNearPlane(rendered.camera, 10);
    const distance = rendered.camera.userData.chaseDistance;
    expect(distance).toBeGreaterThan(0);
    const chaseOffset = new Three.Vector3(0, distance * 8 / 30, distance).applyEuler(new Three.Euler(0, -heading, 0, 'YXZ'));
    expect(rendered.camera.position.distanceTo(rendered.aircraft.position.clone().add(chaseOffset))).toBeLessThan(1e-7);
    assertClearance(rendered); assertOrientation(rendered, 290, true);
  });
});
