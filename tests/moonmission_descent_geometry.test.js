import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const THREE = require(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'utf8');

// Extract the renderer's CPU geometry helpers without constructing a WebGL
// context. The lander and foot geometry are the actual shared Apollo model.
function extract(name, indent) {
  const spaces = ' '.repeat(indent);
  const match = source.match(new RegExp('^' + spaces + 'function ' + name + '\\([^\\n]*\\) \\{[\\s\\S]*?^' + spaces + '\\}', 'm'));
  if (!match) throw new Error('Missing geometry helper: ' + name);
  return match[0];
}
const drawing = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => { target[key] = value; return true; } });
const canvasDocument = { createElement: () => ({ setAttribute() {}, getContext: () => drawing }) };
const helpers = new Function('THREE', 'document', [
  extract('mmLunarRng', 2), extract('mmBuildSurfaceLM', 2),
  extract('landingPadSamples', 4), extract('landingPadSupport', 4),
  'return { build: mmBuildSurfaceLM, samples: landingPadSamples, support: landingPadSupport };',
].join('\n'))(THREE, canvasDocument);
const hardware = helpers.build(THREE, null, true);
hardware.position.y = -2.2 - 0.02 * 0.78;
const pads = helpers.samples(hardware);

function clearances(bank, height, terrain, x = 0, z = 0) {
  // Three's real matrix transform is independent of the support helper's
  // scalar rotation math, so sign errors and missing rim vertices are caught.
  const matrix = new THREE.Matrix4().makeRotationZ(-bank);
  return pads.map(p => {
    const world = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(matrix);
    return height + world.y - terrain(x + world.x, z + world.z);
  });
}

afterAll(() => {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  hardware.traverse(part => {
    if (part.geometry) geometries.add(part.geometry);
    if (part.material) materials.add(part.material);
  });
  materials.forEach(material => { if (material.map) textures.add(material.map); if (material.bumpMap) textures.add(material.bumpMap); material.dispose(); });
  geometries.forEach(geometry => geometry.dispose());
  textures.forEach(texture => texture.dispose());
});

describe('descent lander contact geometry', () => {
  it('samples all four actual pad rims and keeps a level touchdown at its existing height', () => {
    expect(pads.length).toBeGreaterThan(100);
    const terrain = () => 37;
    const height = helpers.support(pads, 0, terrain, 0, 0);
    expect(height).toBeCloseTo(39.2, 6);
    expect(Math.min(...clearances(0, height, terrain))).toBeCloseTo(0, 8);
  });

  for (const bank of [-0.35, 0.35]) {
    it('supports the lowest foot at a ' + bank + ' radian bank without changing bank', () => {
      const terrain = () => 37;
      // This is the original defect: zero-bank placement embeds a foot by
      // more than one scene unit when the craft reaches the ground tilted.
      expect(Math.min(...clearances(bank, 39.2, terrain))).toBeLessThan(-1);
      const height = helpers.support(pads, bank, terrain, 0, 0);
      const gaps = clearances(bank, height, terrain);
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(-1e-8);
      expect(Math.min(...gaps)).toBeCloseTo(0, 8);
      expect(height).toBeGreaterThan(40.3);
    });
  }

  for (const bank of [-0.4, 0, 0.4]) {
    it('preserves altitude clearance above tilted pads on local relief at bank ' + bank, () => {
      const terrain = (x, z) => 41 + 0.12 * x - 0.08 * z;
      const x = 18, z = -7, support = helpers.support(pads, bank, terrain, x, z);
      for (const altitudeClearance of [0, 2, 12]) {
        const gaps = clearances(bank, support + altitudeClearance, terrain, x, z);
        expect(Math.min(...gaps)).toBeCloseTo(altitudeClearance, 8);
        expect(gaps.every(gap => gap >= altitudeClearance - 1e-8)).toBe(true);
      }
      const higherTerrain = (px, pz) => terrain(px, pz) + 87;
      expect(helpers.support(pads, bank, higherTerrain, x, z) - support).toBeCloseTo(87, 8);
    });
  }
});
