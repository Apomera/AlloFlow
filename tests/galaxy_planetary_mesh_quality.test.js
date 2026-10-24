import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Run the actual planetary builder and its production quality selection. A full
// galaxy mount adds random stars but cannot measure shell sampling error.
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const start = source.indexOf('            function makePlanetaryInspectionGeometry(');
const qualityStart = source.indexOf('            NEBULAE.forEach(function (neb) {', start);
const qualityEnd = source.indexOf('            });', qualityStart);
if (start < 0 || qualityStart < 0 || qualityEnd < 0) throw new Error('Planetary shell quality builder not found');
const end = qualityEnd + '            });'.length;
const builder = source.slice(start, qualityStart);
const buildScene = new Function('THREE', 'resolvedQuality', 'NEBULAE', 'galaxyType', 't', `
  var planetaryInspectionMeshes = [], nebGroup = { add() {} };
  var planetaryGasVertexShader = 'planetary vertex', planetaryGasFragmentShader = 'planetary gas';
  ${source.slice(start, end)}
  return planetaryInspectionMeshes;
`);
const buildSurface = new Function('THREE', 'kind', 'segments', 'bands', 'phase', builder + '\nreturn makePlanetaryInspectionGeometry(kind, segments, bands, phase);');
function vector() { return { set(x, y, z) { Object.assign(this, { x, y, z }); } }; }
const THREE = {
  BufferGeometry: class {
    attributes = {};
    setAttribute(name, attribute) { this.attributes[name] = attribute; return this; }
  },
  BufferAttribute: class {
    constructor(array, itemSize) { Object.assign(this, { array, itemSize, count: array.length / itemSize }); }
  },
  Color: class {
    constructor(value) { this.value = value; }
    convertSRGBToLinear() { return this; }
  },
  ShaderMaterial: class { constructor(options) { Object.assign(this, options); } },
  Mesh: class {
    constructor(geometry, material) { Object.assign(this, { geometry, material, position: vector(), scale: vector(), rotation: vector() }); }
  },
  AdditiveBlending: 'additive', DoubleSide: 'double',
};
const nebulae = [
  { name: 'Helix', type: 'Planetary', x: 0.25, y: -0.01, z: -0.3, r: 0.05 },
  { name: 'Ring', type: 'Planetary', x: -0.15, y: 0.03, z: 0.2, r: 0.04 },
  { name: 'Crab', type: 'Supernova Remnant', x: 0.1, y: 0, z: 0.2, r: 0.03 },
];
const translate = key => key === 'stem.galaxy.helix_nebula' ? 'Helix' : key;
const build = (quality, galaxyType = 'spiral') => buildScene(THREE, quality, nebulae, galaxyType, translate);
const qualityCases = [
  ['low', 48, 18, 32, 16, 16],
  ['balanced', 48, 18, 32, 16, 16],
  ['high', 64, 22, 44, 18, 16],
  ['cinematic', 80, 28, 56, 22, 18],
];
function sampled(geometry, u, v, attribute = 'position') {
  const uv = geometry.attributes.uv.array, values = geometry.attributes[attribute].array;
  for (let index = 0; index < uv.length; index += 2) {
    if (Math.abs(uv[index] - u) < 0.0000001 && Math.abs(uv[index + 1] - v) < 0.0000001) return Array.from(values.slice(index / 2 * 3, index / 2 * 3 + 3));
  }
  throw new Error('Shell sample missing at ' + u + ', ' + v);
}
function shellMetadata(record) {
  const object = record.object;
  const coordinates = value => ['x', 'y', 'z'].map(axis => value[axis]);
  return {
    owner: record.source, component: object.userData.component, name: object.name,
    position: coordinates(object.position), scale: coordinates(object.scale), rotation: coordinates(object.rotation),
    baseOpacity: object.userData.baseOpacity, illustrative: object.userData.illustrative,
    renderOrder: object.renderOrder, color: object.material.uniforms.uColor.value.value,
    seed: object.material.uniforms.uSeed.value,
  };
}
function midpointError(kind, segments, bands, phase) {
  const surface = buildSurface(THREE, kind, segments, bands, phase);
  const reference = buildSurface(THREE, kind, segments, bands * 2, phase);
  let error = 0;
  for (let index = 0; index < bands; index++) {
    const a = sampled(surface, 0, index / bands), b = sampled(surface, 0, (index + 1) / bands);
    const midpoint = sampled(reference, 0, (index + 0.5) / bands);
    error = Math.max(error, Math.hypot(...midpoint.map((value, axis) => value - (a[axis] + b[axis]) * 0.5)));
  }
  return error;
}

describe('Planetary close-up mesh quality', () => {
  it.each(qualityCases)('keeps %s silhouettes finite and deterministic within a small selected-object budget', (quality, segments, bands, secondarySegments, helixBands, envelopeBands) => {
    const records = build(quality), repeat = build(quality);
    expect(records).toHaveLength(4);
    const counts = records.map(record => record.object.geometry.attributes.position.count / 3);
    expect(counts).toEqual([segments * bands * 2, secondarySegments * helixBands * 2, segments * bands * 2, secondarySegments * envelopeBands * 2]);
    expect(counts[0] + counts[1]).toBeLessThanOrEqual(7000);
    expect(counts[2] + counts[3]).toBeLessThanOrEqual(7000);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(14000);
    for (let index = 0; index < records.length; index++) {
      const object = records[index].object, geometry = object.geometry;
      expect(object.visible).toBe(false);
      expect(object.userData.triangles).toBe(counts[index]);
      expect(object.material).toMatchObject({ transparent: true, depthWrite: false, depthTest: true, toneMapped: false, blending: 'additive', side: 'double' });
      for (const name of ['position', 'normal', 'uv']) {
        const attribute = geometry.attributes[name];
        expect(attribute.count).toBe(geometry.attributes.position.count);
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
        expect(attribute.array).toEqual(repeat[index].object.geometry.attributes[name].array);
      }
      const normals = geometry.attributes.normal.array;
      let error = 0;
      for (let at = 0; at < normals.length; at += 3) error = Math.max(error, Math.abs(Math.hypot(normals[at], normals[at + 1], normals[at + 2]) - 1));
      expect(error).toBeLessThan(0.000001);
    }
  });

  it('preserves owner identity, material, transform and the same parametric surfaces across quality', () => {
    const reference = build('balanced');
    expect(reference.map(record => record.object.userData.component)).toEqual(['thick-disk', 'inclined-disk', 'equatorial-shell', 'polar-envelope']);
    for (const [quality] of qualityCases) {
      const records = build(quality);
      for (let index = 0; index < records.length; index++) {
        expect(records[index].source).toBe(nebulae[index < 2 ? 0 : 1]);
        expect(records[index].object.userData.nebulaName).toBe(records[index].source.name);
        expect(shellMetadata(records[index])).toEqual(shellMetadata(reference[index]));
        // Every quality shares these exact UVs. Tessellation may refine the
        // silhouette but must not reshape, move or turn the schematic object.
        for (const u of [0, 0.25, 0.5, 0.75, 1]) for (const v of [0, 0.5, 1]) {
          for (const attribute of ['position', 'normal']) expect(sampled(records[index].object.geometry, u, v, attribute)).toEqual(sampled(reference[index].object.geometry, u, v, attribute));
        }
      }
    }
    expect(build('balanced', 'elliptical')).toEqual([]);
  });

  it.each(qualityCases.slice(1))('reduces %s curved cross-section error while retaining the original angular segments', (quality, segments, bands, secondarySegments, helixBands) => {
    const oldBands = quality === 'cinematic' ? 18 : quality === 'high' ? 14 : 12;
    for (const [kind, phase] of [['thick-disk', 0.6], ['equatorial-shell', 2.1]]) {
      expect(midpointError(kind, segments, bands, phase)).toBeLessThan(midpointError(kind, segments, oldBands, phase) * 0.6);
    }
    expect(midpointError('inclined-disk', secondarySegments, helixBands, 0.6)).toBeLessThan(midpointError('inclined-disk', secondarySegments, 12, 0.6) * 0.65);
  });
});
