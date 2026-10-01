import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const capture = source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__habitatArt = { dinoHabitatLandscape, dinoFernGeometry, dinoWaterNormalData, dinoHabitatWater, dinoHabitatClearingHeight, habitatProfileFor }; window.StemLab.registerTool('dinoLab'");
window.StemLab = { registerTool() {} };
new Function(capture)();
const art = globalThis.__habitatArt;
function vertices(group) {
  let count = 0, arrays = [];
  group.traverse(mesh => {
    if (!mesh.geometry) return;
    for (const attribute of Object.values(mesh.geometry.attributes)) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    count += mesh.geometry.attributes.position.count;
    arrays.push(Array.from(mesh.geometry.attributes.position.array));
  });
  return { count, arrays };
}
describe('Dino Lab interpretive habitat geometry', () => {
  for (const length of [0.3, 1.8, 12, 26, 40]) {
    it('keeps terrain and vegetation finite and deterministic at ' + length + ' meters', () => {
      const habitat = art.habitatProfileFor({ formation: 'Yixian' });
      const width = Math.max(26, length * 1.7), depth = Math.max(16, length * 0.95);
      const a = art.dinoHabitatLandscape(THREE, habitat, length, width, depth, 84);
      const b = art.dinoHabitatLandscape(THREE, habitat, length, width, depth, 84);
      expect(a.name).toBe('dinolab-habitat-landscape');
      const first = vertices(a); expect(first.count).toBeLessThan(40000);
      expect(first.arrays).toEqual(vertices(b).arrays);
      expect(a.children.filter(p => /ridge/.test(p.name))).toHaveLength(3);
      const floor = a.children.find(p => p.userData.dinoEnvironment === 'continuous-ground');
      const expected = new THREE.Color(habitat.ground).convertSRGBToLinear();
      expect(floor.geometry.attributes.color.getX(0)).toBeCloseTo(expected.r, 6);
      for (const tree of a.children.filter(p => /seed-plant/.test(p.name))) {
        expect(tree.position.z > 0 && Math.abs(tree.position.x) < Math.max(5.4, length * 0.65)).toBe(false);
      }
    });
  }
  it('uses pinnate fronds with finite normals and bounded foliage geometry', () => {
    for (const sparse of [true, false]) {
      const geometry = art.dinoFernGeometry(THREE, 1, 33, sparse);
      expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      expect(geometry.attributes.position.count).toBeGreaterThan(500);
      expect(geometry.boundingSphere.radius).toBeLessThan(2);
    }
  });
  it('carves wet habitat beds below the water and keeps dry clearing unchanged', () => {
    for (const formation of ['Kem Kem', 'Solnhofen', 'Yixian']) {
      const habitat = art.habitatProfileFor({ formation });
      const wet = art.dinoHabitatWater(THREE, habitat, 26, 16);
      expect(vertices(wet.group).count).toBeGreaterThan(150);
      const surface = wet.group.getObjectByName('dinolab-ripple-surface');
      const normals = surface.geometry.attributes.normal;
      for (let vertex = 0; vertex < normals.count; vertex++) expect(normals.getY(vertex)).toBeGreaterThan(0.99);
      expect(surface.material.normalMap.image.data.length).toBe(128 * 128 * 4);
      expect(wet.group.getObjectByName('dinolab-water-bank')).toBeTruthy();
      expect(art.dinoHabitatClearingHeight(habitat, 26, 16, 26 * 0.27, 16 * 0.35)).toBeLessThanOrEqual(-0.025);
      expect(art.dinoHabitatClearingHeight(habitat, 26, 16, 0, 0)).toBe(0);
    }
    expect(art.habitatProfileFor({formation:'Djadochta'}).water).toBe(false);
  });
  it('produces stable normalized ripple normals without external image assets', () => {
    const normal = art.dinoWaterNormalData(32);
    expect(normal.pixels).toEqual(art.dinoWaterNormalData(32).pixels);
    for (let i = 0; i < normal.pixels.length; i += 4) {
      const xyz = [0, 1, 2].map(k => normal.pixels[i+k] / 255 * 2 - 1);
      expect(Math.hypot(...xyz)).toBeCloseTo(1, 2);
      expect(normal.pixels[i+3]).toBe(255);
    }
  });
});
