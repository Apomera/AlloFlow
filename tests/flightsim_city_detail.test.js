import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
let api;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});

function terrain(height = 50, coverage = 1) {
  const geo = new Three.PlaneGeometry(2000, 2000, 10, 10);
  for (let i = 0; i < geo.attributes.position.count; i++) geo.attributes.position.setZ(i, height);
  geo.setAttribute('landCoverage', new Three.Float32BufferAttribute(Array(121).fill(coverage), 1));
  const mesh = new Three.Mesh(geo, new Three.MeshBasicMaterial({ side: Three.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.surfaceVersion = 1;
  return mesh;
}
function packWithHole() {
  const lat = 40, lon = -100, cos = Math.cos(lat * Math.PI / 180);
  const geo = ([x, z]) => [lon + x / (364800 * cos), lat - z / 364800];
  return { id: 'test', lat, lon, buildings: [{ id: 'test:1', heightM: 20, style: 0,
    rings: [[[-100,-100],[100,-100],[100,100],[-100,100]], [[-30,-30],[-30,30],[30,30],[30,-30]]].map(r => r.map(geo)) }],
    roads: [{ id: 'test:road', widthM: 8, points: [[-400,300],[400,300]].map(geo) }] };
}
function district(pack, ground) {
  const group = api.createFlightCityDistrict(Three, pack, { x: 0, z: 0 }, pack.lat);
  api.updateFlightCityDistrictSurface(group, Three, ground);
  group.updateMatrixWorld(true);
  return group;
}
function dispose(group, ground) {
  api.disposeFlightCityDistrict(group); ground.geometry.dispose(); ground.material.dispose();
}

describe('offline geographic city geometry', () => {
  it('embeds the exact reproducible bounded pack, with honest height provenance', () => {
    const file = JSON.parse(readFileSync('vendor/skyschool-cities/portland.json', 'utf8'));
    expect(api.FLIGHT_CITY_DISTRICTS).toEqual([file]);
    expect(file.buildings.length).toBeGreaterThan(1500);
    expect(file.buildings.length).toBeLessThanOrEqual(2500);
    expect(file.roads.length).toBeGreaterThan(200);
    expect(file.roads.length).toBeLessThanOrEqual(1200);
    expect(new Set(file.buildings.map(b => b.id)).size).toBe(file.buildings.length);
    expect(file.buildings.some(b => b.rings.length > 1)).toBe(true);
    for (const b of file.buildings) {
      expect(['height', 'levels', 'estimated']).toContain(b.heightSource);
      expect(b.heightM).toBeGreaterThan(0);
      expect(b.heightM).toBeLessThanOrEqual(300);
      for (const ring of b.rings) {
        expect(ring.length).toBeGreaterThanOrEqual(3);
        expect(ring.length).toBeLessThanOrEqual(96);
        expect(ring.at(-1)).not.toEqual(ring[0]);
        for (const [lon,lat] of ring) {
          expect(lat).toBeGreaterThanOrEqual(file.bbox[0]); expect(lat).toBeLessThanOrEqual(file.bbox[2]);
          expect(lon).toBeGreaterThanOrEqual(file.bbox[1]); expect(lon).toBeLessThanOrEqual(file.bbox[3]);
        }
      }
    }
  });

  it('preserves a real polygon courtyard and outward wall/upward roof normals in three merged meshes', () => {
    const ground = terrain(), group = district(packWithHole(), ground);
    try {
      expect(group.children).toHaveLength(3);
      expect(group.userData.stats.buildings).toBe(1);
      expect(group.userData.stats.roadSegments).toBeGreaterThan(1);
      const roof = group.children[1];
      const ray = new Three.Raycaster(new Three.Vector3(0, 500, 0), new Three.Vector3(0,-1,0));
      expect(ray.intersectObject(roof)).toHaveLength(0);
      ray.ray.origin.set(60,500,0);
      const hits = ray.intersectObject(roof);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].point.y).toBeCloseTo(50 + 20 * 3.28084, 4);
      for (const mesh of group.children) {
        expect([...mesh.geometry.attributes.position.array].every(Number.isFinite)).toBe(true);
        expect(mesh.geometry.attributes.color.count).toBe(mesh.geometry.attributes.position.count);
      }
      for (let i=0;i<roof.geometry.attributes.normal.count;i++) expect(roof.geometry.attributes.normal.getY(i)).toBeCloseTo(1);
      const outerRay = new Three.Raycaster(new Three.Vector3(200,70,0), new Three.Vector3(-1,0,0));
      expect(outerRay.intersectObject(group.children[0]).length).toBeGreaterThan(0);
      const innerRay = new Three.Raycaster(new Three.Vector3(0,70,0), new Three.Vector3(1,0,0));
      expect(innerRay.intersectObject(group.children[0]).length).toBeGreaterThan(0);
    } finally { dispose(group,ground); }
  });

  it('rejects wet rendered terrain and rebuilds after a terrain revision without accumulating buffers', () => {
    const ground = terrain(), group = district(packWithHole(), ground);
    try {
      const geometry = group.children[0].geometry;
      const initialCoverage = group.userData.cityCoverage;
      expect(api.flightCityCoverageOverlaps(initialCoverage, -100, -100, 100, 100)).toBe(true);
      expect(api.flightCityCoverageOverlaps(initialCoverage, 500, 500, 600, 600)).toBe(false);
      const spy = vi.spyOn(geometry, 'dispose');
      expect(api.updateFlightCityDistrictSurface(group,Three,ground)).toBe(false);
      expect(spy).not.toHaveBeenCalled();
      ground.geometry.attributes.landCoverage.array.fill(0);
      ground.userData.surfaceVersion++;
      expect(api.updateFlightCityDistrictSurface(group,Three,ground)).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(group.userData.stats.buildings).toBe(0);
      expect(group.userData.stats.roadSegments).toBe(0);
      expect(group.userData.cityCoverage).not.toBe(initialCoverage);
      expect(group.userData.cityCoverage.rectangles).toHaveLength(0);
      expect(api.flightCityCoverageOverlaps(group.userData.cityCoverage, -100, -100, 100, 100)).toBe(false);
      expect(group.children.every(m => !m.visible)).toBe(true);
      ground.geometry.attributes.landCoverage.array.fill(1);
      for(let i=0;i<121;i++) ground.geometry.attributes.position.setZ(i,-28);
      ground.userData.surfaceVersion++;
      api.updateFlightCityDistrictSurface(group,Three,ground);
      expect(group.userData.stats.buildings).toBe(1);
      expect(api.flightCityCoverageOverlaps(group.userData.cityCoverage, -100, -100, 100, 100)).toBe(true);
      expect(group.children[0].geometry.attributes.position.getY(0)).toBeCloseTo(-29);
    } finally { dispose(group,ground); }
  });

  it('follows actual terrain triangle slopes and rejects cliffs rather than hovering', () => {
    const ground = terrain(), pack = packWithHole();
    for(let i=0;i<121;i++) ground.geometry.attributes.position.setZ(i,50+ground.geometry.attributes.position.getX(i)*0.05);
    const group = district(pack,ground);
    try {
      expect(group.userData.stats.buildings).toBe(1);
      const road = group.children[2].geometry.attributes.position;
      for(let i=0;i<road.count;i++) expect(road.getY(i)).toBeCloseTo(53+road.getX(i)*0.05,4);
      for(let i=0;i<121;i++) ground.geometry.attributes.position.setZ(i,50+ground.geometry.attributes.position.getX(i));
      ground.userData.surfaceVersion++;
      api.updateFlightCityDistrictSurface(group,Three,ground);
      expect(group.userData.stats.buildings).toBe(0);
    } finally { dispose(group,ground); }
  });

  it('disposes every district buffer and material when evicted', () => {
    const ground = terrain(), group = district(packWithHole(),ground);
    const spies = group.children.map(m => vi.spyOn(m.geometry,'dispose')).concat(group.userData.mats.map(m=>vi.spyOn(m,'dispose')));
    dispose(group,ground);
    spies.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
  });

  it('anchors mapped floors above sloping foundations, including courtyard walls, through elevation rebuilds', () => {
    const ground = terrain(), pack = packWithHole();
    for (let i = 0; i < 121; i++) ground.geometry.attributes.position.setZ(i, 50 + ground.geometry.attributes.position.getX(i) * 0.05);
    const group = district(pack, ground);
    try {
      const walls = group.children[0], initial = walls.geometry;
      const positions = initial.attributes.position, bounds = initial.attributes.flightFacadeBounds;
      expect(walls.material.defines.FLIGHT_FACADE_BOUNDS).toBe(1);
      expect(group.children.slice(1).every(mesh => !mesh.material.defines?.FLIGHT_FACADE_BOUNDS)).toBe(true);
      expect(bounds.itemSize).toBe(2);
      expect(bounds.count).toBe(48); // Four outer walls and four courtyard walls, two triangles each.
      expect(bounds.count).toBe(positions.count);
      const relativeHeights = [];
      for (let i = 0; i < bounds.count; i++) {
        expect(bounds.getX(i)).toBeCloseTo(55, 3);
        expect(bounds.getY(i)).toBeCloseTo(55 + 20 * 3.28084, 3);
        relativeHeights.push(positions.getY(i) - bounds.getX(i));
      }
      expect(Math.min(...relativeHeights)).toBeCloseTo(-11, 3);
      const disposeOld = vi.spyOn(initial, 'dispose');
      for (let i = 0; i < 121; i++) ground.geometry.attributes.position.setZ(i, ground.geometry.attributes.position.getZ(i) + 325);
      ground.userData.surfaceVersion++;
      api.updateFlightCityDistrictSurface(group, Three, ground);
      expect(disposeOld).toHaveBeenCalledTimes(1);
      const next = walls.geometry;
      expect(next.attributes.flightFacadeBounds.count).toBe(next.attributes.position.count);
      for (let i = 0; i < bounds.count; i++) {
        expect(next.attributes.flightFacadeBounds.getX(i)).toBeCloseTo(380, 3);
        expect(next.attributes.position.getY(i) - next.attributes.flightFacadeBounds.getX(i)).toBeCloseTo(relativeHeights[i], 3);
      }
      expect(group.children).toHaveLength(3);
      expect(group.userData.stats.drawCalls).toBe(3);
    } finally { dispose(group, ground); }
  });

  it('patches the actual Lambert shader with stable physical window scale and dark roofs', () => {
    const material = new Three.MeshLambertMaterial();
    api.attachFlightCityFacade(material,Three);
    const shader = {vertexShader:Three.ShaderLib.lambert.vertexShader,fragmentShader:Three.ShaderLib.lambert.fragmentShader};
    material.onBeforeCompile(shader,{});
    expect(material.userData.flightCityFacade.patched).toBe(true);
    expect(shader.vertexShader).toContain('modelMatrix * vec4(flightFacadeLocal.xyz, 0.0)');
    expect(shader.fragmentShader).toContain('totalEmissiveRadiance *= flightFacadeLight * flightFacadeWall');
    expect(shader.fragmentShader).toContain('fwidth(flightFacadeUV)');
    const hook = material.onBeforeCompile;
    api.attachFlightCityFacade(material,Three);
    expect(material.onBeforeCompile).toBe(hook);
    material.dispose();
  });
});
