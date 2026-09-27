import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const start = source.indexOf('function createCLHuntAnimal('), end = source.indexOf('// Compact, individually owned prey rig.', start);
if (start < 0 || end <= start) throw new Error('Animal rig missing');
const build = new Function('T', 'species', 'Math', source.slice(start, end) + ';return createCLHuntAnimal(T,species);');
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Fin rig consumed dive RNG'); } });
const dimensions = { cuttlefish: [.65, .25, .88], bobtailSquid: [.46, .39, .52], dumboOcto: [.47, .48, .54], vampireSquid: [.43, .48, .65] };
const state = extra => ({ moving: true, jet: false, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
const make = id => build(THREE, { id, bodyColor: 0xbc6048 }, noRandom);
const fins = animal => [-1, 1].map(side => animal.root.getObjectByName('cl-fin-' + side));
const pose = animal => ({ fins: fins(animal).map(f => Array.from(f.geometry.attributes.position.array)), mantle: animal.mantle.scale.toArray() });
function distance(a, b) { let max = 0; for (let side = 0; side < 2; side++) for (let i = 0; i < a.fins[side].length; i += 3) max = Math.max(max, Math.hypot(...[0, 1, 2].map(axis => a.fins[side][i + axis] - b.fins[side][i + axis]))); return max; }

describe('Cephalopod species fin membranes', () => {
  for (const [id, dims] of Object.entries(dimensions)) {
    it(`${id} keeps the fin seam inside the breathing mantle under arbitrary world transforms`, () => {
      const animal = make(id), point = new THREE.Vector3();
      animal.root.position.set(12, -4, 7); animal.root.rotation.set(.28, 1.2, -.31, 'YXZ'); animal.root.scale.set(1.3, .8, 1.1);
      for (let frame = 0; frame < 100; frame++) {
        animal.update(1000 + frame * .05, .05, state({ jet: frame > 20 && frame < 65 })); animal.root.updateMatrixWorld(true);
        for (const fin of fins(animal)) {
          const p = fin.geometry.attributes.position, n = fin.geometry.attributes.normal;
          expect(p.count).toBe(174); expect(fin.geometry.index.count / 3).toBe(280);
          expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
          let normalError = 0;
          for (let i = 0; i < p.count; i++) normalError = Math.max(normalError, Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1));
          expect(normalError).toBeLessThan(.00001);
          for (let row = 0; row <= 28; row++) {
            point.fromBufferAttribute(p, row * 6); fin.localToWorld(point); animal.mantle.worldToLocal(point);
            const radial = point.toArray().reduce((sum, value, axis) => sum + (value / (dims[axis] * animal.scale)) ** 2, 0);
            expect(radial).toBeGreaterThan(.98); expect(radial).toBeLessThan(1.00001);
          }
        }
      }
    });

    it(`${id} has continuous propulsion, stable owned buffers and static inspection/reduced motion`, () => {
      const animal = make(id), twin = make(id), resources = fins(animal).map(f => [f.geometry, f.material, f.geometry.attributes.position.array, f.geometry.attributes.normal.array]);
      // Begin in live motion; entering reduced motion deliberately replaces the
      // animated silhouette with a still pose and is not a propulsion transition.
      animal.update(10000, 0, state()); twin.update(10000, 0, state());
      let previous = pose(animal), maxStep = 0;
      for (let frame = 0; frame < 240; frame++) {
        const time = 10000 + frame / 60, settings = state({ jet: frame >= 60 && frame < 160 });
        animal.update(time, 1 / 60, settings); twin.update(time, 1 / 60, settings);
        const current = pose(animal); maxStep = Math.max(maxStep, distance(previous, current)); previous = current;
      }
      expect(maxStep).toBeLessThan(.03); expect(pose(animal)).toEqual(pose(twin));
      const frozen = pose(animal);
      for (const jet of [true, false, true]) animal.update(1e6, 0, state({ jet }));
      expect(pose(animal)).toEqual(frozen);
      animal.update(1e6, .05, state({ reducedMotion: true })); const still = pose(animal);
      for (let i = 0; i < 5; i++) animal.update(i * 100, .05, state({ reducedMotion: true, jet: i % 2 === 0 }));
      expect(pose(animal)).toEqual(still);
      fins(animal).forEach((f, i) => {
        expect(f.geometry).toBe(resources[i][0]); expect(f.material).toBe(resources[i][1]);
        expect(f.geometry.attributes.position.array).toBe(resources[i][2]); expect(f.geometry.attributes.normal.array).toBe(resources[i][3]);
        expect(f.material.transparent).toBe(false); expect(f.rotation.toArray()).toEqual([0, 0, 0, 'XYZ']);
      });
    });
  }

  it('distinguishes the long low cuttlefish skirt, short bobtail paddle and elevated cirrate ears', () => {
    const shapes = Object.fromEntries(Object.keys(dimensions).map(id => {
      const animal = make(id), p = fins(animal)[1].geometry.attributes.position, [rx, ry, rz] = dimensions[id], m = animal.mantle;
      const first = 0, last = 28 * 6, middle = 14 * 6;
      return [id, { seamLength: (p.getZ(last) - p.getZ(first)) / (2 * rz * animal.scale), elevation: (p.getY(middle) - m.position.y) / (ry * animal.scale), extension: (p.getX(middle + 5) - p.getX(middle)) / (rx * animal.scale) }];
    }));
    expect(shapes.cuttlefish.seamLength).toBeGreaterThan(.95);
    expect(shapes.cuttlefish.elevation).toBeCloseTo(0, 5);
    expect(shapes.bobtailSquid.seamLength).toBeLessThan(.5);
    expect(shapes.bobtailSquid.extension).toBeGreaterThan(shapes.cuttlefish.extension * 2);
    expect(shapes.dumboOcto.elevation).toBeGreaterThan(.5);
    expect(shapes.vampireSquid.elevation).toBeGreaterThan(.4);
    expect(shapes.dumboOcto.extension).toBeGreaterThan(shapes.vampireSquid.extension);
  });
});
