import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality = 'high') {
  const scope = {};
  new Function('window', source)(scope);
  return scope.AvianWoodlandBirds.create(THREE, id, { quality });
}
function tailMesh(bird) { return bird.tail.getObjectByName('woodland-layered-tail'); }
function snapshot(bird) {
  return [...bird.tail.position.toArray(), ...bird.tail.quaternion.toArray(),
    ...tailMesh(bird).geometry.attributes.position.array];
}
function difference(a, b) {
  let largest = 0;
  for (let i = 0; i < a.length; i++) largest = Math.max(largest, Math.abs(a[i] - b[i]));
  return largest;
}
function rows(geometry) {
  const { uv, featherInfo } = geometry.attributes, feathers = new Map();
  for (let i = 0; i < uv.count; i++) {
    const seed = featherInfo.getY(i);
    if (!feathers.has(seed)) feathers.set(seed, new Map());
    const feather = feathers.get(seed), along = uv.getY(i);
    if (!feather.has(along)) feather.set(along, []);
    feather.get(along).push(i);
  }
  return [...feathers.values()].map(feather => [...feather.values()]);
}
function rowWidths(position, feathers) {
  const point = new THREE.Vector3(), edge = new THREE.Vector3();
  return feathers.flatMap(feather => feather.map(row => point.fromBufferAttribute(position, row[0])
    .distanceTo(edge.fromBufferAttribute(position, row.at(-1)))));
}
function shaftLengths(position, feathers) {
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  return feathers.map(feather => {
    let length = 0;
    for (let r = 1; r < feather.length; r++) {
      const before = feather[r - 1], after = feather[r];
      length += a.fromBufferAttribute(position, before[(before.length - 1) / 2])
        .distanceTo(b.fromBufferAttribute(position, after[(after.length - 1) / 2]));
    }
    return length;
  });
}

describe('woodland tail loading', () => {
  it.each(['mourningDove', 'grouse'].flatMap(id => ['high', 'low'].map(quality => [id, quality])))
  ('updates %s tail geometry for isolated bank and landing changes without moving the roots (%s)', (id, quality) => {
    const bird = create(id, quality), direct = create(id, quality), mesh = tailMesh(bird);
    const { position, normal, uv } = mesh.geometry.attributes;
    const positions = position.array, normals = normal.array;
    try {
      const pose = { flight: .8, phase: 2.1, effort: .7, tailSpread: .45, bank: 0, landing: 0 };
      bird.update(pose); const original = position.array.slice();
      for (const property of ['bank', 'landing']) {
        const changed = { ...pose, [property]: .65 };
        bird.update(changed); direct.update(changed);
        expect(position.array).not.toEqual(original);
        expect(position.array).toEqual(tailMesh(direct).geometry.attributes.position.array);
        let rootCount = 0;
        for (let vertex = 0; vertex < position.count; vertex++) if (uv.getY(vertex) === 0) {
          rootCount++;
          for (let axis = 0; axis < 3; axis++) expect(position.array[vertex * 3 + axis]).toBe(original[vertex * 3 + axis]);
        }
        expect(rootCount).toBeGreaterThan(10);
        bird.update(pose); expect(position.array).toEqual(original);
      }
      expect(position.array).toBe(positions); expect(normal.array).toBe(normals);
      const point = new THREE.Vector3(); let normalError = 0, boundExcess = -Infinity, groundClearance = Infinity;
      for (const flight of [0, .05, .4, .8, 1]) {
        bird.update({ ...pose, flight, bank: -.7, landing: 1, tailSpread: 1 }); bird.root.updateMatrixWorld(true);
        for (let vertex = 0; vertex < position.count; vertex++) {
          point.fromBufferAttribute(position, vertex);
          expect(point.toArray().every(Number.isFinite)).toBe(true);
          boundExcess = Math.max(boundExcess, point.distanceTo(mesh.geometry.boundingSphere.center) - mesh.geometry.boundingSphere.radius);
          normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
          groundClearance = Math.min(groundClearance, point.applyMatrix4(mesh.matrixWorld).y);
        }
      }
      expect(normalError).toBeLessThan(2e-5); expect(boundExcess).toBeLessThan(0);
      expect(groundClearance).toBeGreaterThan(0);
    } finally { bird.dispose(); direct.dispose(); }
  });

  it.each(['high', 'low'])('loads opposite sides equally in mirrored banks and retains the feather cross-sections (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), geometry = tailMesh(bird).geometry;
      const { position, uv } = geometry.attributes, feathers = rows(geometry);
      try {
        const pose = { flight: 1, effort: 0, phase: 0, tailSpread: .6, landing: 0, bank: 0 };
        bird.update(pose); const base = position.array.slice();
        const widths = rowWidths(position, feathers), lengths = shaftLengths(position, feathers);
        bird.update({ ...pose, bank: .7 }); const positive = position.array.slice();
        bird.update({ ...pose, bank: -.7 }); const negative = position.array.slice();
        let symmetryError = 0, lowest = Infinity, highest = -Infinity;
        for (let vertex = 0; vertex < position.count; vertex++) {
          for (let axis = 0; axis < 3; axis++) {
            const offset = vertex * 3 + axis;
            symmetryError = Math.max(symmetryError, Math.abs(positive[offset] + negative[offset] - 2 * base[offset]));
          }
          if (uv.getY(vertex) === 1) {
            const rise = positive[vertex * 3 + 1] - base[vertex * 3 + 1];
            lowest = Math.min(lowest, rise); highest = Math.max(highest, rise);
          }
        }
        expect(symmetryError).toBeLessThan(2e-8);
        expect(lowest).toBeLessThan(-.001); expect(highest).toBeGreaterThan(.001);
        expect(Math.abs(lowest + highest)).toBeLessThan(2e-8);
        for (const fan of [0, .4, 1]) {
          bird.update({ ...pose, tailSpread: fan, bank: .7, landing: 1 });
          expect(difference(rowWidths(position, feathers), widths)).toBeLessThan(3e-8);
          const loadedLengths = shaftLengths(position, feathers);
          for (let feather = 0; feather < lengths.length; feather++) {
            expect(loadedLengths[feather] / lengths[feather]).toBeGreaterThan(.99);
            expect(loadedLengths[feather] / lengths[feather]).toBeLessThan(1.03);
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['mourningDove', 'grouse'])('keeps %s tail loading continuous through touchdown and reverse seeks', id => {
    const bird = create(id, 'low');
    try {
      const pose = { flight: .63, phase: 4.3, effort: .8, bank: .48, landing: .7, tailSpread: .8 };
      bird.update(pose); const expected = snapshot(bird);
      const epsilon = .0005; let largestVelocityJump = 0;
      for (const [property, boundaries] of [['flight', [0, .5, 1]], ['landing', [0, .5, 1]], ['bank', [-.7, 0, .7]], ['phase', [0, Math.PI, Math.PI * 2]]]) {
        for (const boundary of boundaries) {
          const samples = [-epsilon, 0, epsilon].map(offset => {
            bird.update({ ...pose, [property]: boundary + offset }); return snapshot(bird);
          });
          for (let i = 0; i < samples[0].length; i++) largestVelocityJump = Math.max(largestVelocityJump,
            Math.abs(samples[2][i] - 2 * samples[1][i] + samples[0][i]) / epsilon);
        }
      }
      expect(largestVelocityJump).toBeLessThan(.004);
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
      expect(difference(snapshot(bird), expected)).toBeLessThan(1e-7);
      bird.update({ flight: 0, effort: 0, landing: 0 });
      bird.update(pose); expect(snapshot(bird)).toEqual(expected);
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('preserves folded neutral geometry and steady glide while keeping species-specific fans (%s)', quality => {
    const aspectRatios = [];
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), geometry = tailMesh(bird).geometry;
      const position = geometry.attributes.position, uv = geometry.attributes.uv;
      try {
        bird.update({ flight: 0, effort: 0, phase: 0, tailSpread: .3 }); const folded = snapshot(bird);
        for (const phase of [-10, 2, 8]) {
          bird.update({ flight: 0, effort: 1, phase, bank: .9, landing: 1, tailSpread: .3 });
          expect(snapshot(bird)).toEqual(folded);
        }
        bird.update({ flight: 0, effort: 0, tailSpread: .6 }); const rest = position.array.slice();
        bird.update({ flight: 1, effort: 0, phase: 0, tailSpread: .6 }); const glide = snapshot(bird);
        let largestCamber = 0;
        for (let vertex = 0; vertex < position.count; vertex++) if (uv.getY(vertex) === 1)
          largestCamber = Math.max(largestCamber, position.getY(vertex) - rest[vertex * 3 + 1]);
        expect(largestCamber).toBeGreaterThan(.002); expect(largestCamber).toBeLessThan(.005);
        for (const phase of [-8, 1.3, 4.7]) {
          bird.update({ flight: 1, effort: 0, phase, tailSpread: .6 }); expect(snapshot(bird)).toEqual(glide);
        }
        bird.update({ flight: 1, effort: 0, landing: 1, tailSpread: .6 });
        geometry.computeBoundingBox(); const size = geometry.boundingBox.getSize(new THREE.Vector3());
        aspectRatios.push(size.x / size.z);
      } finally { bird.dispose(); }
    }
    expect(aspectRatios[1]).toBeGreaterThan(aspectRatios[0] * 1.5);
  });
});
