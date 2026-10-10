import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync(process.env.SCALE_EARTH_NIGHT_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const marker = "  window.StemLab.registerTool('scaleExplorer', {";
if (!source.includes(marker)) throw new Error('Scale Explorer registration marker was not found');
const sandbox = {window: {StemLab: {registerTool() {}}}, console: {log() {}}};
vm.runInNewContext(source.replace(marker, '  window.earthNightChecks={material:earthNightMaterial,paint:earthNightPaint,value:earthLightsValue,details:atlasDetails,observations:readObservations,drafts:readObservationDrafts};\n' + marker), sandbox);
const api = sandbox.window.earthNightChecks;
const S = (key, fallback) => fallback;

function fixture() {
  const model = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  const placeholder = new THREE.Texture();
  const data = api.material(THREE, material, placeholder);
  model.userData.earthNight = data;
  return {model, material, placeholder, data};
}

function expectDirection(actual, expected) {
  actual.toArray().forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
  expect(actual.length()).toBeCloseTo(1, 12);
}

describe('Scale Explorer Earth night lighting', () => {
  it('keeps the placeholder dark until imagery is ready and updates the compiled uniforms in place', () => {
    const {model, material, placeholder, data} = fixture();
    const shader = {
      uniforms: {existing: {value: 3}},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader
    };
    material.onBeforeCompile(shader);
    expect(data.status).toBe('loading');
    expect(data.enabled).toBe(false);
    expect(shader.uniforms.earthNightMap.value).toBe(placeholder);
    expect(shader.uniforms.earthNightEnabled.value).toBe(0);
    expect(shader.uniforms.existing.value).toBe(3);

    const loadedMap = new THREE.Texture();
    data.uniforms.earthNightMap.value = loadedMap;
    data.status = 'ready';
    api.paint(model, new THREE.Vector3(0, 0, 5), true);
    expect(shader.uniforms.earthNightMap.value).toBe(loadedMap);
    expect(shader.uniforms.earthNightEnabled.value).toBe(1);
    expectDirection(shader.uniforms.earthSunLocal.value, [0, 0, 1]);
    api.paint(model, new THREE.Vector3(0, 0, 5), false);
    expect(shader.uniforms.earthNightEnabled.value).toBe(0);
  });

  it('ignores globe translation and normalizes the Sun direction under uniform scale', () => {
    const {model, data} = fixture();
    model.position.set(120, -74, 350);
    model.scale.setScalar(7.5);
    const sun = new THREE.Vector3(3, 4, 0);
    api.paint(model, sun, true);
    expectDirection(data.uniforms.earthSunLocal.value, [.6, .8, 0]);
    expect(sun.toArray()).toEqual([3, 4, 0]);

    model.position.set(-850, 600, 41);
    model.scale.setScalar(.025);
    api.paint(model, sun, true);
    expectDirection(data.uniforms.earthSunLocal.value, [.6, .8, 0]);
  });

  it('turns a world-space Sun direction into the rotated globe frame on every update', () => {
    const {model, data} = fixture();
    const sun = new THREE.Vector3(0, 0, 1);
    model.position.set(11, -30, 26);
    model.scale.setScalar(4);
    for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2, .37, 0]) {
      model.rotation.set(0, angle, 0);
      api.paint(model, sun, true);
      expectDirection(data.uniforms.earthSunLocal.value, [-Math.sin(angle), 0, Math.cos(angle)]);
    }
    expect(sun.toArray()).toEqual([0, 0, 1]);
  });

  it('includes parent rotation, translation and scale even before a renderer updates matrices', () => {
    const {model, data} = fixture();
    const parent = new THREE.Group();
    parent.add(model);
    parent.position.set(-7, 19, 58);
    parent.scale.setScalar(3);
    parent.rotation.set(0, Math.PI / 2, 0);
    model.position.set(15, -2, 8);
    model.scale.setScalar(.4);
    model.rotation.set(Math.PI / 2, 0, 0);
    const sun = new THREE.Vector3(0, 1, 0);
    api.paint(model, sun, true);
    expectDirection(data.uniforms.earthSunLocal.value, [0, 0, -1]);

    parent.rotation.set(0, 0, Math.PI / 2);
    api.paint(model, sun, true);
    expectDirection(data.uniforms.earthSunLocal.value, [1, 0, 0]);
    expect(sun.toArray()).toEqual([0, 1, 0]);
  });

  it('requires both ready imagery and the enabled setting, including after a ready-to-failed transition', () => {
    const {model, data} = fixture();
    const sun = new THREE.Vector3(0, 1, 0);
    for (const status of ['loading', 'ready', 'failed', 'ready']) {
      data.status = status;
      for (const enabled of [true, false, true]) {
        api.paint(model, sun, enabled);
        const expected = status === 'ready' && enabled;
        expect(data.enabled).toBe(expected);
        expect(data.uniforms.earthNightEnabled.value).toBe(expected ? 1 : 0);
      }
    }
  });

  it('leaves models without a night layer alone', () => {
    const model = new THREE.Group();
    const sun = new THREE.Vector3(2, 3, 4);
    expect(() => api.paint(model, sun, true)).not.toThrow();
    expect(model.userData).toEqual({});
    expect(sun.toArray()).toEqual([2, 3, 4]);
  });
});

describe('Scale Explorer Earth night notebook restoration', () => {
  it('preserves an explicit false setting and defaults older or malformed settings to enabled', () => {
    expect(api.value(false)).toBe(false);
    for (const value of [true, undefined, null, 'false', 'true', '', 0, 1, NaN, Infinity, {}, []]) {
      expect(api.value(value)).toBe(true);
      const [note] = api.observations([{itemId: 'earth', earthLights: value}]);
      expect(note.earthLights).toBe(true);
    }
    expect(api.observations([{itemId: 'earth'}])[0].earthLights).toBe(true);
    expect(api.observations([{itemId: 'earth', earthLights: false}])[0].earthLights).toBe(false);
  });

  it('restores night destinations, sunlight and saved visibility without changing the input', () => {
    const input = [
      {itemId: 'earth', detailId: 'nile-night', earthLights: true, sunAngle: 155, zoom: 2.5, note: 'A narrow ribbon beside the desert.'},
      {itemId: 'earth', detailId: 'japan-night', earthLights: false, sunAngle: 180, zoom: 2.5},
      {itemId: 'earth', detailId: 'america-night', sunAngle: 90, zoom: 2},
      {itemId: 'earth', detailId: 'imaginary-night', earthLights: true}
    ];
    const before = JSON.stringify(input);
    const notes = api.observations(input);
    expect(Array.from(notes, note => [note.detailId, note.earthLights, note.sunAngle, note.zoom])).toEqual([
      ['nile-night', true, 155, 2.5], ['japan-night', false, 180, 2.5], ['america-night', true, 90, 2]
    ]);
    expect(notes[0].note).toBe(input[0].note);
    expect(notes[0]).not.toBe(input[0]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('omits Earth light settings from other worlds', () => {
    const notes = api.observations([
      {itemId: 'moon', detailId: 'tycho', earthLights: false},
      {itemId: 'jupiter', detailId: 'red-spot', earthLights: true},
      {itemId: 'sun', earthLights: false},
      {itemId: 'solar-system', earthLights: true}
    ]);
    expect(notes).toHaveLength(4);
    for (const note of notes) expect(note).not.toHaveProperty('earthLights');
  });

  it('keeps drafts for each night destination and rejects an unknown destination', () => {
    expect(api.drafts({
      'earth:nile-night': 'River and delta', 'earth:japan-night': 'Coastal clusters',
      'earth:america-night': 'Atlantic cities', 'earth:imaginary-night': 'Unknown'
    })).toEqual({
      'earth:nile-night': 'River and delta', 'earth:japan-night': 'Coastal clusters',
      'earth:america-night': 'Atlantic cities'
    });
  });
});

describe('Scale Explorer Earth night destinations', () => {
  it('places all three night destinations at the intended geographic coordinates on the globe surface', () => {
    const all = api.details('earth', S);
    const destinations = all.filter(detail => detail.night);
    const expected = {
      'nile-night': {longitude: 31.2, latitude: 27},
      'japan-night': {longitude: 137, latitude: 35},
      'america-night': {longitude: -82, latitude: 38}
    };
    expect(Array.from(destinations, detail => detail.id).sort()).toEqual(Object.keys(expected).sort());
    for (const detail of destinations) {
      expect(detail.surface).toBe(true);
      expect(detail.at).toHaveLength(3);
      expect(detail.at.every(Number.isFinite)).toBe(true);
      const [x, y, z] = detail.at;
      const radius = Math.hypot(x, y, z);
      expect(radius).toBeCloseTo(.503, 12);
      // Globe convention: Greenwich is +X; east longitudes turn toward -Z.
      const longitude = Math.atan2(-z, x) * 180 / Math.PI;
      const latitude = Math.asin(y / radius) * 180 / Math.PI;
      expect(longitude).toBeCloseTo(expected[detail.id].longitude, 8);
      expect(latitude).toBeCloseTo(expected[detail.id].latitude, 8);
      expect(detail.zoom).toBeGreaterThan(1);
      expect(detail.zoom).toBeLessThanOrEqual(2.5);
    }
  });

  it('retains the daytime Earth landmarks alongside the night destinations', () => {
    const all = api.details('earth', S);
    for (const id of ['himalaya', 'arizona-canyon', 'pacific', 'sahara', 'greenland']) {
      const matches = all.filter(detail => detail.id === id);
      expect(matches).toHaveLength(1);
      expect(matches[0].night).not.toBe(true);
      expect(matches[0].at.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...matches[0].at)).toBeCloseTo(.503, 12);
    }
  });
});
