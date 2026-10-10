import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync(process.env.SCALE_JUPITER_ATLAS_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const marker = "  window.StemLab.registerTool('scaleExplorer', {";
if (!source.includes(marker)) throw new Error('Scale Explorer registration marker was not found');
const sandbox = {window: {StemLab: {registerTool() {}}}, console: {log() {}}};
vm.runInNewContext(source.replace(marker, '  window.jupiterAtlasChecks={value:jupiterLatitudeValue,surface:jupiterSurfacePoint,geometry:jupiterGeometry,material:jupiterMapMaterial,polarRatio:JUPITER_POLAR_RATIO,details:atlasDetails,observations:readObservations,drafts:readObservationDrafts};\n' + marker), sandbox);
const api = sandbox.window.jupiterAtlasChecks;
const S = (key, fallback) => fallback;
const q = .935;
const details = latitude => api.details('jupiter', S, undefined, undefined, undefined, undefined, latitude);
const scan = latitude => details(latitude).find(detail => detail.id === 'jupiter-scan');

// Atlas positions are local to the globe. Jupiter's model applies its polar
// scale afterward; planetographic latitude is the resulting surface normal.
function globePoint(local) {
  const globe = new THREE.Group();
  globe.scale.y = q;
  globe.updateMatrixWorld(true);
  return new THREE.Vector3().fromArray(local).applyMatrix4(globe.matrixWorld);
}

function latitudeFromNormal(point, radius) {
  const normal = new THREE.Vector3(
    point.x / (radius * radius),
    point.y / (q * q * radius * radius),
    point.z / (radius * radius)
  );
  return Math.atan2(normal.y, Math.hypot(normal.x, normal.z)) * 180 / Math.PI;
}

function ellipsoidRadius(point, radius) {
  return Math.hypot(point.x / radius, point.y / (q * radius), point.z / radius);
}

describe('Scale Explorer Jupiter planetographic coordinates', () => {
  it('clamps the sweep to ±70 degrees and rounds to a tenth without coercing invalid values', () => {
    expect(api.polarRatio).toBe(q);
    for (const [input, expected] of [[-1000, -70], [-70, -70], [-22.46, -22.5], [0, 0], [14.26, 14.3], [70, 70], [1000, 70]]) {
      expect(api.value(input)).toBe(expected);
    }
    for (const input of [undefined, null, NaN, Infinity, -Infinity, '45', '', true, false, {}, [], [45]]) {
      expect(api.value(input)).toBe(0);
    }
  });

  it('places requested map latitudes on the oblate surface using the outward normal', () => {
    for (const u of [0, .09, .25, .4, .5, .648, .75, 1]) {
      for (const latitude of [-90, -70, -40, -22.4, 0, 14, 70, 90]) {
        const local = api.surface(u, (90 - latitude) / 180);
        expect(local).toHaveLength(3);
        expect(local.every(Number.isFinite)).toBe(true);
        const point = globePoint(local);
        expect(ellipsoidRadius(point, .503)).toBeCloseTo(1, 12);
        expect(latitudeFromNormal(point, .503)).toBeCloseTo(latitude, 10);
        if (Math.abs(latitude) < 90) {
          const longitude = Math.atan2(point.z, -point.x);
          expect(Math.sin(longitude)).toBeCloseTo(Math.sin(u * Math.PI * 2), 10);
          expect(Math.cos(longitude)).toBeCloseTo(Math.cos(u * Math.PI * 2), 10);
        }
      }
    }
  });

  it('keeps the catalog globe extents at 1 × .935 × 1 after the model polar scale', () => {
    const geometry = api.geometry(THREE);
    const material = new THREE.MeshStandardMaterial();
    const globe = new THREE.Group();
    globe.scale.y = q;
    globe.add(new THREE.Mesh(geometry, material));
    globe.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(globe);
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1, 7);
    expect(size.y).toBeCloseTo(q, 7);
    expect(size.z).toBeCloseTo(1, 7);
    expect(bounds.getCenter(new THREE.Vector3()).length()).toBeCloseTo(0, 7);
    geometry.dispose();
    material.dispose();
  });

  it('maps every sphere texture row to its planetographic latitude after flattening', () => {
    const geometry = api.geometry(THREE);
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const globe = new THREE.Group();
    globe.scale.y = q;
    globe.updateMatrixWorld(true);
    const point = new THREE.Vector3();
    let maxLatitudeError = 0;
    let maxRadiusError = 0;
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(globe.matrixWorld);
      const expectedLatitude = (uv.getY(index) - .5) * 180;
      maxLatitudeError = Math.max(maxLatitudeError, Math.abs(latitudeFromNormal(point, .5) - expectedLatitude));
      maxRadiusError = Math.max(maxRadiusError, Math.abs(ellipsoidRadius(point, .5) - 1));
    }
    expect(maxLatitudeError).toBeLessThan(.00002);
    expect(maxRadiusError).toBeLessThan(.000001);
    geometry.dispose();
  });

  it('keeps the published map limits in the bundled Three shader hooks', () => {
    const material = new THREE.MeshStandardMaterial();
    const existing = {value: 3};
    const shader = {
      uniforms: {existing},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    api.material(material);
    material.onBeforeCompile(shader);
    expect(shader.uniforms.existing).toBe(existing);
    expect(shader.vertexShader).toContain('#include <uv_vertex>');
    expect(shader.vertexShader).toMatch(/vJupiterMapLatitude\s*=\s*\(uv\.y\s*-\s*0\.5\)\s*\*\s*180\.0/);
    expect(shader.fragmentShader).toContain('#include <map_fragment>');
    expect(shader.fragmentShader).toContain('smoothstep(79.6, 79.9, abs(vJupiterMapLatitude))');
    expect(shader.fragmentShader).toMatch(/diffuseColor\.rgb\s*=\s*mix\(diffuseColor\.rgb,[^;]+polarMissing\)/);
    expect(material.customProgramCacheKey()).toBe('scale-jupiter-opal-v1');
    material.dispose();
  });
});

describe('Scale Explorer Jupiter cloud destinations', () => {
  it('places the fixed destinations at the intended cloud latitudes', () => {
    const expected = {'red-spot': -22.4, belts: 14, 'white-ovals': -40, 'equatorial-zone': 0};
    const all = details(53);
    expect(Array.from(all, detail => detail.id).sort()).toEqual([...Object.keys(expected), 'jupiter-scan'].sort());
    for (const [id, latitude] of Object.entries(expected)) {
      const detail = all.find(candidate => candidate.id === id);
      const point = globePoint(detail.at);
      expect(detail.surface).toBe(true);
      expect(ellipsoidRadius(point, .503)).toBeCloseTo(1, 12);
      expect(latitudeFromNormal(point, .503)).toBeCloseTo(latitude, 10);
      expect(detail.zoom).toBeGreaterThan(1);
    }
  });

  it('rebuilds the dynamic scan from the seventh details argument without moving fixed destinations', () => {
    const before = details(-62.3);
    const after = details(48.2);
    for (const input of [-100, -62.3, -22.46, 0, 48.2, 100, undefined, '48']) {
      const selected = scan(input);
      expect(selected.surface).toBe(true);
      expect(selected.marker).toBe(false);
      expect(selected.zoom).toBe(3);
      expect(latitudeFromNormal(globePoint(selected.at), .503)).toBeCloseTo(api.value(input), 10);
    }
    for (const detail of before.filter(candidate => candidate.id !== 'jupiter-scan')) {
      expect(after.find(candidate => candidate.id === detail.id).at).toEqual(detail.at);
    }
    expect(before.find(detail => detail.id === 'jupiter-scan').at).not.toEqual(after.find(detail => detail.id === 'jupiter-scan').at);
  });
});

describe('Scale Explorer Jupiter notebook restoration', () => {
  it('defaults older and malformed latitude and Earth-reference settings safely', () => {
    const [old] = api.observations([{itemId: 'jupiter', detailId: 'jupiter-scan'}]);
    expect(old.jupiterLatitude).toBe(0);
    expect(old.jupiterEarth).toBe(false);
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '45', true, false, {}, []]) {
      const [note] = api.observations([{itemId: 'jupiter', detailId: 'jupiter-scan', jupiterLatitude: value}]);
      expect(note.jupiterLatitude).toBe(0);
    }
    for (const value of [undefined, null, NaN, Infinity, 'true', 'false', '', 0, 1, false, {}, []]) {
      const [note] = api.observations([{itemId: 'jupiter', jupiterLatitude: 22.36, jupiterEarth: value}]);
      expect(note.jupiterLatitude).toBe(22.4);
      expect(note.jupiterEarth).toBe(false);
    }
    expect(api.observations([{itemId: 'jupiter', jupiterEarth: true}])[0].jupiterEarth).toBe(true);
  });

  it('restores the saved scan destination and bounded settings without changing the input', () => {
    for (const [latitude, expected] of [[-100, -70], [-22.46, -22.5], [0, 0], [48.24, 48.2], [100, 70]]) {
      const input = Object.freeze({itemId: 'jupiter', detailId: 'jupiter-scan', jupiterLatitude: latitude, jupiterEarth: true, zoom: 3, sunAngle: 110, note: 'Cloud bands at the selected latitude.'});
      const before = JSON.stringify(input);
      const [restored] = api.observations([input]);
      expect(restored).not.toBe(input);
      expect(restored).toMatchObject({itemId: 'jupiter', detailId: 'jupiter-scan', jupiterLatitude: expected, jupiterEarth: true, zoom: 3, sunAngle: 110, note: input.note});
      const destination = api.details(restored.itemId, S, undefined, undefined, undefined, undefined, restored.jupiterLatitude).find(detail => detail.id === restored.detailId);
      expect(latitudeFromNormal(globePoint(destination.at), .503)).toBeCloseTo(expected, 10);
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  it('preserves all valid Jupiter destinations and drafts while rejecting unknown destinations', () => {
    const ids = ['red-spot', 'belts', 'white-ovals', 'equatorial-zone', 'jupiter-scan'];
    const notes = api.observations([...ids, 'imaginary-storm'].map(detailId => ({itemId: 'jupiter', detailId, jupiterLatitude: -40, jupiterEarth: false})));
    expect(Array.from(notes, note => note.detailId)).toEqual(ids);
    for (const note of notes) {
      expect(note.jupiterLatitude).toBe(-40);
      expect(note.jupiterEarth).toBe(false);
    }
    const validDrafts = Object.fromEntries(ids.map(id => ['jupiter:' + id, 'Observed ' + id]));
    expect(api.drafts({...validDrafts, 'jupiter:imaginary-storm': 'Unknown'})).toEqual(validDrafts);
  });

  it('omits Jupiter settings from other worlds', () => {
    const notes = api.observations([
      {itemId: 'earth', detailId: 'nile-night', jupiterLatitude: 20, jupiterEarth: true},
      {itemId: 'moon', detailId: 'tycho', jupiterLatitude: -40, jupiterEarth: false},
      {itemId: 'sun', jupiterLatitude: 70, jupiterEarth: true},
      {itemId: 'solar-system', jupiterLatitude: -70, jupiterEarth: true}
    ]);
    expect(notes).toHaveLength(4);
    for (const note of notes) {
      expect(note).not.toHaveProperty('jupiterLatitude');
      expect(note).not.toHaveProperty('jupiterEarth');
    }
  });
});
