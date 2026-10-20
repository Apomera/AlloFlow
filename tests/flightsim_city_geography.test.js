import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { TextEncoder, TextDecoder } from 'node:util';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, reactRoot, frameCallback, wallTime, errors, renderer, patchFlightData;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null; frameCallback = null;
  patchFlightData = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  delete window.SkySchoolCityServices;
});


async function mountFlight(initialData = {}) {
  wallTime = 1000; frameCallback = null;
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  }, {
    get: (target, property) => property in target ? target[property] : () => {},
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
  window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
  host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', thirdPerson: false, flightDetails: false,
      railCollapsed: true, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])), ...initialData } });
    patchFlightData = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await React.act(async () => reactRoot.render(React.createElement(App)));
  await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
  for (const canvas of host.querySelectorAll('canvas')) {
    Object.defineProperty(canvas, 'clientWidth', { value: 1280, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
  }
  const hooks = window.__testHooks.flightSim;
  Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
  vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
    forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
  Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
  return hooks;
}
async function draw(hooks, lat, lon) {
  Object.assign(hooks.flightRef.current, { lat, lon, altitude: 15000, fieldElev: 0, heading: 90, speed: 0, vsi: 0, onGround: false });
  wallTime += 16;
  expect(frameCallback).toBeTypeOf('function');
  await React.act(async () => frameCallback());
  expect(errors).not.toHaveBeenCalled();
  expect(renderer.render).toHaveBeenCalled();
  const [scene] = renderer.render.mock.calls.at(-1);
  return scene;
}

function cityRow(name) {
  const row = api.REAL_CITIES.find(item => item[0] === name);
  expect(row, name).toBeTruthy();
  return row;
}

describe('SkySchool detailed city lifecycle', () => {
  it('retains illustrative neighborhoods for empty detail and replaces only overlapping emitted geometry', async () => {
    const hooks = await mountFlight();
    const pack = api.FLIGHT_CITY_DISTRICTS[0];
    const saved = { buildings: pack.buildings, roads: pack.roads, bbox: pack.bbox };
    try {
      pack.buildings = []; pack.roads = [];
      pack.bbox = [pack.lat - 1, pack.lon - 1, pack.lat + 1, pack.lon + 1];
      const scene = await draw(hooks, pack.lat, pack.lon);
      const findDistrict = () => scene.children.find(item => item.userData?.flightCityDistrict === pack.id);
      const clusters = scene.children.filter(item => item.userData?.geo && item.userData?.mats);
      const supported = clusters.flatMap(cluster => buildings(cluster)).filter(mesh => mesh.userData.flightCityBuilding.supported);
      expect(supported.length).toBeGreaterThan(2);
      expect(supported.every(mesh => mesh.visible)).toBe(true);
      expect(findDistrict()).toBeUndefined();
      expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
      const chosen = supported[0];
      pack.buildings = [{ id: 'mapped-overlap', heightM: 12, style: 0,
        rings: [chosen.userData.flightCityBuilding.footprint.map(point => [point.lon, point.lat])] }];
      const ground = terrainSurface(scene);
      ground.userData.surfaceVersion++;
      await draw(hooks, pack.lat, pack.lon);
      const district = findDistrict();
      expect(district.userData.stats.buildings).toBe(1);
      expect(chosen.visible).toBe(false);
      expect(supported.some(mesh => mesh !== chosen && mesh.visible)).toBe(true);
      pack.buildings = [];
      ground.userData.surfaceVersion++;
      await draw(hooks, pack.lat, pack.lon);
      expect(chosen.visible).toBe(true);
      expect(findDistrict()).toBeUndefined();
      const placement = chosen.userData.flightCityBuilding;
      pack.roads = [{ id: 'mapped-road-overlap', widthM: 4, points: [
        [placement.footprint[0].lon, placement.lat], [placement.footprint[1].lon, placement.lat]
      ] }];
      ground.userData.surfaceVersion++;
      await draw(hooks, pack.lat, pack.lon);
      expect(findDistrict().userData.stats.buildings).toBe(0);
      expect(findDistrict().userData.stats.roadTriangles).toBeGreaterThan(0);
      expect(chosen.visible).toBe(false);
      expect(supported.some(mesh => mesh !== chosen && mesh.visible)).toBe(true);
      pack.roads = [];
      ground.userData.surfaceVersion++;
      await draw(hooks, pack.lat, pack.lon);
      expect(chosen.visible).toBe(true);
      expect(findDistrict()).toBeUndefined();
    } finally { Object.assign(pack, saved); }
  });

  it('renders a bounded Portland district, refreshes ground, and uses load/unload hysteresis', async () => {
    const hooks = await mountFlight();
    const pack = api.FLIGHT_CITY_DISTRICTS[0];
    const scene = await draw(hooks,pack.lat,pack.lon);
    const find = () => scene.children.find(x=>x.userData?.flightCityDistrict === pack.id);
    const group = find();
    expect(group).toBeTruthy();
    expect(group.children).toHaveLength(3);
    expect(group.userData.stats.buildings).toBeGreaterThan(1000);
    expect(group.userData.stats.buildings).toBeLessThanOrEqual(2500);
    expect(group.userData.stats.roadSegments).toBeGreaterThan(1000);
    expect(group.userData.stats.vertices).toBeLessThan(250000);
    const credit = host.querySelector('[data-flightsim-map-attribution]');
    expect(credit).toBeTruthy(); // The automatic offline district needs credit without a chosen city.
    expect(credit.textContent).toBe('© OpenStreetMap');
    expect(credit.querySelector('a').href).toBe('https://www.openstreetmap.org/copyright');
    const originalGeometry = group.children[0].geometry;
    const disposal = vi.spyOn(originalGeometry,'dispose');
    await draw(hooks,pack.lat,pack.lon);
    expect(group.children[0].geometry).toBe(originalGeometry);
    await draw(hooks,pack.lat+0.04,pack.lon);
    expect(find()).toBe(group);
    expect(disposal).toHaveBeenCalledTimes(1);
    expect(group.children[0].geometry).not.toBe(originalGeometry);
    await draw(hooks,pack.lat+0.25,pack.lon); // 15 nm: retained
    expect(find()).toBe(group);
    const materialDisposals = group.userData.mats.map(m=>vi.spyOn(m,'dispose'));
    await draw(hooks,pack.lat+0.28,pack.lon); // >16 nm: evicted
    expect(find()).toBeUndefined();
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
    materialDisposals.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
    await draw(hooks,pack.lat+0.25,pack.lon); // outside14 nm: do not rebuild
    expect(find()).toBeUndefined();
    await draw(hooks,pack.lat,pack.lon);
    expect(find()).toBeTruthy(); expect(find()).not.toBe(group);
    expect(host.querySelector('[data-flightsim-map-attribution]')?.textContent).toBe('© OpenStreetMap');
  });

  it('removes rendered-map credit when WebGL loses its context and falls back to Canvas', async () => {
    const hooks = await mountFlight();
    const pack = api.FLIGHT_CITY_DISTRICTS[0];
    await draw(hooks, pack.lat, pack.lon);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeTruthy();
    const renderCount = renderer.render.mock.calls.length;
    renderer.getContext = () => ({ isContextLost: () => true });
    await draw(hooks, pack.lat, pack.lon);
    expect(renderer.render).toHaveBeenCalledTimes(renderCount);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
    await draw(hooks, pack.lat, pack.lon);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
  });

  it('never credits unrendered mapped geometry when the first WebGL draw fails', async () => {
    const hooks = await mountFlight();
    const pack = api.FLIGHT_CITY_DISTRICTS[0];
    renderer.render.mockImplementation(() => { throw new Error('fixture WebGL draw failure'); });
    await draw(hooks, pack.lat, pack.lon);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
  });

  it('never accumulates more than five global clusters while travelling through a dense metro', async () => {
    const hooks = await mountFlight();
    for(const [lat,lon] of [[52.08,4.3],[52,4.5],[51.92,4.5],[51.88,4.7],[51.98,4.9]]) {
      const scene=await draw(hooks,lat,lon);
      const groups=scene.children.filter(x=>x.userData?.geo&&x.userData?.mats);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups.length).toBeLessThanOrEqual(5);
    }
  });
});
function cityCluster(scene, row) {
  const city = scene.children.find(item => item.userData?.geo && item.userData?.mats
    && item.userData.lat === row[1] && item.userData.lon === row[2]);
  expect(city, row[0]).toBeTruthy();
  return city;
}
function buildings(cluster) {
  return cluster.children.filter(item => item.isMesh && item.geometry?.type === 'BoxGeometry');
}
function geographicPosition(row, x, z, projectionLat = row[1]) {
  return {
    lat: row[1] - z / 364800,
    lon: row[2] + x / (364800 * Math.cos(projectionLat * Math.PI / 180)),
  };
}
function footprintSamples(row, building, projectionLat) {
  const result = [geographicPosition(row, building.position.x, building.position.z, projectionLat)];
  for (const dx of [-building.scale.x / 2, building.scale.x / 2]) {
    for (const dz of [-building.scale.z / 2, building.scale.z / 2]) {
      result.push(geographicPosition(row, building.position.x + dx, building.position.z + dz, projectionLat));
    }
  }
  return result;
}
function clusterSnapshot(cluster) {
  return buildings(cluster).map(item => ({
    position: item.position.toArray(), scale: item.scale.toArray(),
    color: item.material.color.getHex(),
  }));
}

function terrainSurface(scene) {
  const terrain = scene.children.find(item => item.isMesh && item.geometry?.type === 'PlaneGeometry' && item.geometry.parameters?.width === 240000);   // the near terrain patch
  expect(terrain).toBeTruthy();
  expect(terrain.geometry.attributes.landCoverage).toBeTruthy();
  return terrain;
}
function raycastSurface(mesh, worldX, worldZ) {
  mesh.updateMatrixWorld(true);
  const ray = new Three.Raycaster(new Three.Vector3(worldX, 100000, worldZ), new Three.Vector3(0, -1, 0), 0, 200000);
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit) return null;
  const point = mesh.worldToLocal(hit.point.clone());
  const positions = mesh.geometry.attributes.position;
  const a = new Three.Vector3().fromBufferAttribute(positions, hit.face.a);
  const b = new Three.Vector3().fromBufferAttribute(positions, hit.face.b);
  const c = new Three.Vector3().fromBufferAttribute(positions, hit.face.c);
  const weights = Three.Triangle.getBarycoord(point, a, b, c, new Three.Vector3());
  const land = mesh.geometry.attributes.landCoverage;
  return {
    heightFt: hit.point.y,
    landCoverage: weights.x * land.getX(hit.face.a) + weights.y * land.getX(hit.face.b) + weights.z * land.getX(hit.face.c),
  };
}
function assertTerrainSupportsBuildings(cluster, terrain) {
  const visible = buildings(cluster).filter(block => block.visible);
  expect(visible.length).toBeGreaterThan(0);
  for (const block of visible) {
    const x = cluster.position.x + block.position.x;
    const z = cluster.position.z + block.position.z;
    const samples = [raycastSurface(terrain, x, z)];
    for (const dx of [-block.scale.x / 2, block.scale.x / 2]) {
      for (const dz of [-block.scale.z / 2, block.scale.z / 2]) samples.push(raycastSurface(terrain, x + dx, z + dz));
    }
    for (const sample of samples) {
      expect(sample).toBeTruthy();
      expect(sample.landCoverage).toBeGreaterThanOrEqual(0.95 - 1e-7);
    }
    const heights = samples.map(sample => sample.heightFt);
    const minimum = Math.min(...heights);
    const metadata = block.userData.flightCityBuilding;
    expect(cluster.position.y + block.position.y).toBeCloseTo(minimum, 4);
    expect(metadata.altitude).toBeCloseTo(samples[0].heightFt, 4);
    expect(metadata.baseAltitude).toBeCloseTo(minimum, 4);
    expect(metadata.foundationDepthFt).toBeCloseTo(samples[0].heightFt - minimum, 4);
    expect(block.scale.y).toBeCloseTo(metadata.originalHeightFt + metadata.foundationDepthFt, 4);
    expect(cluster.position.y + block.position.y + block.scale.y).toBeCloseTo(samples[0].heightFt + metadata.originalHeightFt, 4);
    const maxSpread = Math.max(20, Math.min(block.scale.x, block.scale.z) * 0.15);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(maxSpread + 1e-6);
  }
}

describe('SkySchool city footprint placement', () => {
  it('uses the supplied ground datum at the building centre and retains all footprint corners', () => {
    const city = Object.freeze({ lat: 0, lon: 0 });
    const ground = vi.fn((lat, lon) => 200 + lat * 10 + lon * 4);
    const placement = api.getFlightCityBuildingPlacement(city, 3648, 7296, 729.6, 364.8, () => false, ground);
    expect(placement).toBeTruthy();
    expect(placement.lat).toBeCloseTo(-0.02, 10);
    expect(placement.lon).toBeCloseTo(0.01, 10);
    expect(placement.altitude).toBeCloseTo(199.84, 10);
    expect(placement.footprint).toHaveLength(4);
    expect(ground).toHaveBeenCalledTimes(1);
    expect(ground.mock.calls[0][0]).toBeCloseTo(-0.02, 10);
    expect(ground.mock.calls[0][1]).toBeCloseTo(0.01, 10);
    const corners = placement.footprint.map(point => [point.lat, point.lon]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const expected = [[-0.0205, 0.009], [-0.0205, 0.011], [-0.0195, 0.009], [-0.0195, 0.011]];
    for (let i = 0; i < expected.length; i++) {
      expect(corners[i][0]).toBeCloseTo(expected[i][0], 10);
      expect(corners[i][1]).toBeCloseTo(expected[i][1], 10);
    }
    expect(city).toEqual({ lat: 0, lon: 0 });
  });

  it('rejects a wet centre or any wet footprint corner before sampling ground', () => {
    const city = { lat: 0, lon: 0 };
    const samples = [[-0.02, 0.01], [-0.0205, 0.009], [-0.0205, 0.011], [-0.0195, 0.009], [-0.0195, 0.011]];
    for (const [wetLat, wetLon] of samples) {
      const ground = vi.fn(() => 100);
      const water = (lat, lon) => Math.abs(lat - wetLat) < 1e-9 && Math.abs(lon - wetLon) < 1e-9;
      expect(api.getFlightCityBuildingPlacement(city, 3648, 7296, 729.6, 364.8, water, ground)).toBe(null);
      expect(ground).not.toHaveBeenCalled();
    }
  });

  it('wraps all geographic footprint coordinates at the date line and uses the world projection latitude', () => {
    const city = { lat: 0, lon: 179.995 };
    const placement = api.getFlightCityBuildingPlacement(city, 3648, 0, 100, 100, () => false, () => 12);
    expect(placement.lon).toBeCloseTo(-179.995, 10);
    for (const point of placement.footprint) {
      expect(point.lon).toBeGreaterThanOrEqual(-180);
      expect(point.lon).toBeLessThan(180);
    }
    const highOrigin = api.getFlightCityBuildingPlacement({ lat: 0, lon: 0 }, 3648, 0, 100, 100, () => false, () => 12, 60);
    expect(highOrigin.lon).toBeCloseTo(0.02, 10);
    const implicit = api.getFlightCityBuildingPlacement({ lat: 60, lon: 0 }, 3648, 0, 100, 100, () => false, () => 12);
    expect(implicit.lon).toBeCloseTo(highOrigin.lon, 10);
  });

  it('preserves deterministic placement and the supplied elevation', () => {
    const city = Object.freeze({ lat: 31, lon: 35 });
    const first = api.getFlightCityBuildingPlacement(city, 1234, -5678, 70, 140, () => false, () => 1400);
    const again = api.getFlightCityBuildingPlacement(city, 1234, -5678, 70, 140, () => false, () => 1400);
    expect(first).toEqual(again);
    expect(first.altitude).toBe(1400);
  });

  it('rejects invalid dimensions, coordinates, samplers, polar projections, and nonfinite ground', () => {
    const good = [{ lat: 0, lon: 0 }, 0, 0, 100, 100, () => false, () => 10];
    const invalid = [
      [0, null], [0, { lat: NaN, lon: 0 }], [0, { lat: 0, lon: Infinity }],
      [0, { lat: 91, lon: 0 }], [1, NaN], [2, Infinity], [3, 0], [3, -1],
      [4, -1], [4, '100'], [5, null], [6, null], [6, () => NaN], [6, () => Infinity],
      [7, 90], [7, -90], [7, NaN],
    ];
    for (const [index, value] of invalid) {
      const args = [...good]; args[index] = value;
      expect(api.getFlightCityBuildingPlacement(...args), 'invalid argument ' + index).toBe(null);
    }
    expect(api.getFlightCityBuildingPlacement({ lat: 89.9999, lon: 0 }, 0, 0, 100, 1000, () => false, () => 10)).toBe(null);
  });
});

function testTerrain(heights, coverage = Array(9).fill(1)) {
  const geometry = new Three.PlaneGeometry(200, 160, 2, 2);
  for (let i = 0; i < 9; i++) geometry.attributes.position.setZ(i, heights[i]);
  geometry.setAttribute('landCoverage', new Three.BufferAttribute(new Float32Array(coverage), 1));
  const mesh = new Three.Mesh(geometry, new Three.MeshBasicMaterial({ side: Three.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(50, 20, -30);
  mesh.updateMatrixWorld(true);
  return mesh;
}
function disposeTestTerrain(mesh) { mesh.geometry.dispose(); mesh.material.dispose(); }

describe('SkySchool rendered terrain city support sampling', () => {
  it('matches real Three triangle intersections and coverage on both grid diagonals', () => {
    const mesh = testTerrain([7, 11, 24, 19, 37, 44, 50, 63, 77], [1, 0.9, 0.7, 0.8, 0.6, 0.4, 0.7, 0.3, 0.1]);
    try {
      for (const [x, z] of [[-80, -60], [-40, -20], [-10, -60], [30, -10], [0, 0], [60, 20], [90, 70], [-20, 45]]) {
        const worldX = mesh.position.x + x, worldZ = mesh.position.z + z;
        const expected = raycastSurface(mesh, worldX, worldZ);
        const actual = api.sampleFlightTerrainSurface(mesh, worldX, worldZ);
        expect(actual).toBeTruthy();
        expect(actual.heightFt).toBeCloseTo(expected.heightFt, 5);
        expect(actual.landCoverage).toBeCloseTo(expected.landCoverage, 5);
      }
      for (const [x, z] of [[-100.1, 0], [100.1, 0], [0, -80.1], [0, 80.1]]) {
        expect(api.sampleFlightTerrainSurface(mesh, mesh.position.x + x, mesh.position.z + z)).toBe(null);
      }
      expect(api.sampleFlightTerrainSurface(mesh, NaN, 0)).toBe(null);
      expect(api.sampleFlightTerrainSurface(mesh, 0, Infinity)).toBe(null);
      expect(api.sampleFlightTerrainSurface(null, 0, 0)).toBe(null);
      mesh.geometry.deleteAttribute('landCoverage');
      expect(api.sampleFlightTerrainSurface(mesh, 50, -30)).toBe(null);
    } finally { disposeTestTerrain(mesh); }
  });

  it('accepts dry level foundations and rejects mixed water or steep support', () => {
    const mesh = testTerrain(Array(9).fill(10));
    try {
      const level = api.getFlightCityBuildingSurface(mesh, 50, -30, 20, 40);
      expect(level).toBeTruthy();
      expect(level.centerFt).toBeCloseTo(30, 6);
      expect(level.minHeightFt).toBeCloseTo(30, 6);
      expect(level.maxHeightFt).toBeCloseTo(30, 6);
      expect(level.landCoverage).toBeCloseTo(1, 6);
      expect(level.heightRangeFt).toBeCloseTo(0, 6);
      expect(level.foundationDepthFt).toBeCloseTo(0, 6);
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) positions.setZ(i, 1000 + positions.getX(i) * 0.2);
      const sloped = api.getFlightCityBuildingSurface(mesh, 50, -30, 20, 40);
      expect(sloped).toBeTruthy();
      expect(sloped.centerFt).toBeCloseTo(1020, 5);
      expect(sloped.minHeightFt).toBeCloseTo(1018, 5);
      expect(sloped.maxHeightFt).toBeCloseTo(1022, 5);
      expect(sloped.heightRangeFt).toBeCloseTo(4, 5);
      expect(sloped.foundationDepthFt).toBeCloseTo(2, 5);
      for (let i = 0; i < positions.count; i++) positions.setZ(i, 1000 + positions.getX(i) * 2);
      expect(api.getFlightCityBuildingSurface(mesh, 50, -30, 20, 40)).toBe(null);
      for (let i = 0; i < positions.count; i++) positions.setZ(i, 10);
      mesh.geometry.attributes.landCoverage.setX(4, 0);
      expect(api.getFlightCityBuildingSurface(mesh, 50, -30, 20, 40)).toBe(null);
      expect(api.getFlightCityBuildingSurface(mesh, 50, -30, 0, 40)).toBe(null);
      expect(api.getFlightCityBuildingSurface(mesh, 50, -30, 20, -1)).toBe(null);
      expect(api.getFlightCityBuildingSurface(mesh, 50, -30, NaN, 40)).toBe(null);
    } finally { disposeTestTerrain(mesh); }
  });
});

describe('SkySchool production WebGL city geography', () => {
  it.each(['San Francisco', 'New York', 'Hong Kong', 'Seattle'])('keeps every rendered building footprint on real land in %s', async name => {
    const row = cityRow(name);
    const hooks = await mountFlight();
    const scene = await draw(hooks, row[1], row[2]);
    const cluster = cityCluster(scene, row);
    const blocks = buildings(cluster).filter(block => block.visible);
    assertTerrainSupportsBuildings(cluster, terrainSurface(scene));
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.length).toBeLessThanOrEqual(64);
    expect(cluster.userData.projectionLat).toBeTypeOf('number');
    // The first aircraft pose establishes the world projection for this scene.
    expect(cluster.userData.projectionLat).toBeCloseTo(row[1], 10);
    expect(cluster.children.some(item => item.geometry?.type === 'CircleGeometry')).toBe(false);
    for (const block of blocks) {
      const metadata = block.userData.flightCityBuilding;
      expect(metadata).toBeTruthy();
      const samples = footprintSamples(row, block, cluster.userData.projectionLat);
      expect(metadata.lat).toBeCloseTo(samples[0].lat, 10);
      expect(metadata.lon).toBeCloseTo(samples[0].lon, 10);
      expect(metadata.baseAltitude).toBeCloseTo(cluster.position.y + block.position.y, 8);
      expect(metadata.footprint).toHaveLength(4);
      for (const sample of samples) expect(api.isWaterMask(sample.lat, sample.lon), name + ' building ' + metadata.index).toBe(false);
      for (const corner of metadata.footprint) {
        expect(samples.slice(1).some(sample => Math.abs(sample.lat - corner.lat) < 1e-10 && Math.abs(sample.lon - corner.lon) < 1e-10)).toBe(true);
      }
    }
  });

  it('keeps hillside bases anchored to the rendered terrain after the terrain grid recentres', async () => {
    const row = cityRow('Denver');
    const hooks = await mountFlight();
    const scene = await draw(hooks, row[1], row[2]);
    const cluster = cityCluster(scene, row);
    const terrain = terrainSurface(scene);
    const firstVersion = terrain.userData.surfaceVersion;
    expect(firstVersion).toBeTypeOf('number');
    assertTerrainSupportsBuildings(cluster, terrain);
    // More than the 8,000 ft recenter threshold, but still inside the city's
    // retention radius. Geometry updates must re-anchor existing city boxes.
    await draw(hooks, row[1] + 0.06, row[2]);
    expect(cityCluster(scene, row)).toBe(cluster);
    expect(terrainSurface(scene)).toBe(terrain);
    expect(terrain.userData.surfaceVersion).toBeGreaterThan(firstVersion);
    assertTerrainSupportsBuildings(cluster, terrain);
  });

  it('retains nearby clusters and disposes/rebuilds the same deterministic layout after re-entry', async () => {
    const row = cityRow('San Francisco');
    const hooks = await mountFlight();
    const scene = await draw(hooks, row[1], row[2]);
    const original = cityCluster(scene, row);
    const snapshot = clusterSnapshot(original);
    const geometry = original.userData.geo;
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDisposals = original.userData.mats.map(material => vi.spyOn(material, 'dispose'));
    await draw(hooks, row[1] + 0.001, row[2] + 0.001);
    expect(cityCluster(scene, row)).toBe(original);
    expect(geometryDispose).not.toHaveBeenCalled();
    await draw(hooks, row[1] + 0.6, row[2]);
    expect(scene.children).not.toContain(original);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    for (const dispose of materialDisposals) expect(dispose).toHaveBeenCalledTimes(1);
    await draw(hooks, row[1], row[2]);
    const rebuilt = cityCluster(scene, row);
    expect(rebuilt).not.toBe(original);
    expect(rebuilt.userData.geo).not.toBe(geometry);
    expect(clusterSnapshot(rebuilt)).toEqual(snapshot);
    const rebuiltGeometryDispose = vi.spyOn(rebuilt.userData.geo, 'dispose');
    const rebuiltMaterialsDispose = rebuilt.userData.mats.map(material => vi.spyOn(material, 'dispose'));
    await React.act(async () => reactRoot.unmount());
    reactRoot = null;
    expect(rebuiltGeometryDispose).toHaveBeenCalled();
    for (const dispose of rebuiltMaterialsDispose) expect(dispose).toHaveBeenCalled();
    expect(window.__testHooks.flightSim).toBeUndefined();
  });
});


function streamedCityResponse(raw) {
  const bytes = new TextEncoder().encode(JSON.stringify(raw));
  let cursor = 0;
  const reader = {
    read: vi.fn(async () => {
      if (cursor >= bytes.length) return { done: true };
      const end = Math.min(bytes.length, cursor + Math.max(1, Math.ceil(bytes.length / 3)));
      const value = bytes.slice(cursor, end); cursor = end;
      return { done: false, value };
    }),
    cancel: vi.fn(async () => {}), releaseLock: vi.fn(),
  };
  return { response: { ok: true, headers: { get: () => null }, body: { getReader: () => reader } }, reader };
}
function configureCityProvider(fetcher) {
  window.SkySchoolCityServices = { overpassUrl: 'https://city-data.example.test/api/interpreter' };
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('indexedDB', undefined);
  vi.stubGlobal('TextDecoder', TextDecoder);
}
async function settleCityWork() { for (let i = 0; i < 40; i++) await Promise.resolve(); }
function pendingCityResponse() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
// Invented polygons near Auckland exercise streaming/geometry integration.
// They are test data, not representations of actual Auckland buildings.
function syntheticCityOSM(target, idBase = 800000) {
  const lon = target.lon, lat = target.lat;
  const ring = (x, y) => [[x, y], [x + 0.00012, y], [x + 0.00012, y + 0.00012], [x, y + 0.00012], [x, y]]
    .map(([lon, lat]) => ({ lon, lat }));
  return { version: 0.6, generator: 'SkySchool invented integration fixture',
    osm3s: { timestamp_osm_base: '2026-10-15T00:00:00Z' }, elements: [
      { type: 'way', id: idBase, tags: { building: 'commercial', height: '40 ft' }, geometry: ring(lon - 0.0003, lat - 0.0001) },
      { type: 'way', id: idBase + 1, tags: { building: 'apartments', 'building:levels': '3' }, geometry: ring(lon + 0.0002, lat - 0.0001) },
      { type: 'way', id: idBase + 2, tags: { highway: 'residential' },
        geometry: [{ lon: lon - 0.0005, lat: lat + 0.0002 }, { lon: lon + 0.0005, lat: lat + 0.0002 }] },
    ] };
}
function assertStandardCityScenery(scene) {
  const clusters = scene.children.filter(item => item.userData?.geo && item.userData?.mats);
  expect(clusters.length).toBeGreaterThan(0); expect(clusters.length).toBeLessThanOrEqual(5);
  expect(clusters.some(cluster => buildings(cluster).some(building => building.visible))).toBe(true);
}

const streamedAuckland = { id: 'fixture-auckland-west', name: 'Auckland fixture west', lat: -36.89, lon: 174.72 };
const streamedAucklandEast = { id: 'fixture-auckland-east', name: 'Auckland fixture east', lat: -36.89, lon: 174.726 };
const streamedCityId = target => api.getFlightCityTarget(target).id;

describe('SkySchool streamed city rendering integration', () => {
  it('prioritizes a ready nearby destination over a retained built-in district and restores the built-in after clearing', async () => {
    const pending = pendingCityResponse();
    const fetcher = vi.fn(() => pending.promise);
    configureCityProvider(fetcher);
    const hooks = await mountFlight({ cityOnline: true });
    const pack = api.FLIGHT_CITY_DISTRICTS[0];
    // An invented nearby destination beyond the loader's one-mile built-in
    // alias radius, but comfortably inside both districts' visibility radii.
    const target = { name: 'Nearby Portland fixture', lat: pack.lat + 0.03, lon: pack.lon - 0.04 };
    const scene = await draw(hooks, pack.lat, pack.lon);
    const districts = () => scene.children.filter(item => item.userData?.flightCityDistrict);
    const original = districts()[0];
    expect(original.userData.pack).toBe(pack);
    const geometries = original.children.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    const materials = original.userData.mats.map(material => vi.spyOn(material, 'dispose'));
    const credit = () => host.querySelector('[data-flightsim-map-attribution]');
    expect(credit()?.textContent).toBe('© OpenStreetMap');

    await React.act(async () => { patchFlightData({ cityDestination: target }); await settleCityWork(); });
    await draw(hooks, pack.lat, pack.lon);
    expect(hooks.getCityLoader().getState().phase).toBe('loading');
    expect(districts()).toEqual([original]);
    expect(credit()?.textContent).toBe('© OpenStreetMap');
    geometries.forEach(spy => expect(spy).not.toHaveBeenCalled());
    await React.act(async () => {
      pending.resolve(streamedCityResponse(syntheticCityOSM(target, 830000)).response);
      await settleCityWork();
    });
    await draw(hooks, pack.lat, pack.lon);
    const selected = districts()[0];
    expect(districts()).toHaveLength(1);
    expect(selected.userData.pack).toBe(hooks.getCityLoader().getPack());
    expect(selected.userData.flightCityDistrict).toBe(streamedCityId(target));
    expect(selected.children).toHaveLength(3);
    expect(selected.userData.stats.buildings + selected.userData.stats.roadSegments).toBeGreaterThan(0);
    geometries.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    materials.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(credit()?.textContent).toBe('© OpenStreetMap');

    // Attribution follows the geometry's source, independently of the
    // configured Overpass provider or the loader's generic "network" source.
    selected.userData.pack.metadata.source = 'OpenStreetMap via OpenFreeMap';
    await draw(hooks, pack.lat, pack.lon);
    expect(districts()[0]).toBe(selected);
    expect(credit()?.textContent).toBe('© OpenMapTiles · © OpenStreetMap');
    expect(credit().querySelector('a[href="https://openmaptiles.org/"]')).toBeTruthy();
    const selectedDisposals = selected.children.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    await React.act(async () => { patchFlightData({ cityDestination: null }); await settleCityWork(); });
    await draw(hooks, pack.lat, pack.lon);
    const restored = districts()[0];
    expect(districts()).toHaveLength(1);
    expect(restored.userData.pack).toBe(pack);
    expect(restored).not.toBe(original);
    selectedDisposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(credit()?.textContent).toBe('© OpenStreetMap');

    const restoredGeometry = restored.children[0].geometry;
    await React.act(async () => {
      patchFlightData({ cityDestination: { name: 'Portland alias fixture', lat: pack.lat, lon: pack.lon } });
      await settleCityWork();
    });
    expect(hooks.getCityLoader().getState().source).toBe('builtin');
    expect(hooks.getCityLoader().getPack()).not.toBe(pack); // Validator returns a copy.
    await draw(hooks, pack.lat, pack.lon);
    expect(districts()).toEqual([restored]);
    expect(restored.children[0].geometry).toBe(restoredGeometry);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('refreshes downloaded and cleared scenery in a paused frame without advancing flight', async () => {
    const pending = pendingCityResponse();
    const replacement = pendingCityResponse();
    const fetcher = vi.fn().mockImplementationOnce(() => pending.promise).mockImplementationOnce(() => replacement.promise);
    configureCityProvider(fetcher);
    const hooks = await mountFlight({ cityDestination: streamedAuckland, cityOnline: true });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    const pause = host.querySelector('button[aria-label="Pause flight"]');
    expect(pause).toBeTruthy();
    await React.act(async () => pause.click());
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    const pausedTime = hooks.timeRef.current;
    const heldRenders = renderer.render.mock.calls.length;
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(renderer.render.mock.calls.length).toBe(heldRenders);
    await React.act(async () => {
      pending.resolve(streamedCityResponse(syntheticCityOSM(streamedAuckland)).response);
      await settleCityWork();
    });
    expect(hooks.getCityLoader().getState().phase).toBe('ready');
    const scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(renderer.render.mock.calls.length).toBeGreaterThan(heldRenders);
    expect(scene.children.some(item => item.userData?.flightCityDistrict === streamedCityId(streamedAuckland))).toBe(true);
    expect(hooks.timeRef.current).toBe(pausedTime);
    const original = scene.children.find(item => item.userData?.flightCityDistrict === streamedCityId(streamedAuckland));
    await React.act(async () => { patchFlightData({ cityDestination: streamedAucklandEast }); await settleCityWork(); });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(hooks.getCityLoader().getState().phase).toBe('loading');
    expect(scene.children).toContain(original);
    const pendingPacks = hooks.getCityPacks();
    const retainedRenders = renderer.render.mock.calls.length;
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(renderer.render.mock.calls.length).toBe(retainedRenders);
    await React.act(async () => { patchFlightData({ cityDestination: null }); await settleCityWork(); });
    // Clearing a pending replacement does not change the builtin-only pack
    // array. Selection changes must independently invalidate the held frame.
    expect(hooks.getCityPacks()).toBe(pendingPacks);
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(renderer.render.mock.calls.length).toBeGreaterThan(retainedRenders);
    expect(scene.children.some(item => item.userData?.flightCityDistrict === streamedCityId(streamedAuckland))).toBe(false);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
    expect(hooks.timeRef.current).toBe(pausedTime);
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
    await React.act(async () => {
      replacement.resolve(streamedCityResponse(syntheticCityOSM(streamedAucklandEast)).response);
      await settleCityWork();
    });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(scene.children.some(item => item.userData?.flightCityDistrict)).toBe(false);
    expect(hooks.getCityLoader().getState().phase).toBe('idle');
    expect(hooks.timeRef.current).toBe(pausedTime);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('fetches only on approach, converts streamed OSM, and replaces/disposes the active district while fallback stays usable', async () => {
    const first = streamedCityResponse(syntheticCityOSM(streamedAuckland));
    const secondPending = pendingCityResponse();
    const fetcher = vi.fn().mockResolvedValueOnce(first.response).mockImplementationOnce(() => secondPending.promise);
    configureCityProvider(fetcher);
    const hooks = await mountFlight({ cityDestination: streamedAuckland, cityOnline: true });
    const loader = hooks.getCityLoader();
    await React.act(settleCityWork);
    await draw(hooks, streamedAuckland.lat + 1, streamedAuckland.lon);
    expect(fetcher).not.toHaveBeenCalled(); expect(loader.getState().phase).toBe('waiting');

    let scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    await React.act(settleCityWork);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(new URL(fetcher.mock.calls[0][0]).origin).toBe('https://city-data.example.test');
    expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'network' });
    expect(loader.getPack().buildings).toHaveLength(2);
    expect(loader.getPack().buildings[0]).toMatchObject({ id: 'way/800000', heightM: 12.2, heightSource: 'height' });
    expect(loader.getPack().buildings[1]).toMatchObject({ heightM: 9, heightSource: 'levels' });
    expect(first.reader.read.mock.calls.length).toBeGreaterThan(2);
    expect(first.reader.releaseLock).toHaveBeenCalledOnce();
    scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    const district = scene.children.find(item => item.userData?.flightCityDistrict === streamedCityId(streamedAuckland));
    expect(district).toBeTruthy(); expect(district.children).toHaveLength(3);
    expect(district.userData.stats).toMatchObject({ buildings: 2, drawCalls: 3 });
    expect(district.userData.stats.roadSegments).toBeGreaterThan(0);
    expect(district.userData.stats.vertices).toBeLessThan(2000);
    const disposals = district.children.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    const materialDisposals = district.userData.mats.map(material => vi.spyOn(material, 'dispose'));
    district.userData.pack.metadata.source = 'OpenStreetMap via OpenFreeMap';
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);

    await React.act(async () => { patchFlightData({ cityDestination: streamedAucklandEast }); await settleCityWork(); });
    scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(loader.getState().phase).toBe('loading'); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(loader.getPack()).toBeNull(); // Selected destination status stays truthful.
    expect(scene.children.filter(item => item.userData?.flightCityDistrict)).toEqual([district]);
    expect(hooks.getCityPacks().some(pack => pack.id === streamedCityId(streamedAuckland))).toBe(false);
    expect(host.querySelector('[data-flightsim-map-attribution]')?.textContent).toBe('© OpenMapTiles · © OpenStreetMap');
    disposals.forEach(spy => expect(spy).not.toHaveBeenCalled());
    materialDisposals.forEach(spy => expect(spy).not.toHaveBeenCalled());
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(fetcher).toHaveBeenCalledTimes(2);
    assertStandardCityScenery(scene);
    await React.act(async () => {
      secondPending.resolve(streamedCityResponse(syntheticCityOSM(streamedAucklandEast, 810000)).response);
      await settleCityWork();
    });
    scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(loader.getState().phase).toBe('ready');
    const active = scene.children.filter(item => item.userData?.flightCityDistrict);
    expect(active).toHaveLength(1); expect(active[0].userData.flightCityDistrict).toBe(streamedCityId(streamedAucklandEast));
    expect(active[0].children).toHaveLength(3); expect(active[0].userData.stats.buildings).toBe(2);
    expect(hooks.getCityPacks().some(pack => pack.id === streamedCityId(streamedAuckland))).toBe(false);
    disposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    materialDisposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    expect(host.querySelector('[data-flightsim-map-attribution]')?.textContent).toBe('© OpenStreetMap');
  });

  it('ignores abandoned responses and retains nearby rendered detail through provider failure until leaving the district', async () => {
    const stale = pendingCityResponse();
    const fetcher = vi.fn().mockImplementationOnce(() => stale.promise)
      .mockResolvedValueOnce(streamedCityResponse(syntheticCityOSM(streamedAucklandEast, 820000)).response)
      .mockRejectedValueOnce(new Error('fixture provider outage'));
    configureCityProvider(fetcher);
    const hooks = await mountFlight({ cityDestination: streamedAuckland, cityOnline: true });
    const loader = hooks.getCityLoader();
    await React.act(settleCityWork);
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(loader.getState().phase).toBe('loading');
    const oldSignal = fetcher.mock.calls[0][1].signal;
    await React.act(async () => { patchFlightData({ cityDestination: streamedAucklandEast }); await settleCityWork(); });
    await draw(hooks, streamedAucklandEast.lat, streamedAucklandEast.lon);
    await React.act(settleCityWork);
    expect(oldSignal.aborted).toBe(true);
    expect(loader.getState()).toMatchObject({ phase: 'ready', target: { id: streamedCityId(streamedAucklandEast) } });
    await React.act(async () => { stale.resolve(streamedCityResponse(syntheticCityOSM(streamedAuckland)).response); await settleCityWork(); });
    let scene = await draw(hooks, streamedAucklandEast.lat, streamedAucklandEast.lon);
    expect(loader.getPack().id).toBe(streamedCityId(streamedAucklandEast));
    expect(scene.children.filter(item => item.userData?.flightCityDistrict).map(item => item.userData.flightCityDistrict))
      .toEqual([streamedCityId(streamedAucklandEast)]);
    const retained = scene.children.find(item => item.userData?.flightCityDistrict === streamedCityId(streamedAucklandEast));
    const disposals = retained.children.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    const materialDisposals = retained.userData.mats.map(material => vi.spyOn(material, 'dispose'));

    const failed = { ...streamedAucklandEast, id: 'fixture-auckland-failed', name: 'Unavailable district fixture', lon: 174.732 };
    await React.act(async () => { patchFlightData({ cityDestination: failed }); await settleCityWork(); });
    await draw(hooks, failed.lat, failed.lon); await React.act(settleCityWork);
    scene = await draw(hooks, failed.lat, failed.lon);
    expect(loader.getState().phase).toBe('error'); expect(loader.getPack()).toBeNull();
    expect(scene.children.filter(item => item.userData?.flightCityDistrict)).toEqual([retained]);
    expect(host.querySelector('[data-flightsim-map-attribution]')?.textContent).toBe('© OpenStreetMap');
    disposals.forEach(spy => expect(spy).not.toHaveBeenCalled());
    assertStandardCityScenery(scene);
    await draw(hooks, failed.lat, failed.lon);
    await draw(hooks, failed.lat + 0.28, failed.lon); // Beyond the retained district's 16 nm exit.
    expect(scene.children.filter(item => item.userData?.flightCityDistrict)).toHaveLength(0);
    disposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    materialDisposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    await draw(hooks, failed.lat, failed.lon);
    expect(scene.children.filter(item => item.userData?.flightCityDistrict)).toHaveLength(0);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
    assertStandardCityScenery(scene);
    expect(fetcher).toHaveBeenCalledTimes(3); // No frame-by-frame retry storm.
  });

  it('keeps nearby scenery when online loading is disabled but releases it on a new flight', async () => {
    const replacement = pendingCityResponse();
    const fetcher = vi.fn().mockResolvedValueOnce(streamedCityResponse(syntheticCityOSM(streamedAuckland)).response)
      .mockImplementationOnce(() => replacement.promise);
    configureCityProvider(fetcher);
    const hooks = await mountFlight({ cityDestination: streamedAuckland, cityOnline: true });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    await React.act(settleCityWork);
    const scene = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    const retained = scene.children.find(item => item.userData?.flightCityDistrict === streamedCityId(streamedAuckland));
    expect(retained).toBeTruthy();
    const disposals = retained.children.map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    await React.act(async () => { patchFlightData({ cityDestination: streamedAucklandEast }); await settleCityWork(); });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(hooks.getCityLoader().getState().phase).toBe('loading');
    await React.act(async () => { patchFlightData({ cityOnline: false }); await settleCityWork(); });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(hooks.getCityLoader().getState().phase).toBe('offline');
    expect(hooks.getCityLoader().getPack()).toBeNull();
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
    expect(scene.children.filter(item => item.userData?.flightCityDistrict)).toEqual([retained]);
    disposals.forEach(spy => expect(spy).not.toHaveBeenCalled());
    await React.act(async () => { patchFlightData({ view: 'menu' }); await settleCityWork(); });
    disposals.forEach(spy => expect(spy).toHaveBeenCalledOnce());
    await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
    const restarted = await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(restarted).not.toBe(scene);
    expect(restarted.children.filter(item => item.userData?.flightCityDistrict)).toHaveLength(0);
    expect(host.querySelector('[data-flightsim-map-attribution]')).toBeNull();
    await React.act(async () => {
      replacement.resolve(streamedCityResponse(syntheticCityOSM(streamedAucklandEast)).response);
      await settleCityWork();
    });
    await draw(hooks, streamedAuckland.lat, streamedAuckland.lon);
    expect(restarted.children.filter(item => item.userData?.flightCityDistrict)).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('passes the retained real OSM subset through the streaming loader and the production converter', async () => {
    const real = JSON.parse(readFileSync('tests/fixtures/skyschool_live_city_small.json', 'utf8'));
    const stream = streamedCityResponse(real), fetcher = vi.fn(async () => stream.response);
    vi.stubGlobal('TextDecoder', TextDecoder);
    // No builtinPacks here: specifically exercise acquisition/conversion, not
    // the separately tested Portland offline shortcut.
    const loader = api.createFlightCityLoader({ fetch: fetcher,
      endpoints: { overpassUrl: 'https://city-data.example.test/api/interpreter' } });
    try {
      loader.select({ id: 'fixture-retained-portland', name: 'Retained Portland OSM subset', lat: 43.656, lon: -70.258 }, true);
      loader.approach(43.656, -70.258); await settleCityWork();
      expect(loader.getState()).toMatchObject({ phase: 'ready', source: 'network' });
      const pack = loader.getPack();
      expect(pack.buildings).toHaveLength(4); expect(pack.roads).toHaveLength(1);
      expect(pack.buildings.find(building => building.id === 'way/348747900'))
        .toMatchObject({ heightM: 9, heightSource: 'levels' });
      expect(pack.roads[0]).toMatchObject({ id: 'way/11390906', widthM: 7 });
      expect(pack.metadata.osmBaseTimestamp).toBe(real.osm3s.timestamp_osm_base);
      expect(pack.metadata.attribution).toBe('© OpenStreetMap contributors');
      expect(fetcher).toHaveBeenCalledOnce(); expect(stream.reader.releaseLock).toHaveBeenCalledOnce();
    } finally { loader.dispose(); }
  });
});
