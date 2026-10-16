import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
// Independently read the packaged lake lookup; these heights come from the
// offline lake build, not from the runtime sampler under test.
const lakeData = JSON.parse(readFileSync('vendor/skyschool-elevation/lake-levels.json', 'utf8'));
function sourceLake(lat, lon) {
  const row = Math.floor((90 - lat) / lakeData.resolutionDegrees);
  const col = Math.floor((((lon + 180) % 360 + 360) % 360) / lakeData.resolutionDegrees);
  const spans = lakeData.rows[row] || [];
  for (const [start, end, id] of spans) {
    if (col >= start && col < end) {
      return { id, meters: lakeData.levelsMeters[id] };
    }
  }
  return null;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, setData, frameCallback, wallTime, renderer, errors, texts, origin;
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

function physicsFor(id) {
  const aircraft = api.AIRCRAFT.find(item => item.id === id);
  const model = Object.create(api.Physics);
  Object.assign(model, { WING_AREA: aircraft.wingArea, WEIGHT: aircraft.weight, MAX_THRUST: aircraft.maxThrust,
    CL0: aircraft.cl0, CL_PER_AOA: aircraft.clPerAoa, CD0: aircraft.cd0, CD_INDUCED_K: aircraft.cdK,
    IS_HELICOPTER: !!aircraft.isHelicopter, IS_DRONE: !!aircraft.isDrone,
    MAX_SPEED_KTS: aircraft.maxSpeed, AGL_CEILING: aircraft.isDrone ? 400 : null, SPRINT_MODE: false });
  return model;
}
const controls = { throttle: 0, pitch: 0, bank: 0, yawRate: 0, flaps: 0, brake: 0 };

async function mountFlight(position = { lat: 39.7, lon: -105.25, altitude: 15000 }, thirdPerson = true) {
  origin = { lat: position.lat, lon: position.lon }; wallTime = 1000; frameCallback = null; texts = [];
  const graphics = new Proxy({ fillText: text => texts.push(String(text)),
    measureText: text => ({ width: String(text).length * 6 }),
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
  Object.assign(hooks.flightRef.current, { fieldElev: api.getFlightGroundElevation(position.lat, position.lon),
    heading: 290, speed: 150, vsi: 0, onGround: false, ...position });
  Object.assign(hooks.controlsRef.current, { throttle: 0.5, pitch: 0, bank: 0, yawRate: 0 });
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  hooks.timeRef.current = 10; hooks.pausedRef.current = true;
  await frame();
  return hooks;
}
async function frame() {
  resizeFlip = !resizeFlip; texts.length = 0;
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: 1280 + (resizeFlip ? 0 : 2), configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  wallTime += 16; expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled(); expect(renderer.render).toHaveBeenCalled();
  const [scene, camera] = renderer.render.mock.calls.at(-1);
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.material?.vertexColors);
  expect(terrain).toBeTruthy();
  return { scene, camera, terrain };
}
function geographicPoint(point) {
  return { lat: origin.lat - point.z / 364800,
    lon: origin.lon + point.x / (364800 * Math.cos(origin.lat * Math.PI / 180)) };
}
function rayHit(mesh, x, z) {
  mesh.updateMatrixWorld(true);
  return new Three.Raycaster(new Three.Vector3(x, 100000, z), new Three.Vector3(0, -1, 0), 0, 200000)
    .intersectObject(mesh, false)[0];
}
function assertGroundVertices(terrain) {
  const positions = terrain.geometry.attributes.position, world = new Three.Vector3();
  for (let index = 0; index < positions.count; index += 17) {
    world.fromBufferAttribute(positions, index).applyMatrix4(terrain.matrixWorld);
    const point = geographicPoint(world), expected = api.getFlightGroundElevation(point.lat, point.lon);
    expect(Number.isFinite(expected)).toBe(true);
    expect(world.y).toBeCloseTo(expected, 2); // Float32 render buffer, feet.
  }
}

describe('signed elevation remains one physical ground datum', () => {
  it('blends below-sea training fields without raising either endpoint to sea level', () => {
    expect(api.airportTrainingGround(-250, null, Infinity)).toBe(-250);
    expect(api.airportTrainingGround(-250, -50, 0)).toBe(-50);
    expect(api.airportTrainingGround(-250, -50, 2)).toBe(-50);
    expect(api.airportTrainingGround(-250, -50, 4)).toBe(-150);
    expect(api.airportTrainingGround(-250, -50, 6)).toBe(-250);
    expect(api.airportTrainingGround(NaN, null, Infinity)).toBe(0);
  });

  it('allows every aircraft model to descend onto negative ground and preserve impact evidence', () => {
    for (const aircraft of api.AIRCRAFT) {
      const model = physicsFor(aircraft.id);
      const initial = { lat: 36, lon: -117, speed: 80, altitude: -249.99, fieldElev: -250,
        vsi: -8, heading: 0, onGround: false };
      const stepped = model.step(initial, 0.1, controls);
      const contacted = api.reconcileGroundContact(stepped, -250, aircraft.isDrone ? 400 : null);
      expect(contacted.altitude, aircraft.id).toBe(-250);
      expect(contacted.fieldElev, aircraft.id).toBe(-250);
      expect(contacted.onGround, aircraft.id).toBe(true);
      expect(contacted.vsi, aircraft.id).toBe(0);
      expect(contacted.groundContact.vsi, aircraft.id).toBeLessThan(0);
      expect(initial.altitude).toBe(-249.99);
    }
  });

  it('keeps airborne motion and a drone ceiling relative to negative ground', () => {
    const state = { altitude: -100, fieldElev: 5431, vsi: -2, speed: 60, onGround: false };
    expect(api.reconcileGroundContact(state, -250)).toMatchObject({ altitude: -100, fieldElev: -250, vsi: -2, onGround: false });
    const ceiling = api.reconcileGroundContact({ ...state, altitude: 200, vsi: 3 }, -250, 400);
    expect(ceiling).toMatchObject({ altitude: 150, fieldElev: -250, vsi: 0, hitCeiling: true, onGround: false });
    expect(ceiling.altitude - ceiling.fieldElev).toBe(400);
    expect(api.getFlightCameraTerrainFloor(null, 0, 0, 1, -250)).toBe(-244);
  });

  it('keeps every departure runway at its published field height after the DEM replacement', () => {
    for (const airport of api.WAYPOINTS) {
      expect(api.getFlightGroundElevation(airport.lat, airport.lon), airport.id).toBe(airport.alt);
    }
  });
});

describe('real elevation in the registered flight renderer', () => {
  it('builds the rendered surface from the same signed ground used by physics and AGL after recentering', async () => {
    const hooks = await mountFlight();
    const initial = await frame();
    expect(initial.terrain.position.x).toBeCloseTo(0, 8); expect(initial.terrain.position.z).toBeCloseTo(0, 8);
    assertGroundVertices(initial.terrain);
    const version = initial.terrain.userData.surfaceVersion;
    Object.assign(hooks.flightRef.current, { lat: origin.lat + 0.1, lon: origin.lon - 0.08 });
    const moved = await frame();
    expect(moved.terrain.userData.surfaceVersion).toBeGreaterThan(version);
    assertGroundVertices(moved.terrain);
    // This is an independent Three triangle raycast, not a second call to the
    // simulator's terrain interpolation helper.
    for (const [x, z] of [[173, -229], [5007, 8013], [-9007, -12033]]) {
      const hit = rayHit(moved.terrain, moved.terrain.position.x + x, moved.terrain.position.z + z);
      expect(hit).toBeTruthy();
      const sample = api.sampleFlightTerrainSurface(moved.terrain, hit.point.x, hit.point.z);
      expect(sample.heightFt).toBeCloseTo(hit.point.y, 6);
    }
  });

  it('places the broad background ground below negative terrain rather than hiding it at -40 feet', async () => {
    await mountFlight();
    const { scene, terrain } = await frame();
    const backstop = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.geometry.parameters.width === 700000);
    expect(backstop).toBeTruthy();
    expect(backstop.position.y).toBeLessThan(-36000);
    expect(backstop.position.y).toBeLessThan(Math.min(...terrain.geometry.attributes.position.array.filter((_, index) => index % 3 === 2)));
    const hit = rayHit(backstop, backstop.position.x, backstop.position.z);
    expect(hit.point.y).toBeCloseTo(backstop.position.y, 6);
  });

  it.each([
    ['Mount Fuji', 35.361, 138.727],
    ['Mount Everest', 27.988, 86.925],
  ])('does not stack a separate mountain cone above the real %s terrain', async (_name, lat, lon) => {
    await mountFlight({ lat, lon, altitude: 40000 });
    const { scene } = await frame();
    const inventedMountains = [];
    scene.traverse(item => {
      if (item.geometry?.type === 'ConeGeometry' && item.geometry.parameters.radius >= 6000) inventedMountains.push(item);
    });
    expect(inventedMountains).toHaveLength(0);
    expect(api.getFlightGroundElevation(lat, lon)).toBeGreaterThan(1000);
  });

  it('draws the negative MSL tape graduations without adding cockpit panels', async () => {
    await mountFlight({ lat: 36, lon: -117, altitude: -250 }, false);
    await frame();
    expect(texts).toContain('-200'); expect(texts).toContain('-400');
    expect(host.querySelector('[data-flightsim-hud-dock]')).toBeTruthy();
  });

  it('hides low balloon and bird scenery behind Denver terrain while retaining safe daytime scenery over lower ground', async () => {
    // The cockpit follows a paused relocation immediately. The chase camera
    // intentionally holds its prior position when the simulation delta is zero.
    const hooks = await mountFlight({ lat: 39.7, lon: -105, altitude: 5900 }, false);
    hooks.qualityRef.current.tier = 0;
    const localHour = hour => { hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100; };
    localHour(12);
    let rendered = await frame();
    const actors = rendered.scene.children.filter(item => item.isSprite && Number.isFinite(item.userData.baseY));
    expect(actors).toHaveLength(6);
    const anchors = actors.map(item => item.userData.baseY);
    for (const actor of actors) {
      const point = geographicPoint(actor.position), ground = api.getFlightGroundElevation(point.lat, point.lon);
      expect(ground).toBeGreaterThan(actor.position.y);
      expect(actor.visible).toBe(false);
    }
    Object.assign(hooks.flightRef.current, { lat: 43.646, lon: -70.309, altitude: 2000 });
    localHour(12); rendered = await frame();
    expect(actors.map(item => item.userData.baseY)).toEqual(anchors);
    const visible = actors.filter(actor => actor.visible);
    expect(visible.some(actor => actor.scale.y === 510)).toBe(true);
    expect(visible.some(actor => actor.scale.y === 240)).toBe(true);
    for (const actor of visible) {
      const hit = rayHit(rendered.terrain, actor.position.x, actor.position.z);
      expect(hit).toBeTruthy();
      expect(actor.position.y - actor.scale.y / 2).toBeGreaterThan(hit.point.y);
    }
    localHour(0); await frame();
    expect(actors.every(actor => !actor.visible)).toBe(true);
  });
});

describe('inland water uses a stable surface elevation', () => {
  it('keeps distant points of the same lake level and distinguishes water surface from ocean', () => {
    const points = [[39.1, -120.05], [39.15, -120.05]];
    const expected = sourceLake(...points[0]);
    expect(expected).toBeTruthy(); expect(expected.meters).toBeGreaterThan(1000);
    for (const point of points) {
      expect(sourceLake(...point).id).toBe(expected.id);
      expect(api.isWaterMask(...point)).toBe(true);
      expect(api.getFlightLakeElevationMeters(...point)).toBe(expected.meters);
      expect(api.getFlightTerrainHeight(...point)).toBeCloseTo(expected.meters / 0.3048, 2);
      expect(api.getFlightGroundElevation(...point)).toBeCloseTo(expected.meters / 0.3048, 2);
    }
    expect(sourceLake(0, -150)).toBeNull();
    expect(api.getFlightLakeElevationMeters(0, -150)).toBeNull();
    expect(api.getFlightTerrainHeight(0, -150)).toBe(0);
    expect(api.getFlightGroundElevation(0, -150)).toBe(0);
  });

  it('paints elevated lake vertices at the packaged water level and uses it for live flight contact', async () => {
    const lat = 39.1, lon = -120.05, lake = sourceLake(lat, lon), surface = lake.meters / 0.3048;
    const hooks = await mountFlight({ lat, lon, altitude: surface + 100 });
    const { terrain } = await frame();
    const positions = terrain.geometry.attributes.position, world = new Three.Vector3();
    const coverage = terrain.geometry.attributes.landCoverage;
    let lakeVertices = 0;
    for (let index = 0; index < positions.count; index++) {
      world.fromBufferAttribute(positions, index).applyMatrix4(terrain.matrixWorld);
      const point = geographicPoint(world), expected = sourceLake(point.lat, point.lon);
      if (!expected || expected.id !== lake.id || coverage.getX(index) !== 0) continue;
      expect(world.y).toBeCloseTo(surface, 2); lakeVertices++;
    }
    expect(lakeVertices).toBeGreaterThan(10);
    const hit = rayHit(terrain, 0, 0);
    expect(hit.point.y).toBeCloseTo(surface, 2);
    // Consume the actual registered RAF once: the physics input must use the
    // lake surface rather than preserving a stale departure-field elevation.
    hooks.flightRef.current.fieldElev = 0; hooks.pausedRef.current = false;
    await frame();
    const state = hooks.flightRef.current;
    expect(state.fieldElev).toBeCloseTo(surface, 2);
    expect(state.onGround).toBe(false);
    expect(state.altitude - state.fieldElev).toBeGreaterThan(90);
    expect(state.altitude - state.fieldElev).toBeLessThan(110);
  });

  it('preserves the negative Caspian water level in the mesh and its camera clearance', async () => {
    const lat = 42, lon = 51, lake = sourceLake(lat, lon), surface = lake.meters / 0.3048;
    expect(lake.meters).toBeLessThan(0);
    await mountFlight({ lat, lon, altitude: surface + 20 }, false);
    const { terrain, camera } = await frame();
    expect(api.getFlightGroundElevation(lat, lon)).toBeCloseTo(surface, 2);
    expect(rayHit(terrain, 0, 0).point.y).toBeCloseTo(surface, 2);
    expect(camera.position.y).toBeLessThan(0);
    expect(camera.position.y).toBeGreaterThan(surface + 6);
  });

  it('places the rescue raft and cable on an elevated lake instead of at sea level', async () => {
    const lat = 39.1, lon = -120.05, surface = sourceLake(lat, lon).meters / 0.3048;
    await mountFlight({ lat, lon, altitude: surface + 80 });
    await React.act(async () => setData(old => ({ ...old, flightSim: { ...old.flightSim, aircraft: 'rescue_heli',
      rescue: { active: true, recovered: false, survivorLat: lat, survivorLon: lon, hoistTime: 1 } } })));
    const { scene } = await frame();
    let raft;
    scene.traverse(item => {
      if (item.geometry?.type === 'CylinderGeometry' && item.geometry.parameters.radiusTop === 15 && item.geometry.parameters.height === 4) raft = item;
    });
    expect(raft).toBeTruthy();
    const raftPosition = raft.getWorldPosition(new Three.Vector3());
    // The four-foot raft has its centre two feet above the water.
    expect(raftPosition.y).toBeCloseTo(surface + 2, 2);
    expect(raftPosition.y - 2).toBeCloseTo(surface, 2);
    const cables = [];
    scene.traverse(item => {
      if (item.isLine && item.geometry.attributes.position?.count === 2 && item.material.color?.getHex() === 0x94a3b8) cables.push(item);
    });
    expect(cables).toHaveLength(1);
    const endpoint = new Three.Vector3().fromBufferAttribute(cables[0].geometry.attributes.position, 1).applyMatrix4(cables[0].matrixWorld);
    expect(endpoint.x).toBeCloseTo(raftPosition.x, 2); expect(endpoint.z).toBeCloseTo(raftPosition.z, 2);
    expect(endpoint.y).toBeCloseTo(raftPosition.y + 7, 2);
  });
});
