import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality) {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds.create(THREE, id, { quality });
}
function footGeometry(bird, index = 0) {
  return bird.feet[index].getObjectByName('woodland-scaled-toes').geometry;
}
function components(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    parent[find(index[i + 1])] = find(index[i]);
    parent[find(index[i + 2])] = find(index[i]);
  }
  const groups = new Map();
  for (let i = 0; i < parent.length; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()].sort((a, b) => a[0] - b[0]);
}
function rows(geometry, vertices) {
  const grouped = new Map(), { uv } = geometry.attributes;
  for (const vertex of vertices) {
    const v = uv.getY(vertex);
    if (!grouped.has(v)) grouped.set(v, []);
    grouped.get(v).push(vertex);
  }
  return [...grouped.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
}
function point(array, index) { return Array.from(array.slice(index * 3, index * 3 + 3)); }
function center(array, row) {
  const sum = [0, 0, 0];
  for (const vertex of row) for (let axis = 0; axis < 3; axis++) sum[axis] += array[vertex * 3 + axis] / row.length;
  return sum;
}
function distance(a, b) { return Math.hypot(...a.map((value, axis) => value - b[axis])); }
function maxDelta(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

describe('woodland flight toe articulation', () => {
  it.each(['high', 'low'])('curls four attached toes without shortening segments or flattening their rings (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), geometry = footGeometry(bird), rest = geometry.attributes.position.array.slice();
      try {
        const parts = components(geometry);
        // Leg, pad, and four independent toe/claw pairs remain in one mesh.
        expect(parts).toHaveLength(10);
        bird.update({ flight: 1, phase: 1.4, effort: .7 });
        const flying = geometry.attributes.position.array;
        for (const vertex of [...parts[0], ...parts[1]]) expect(point(flying, vertex)).toEqual(point(rest, vertex));
        for (let toe = 0; toe < 4; toe++) {
          const toeRows = rows(geometry, parts[2 + toe * 2]), clawRows = rows(geometry, parts[3 + toe * 2]);
          const restCenters = toeRows.map(row => center(rest, row)), flightCenters = toeRows.map(row => center(flying, row));
          for (const vertex of toeRows[0]) expect(point(flying, vertex)).toEqual(point(rest, vertex));
          for (let row = 1; row < toeRows.length; row++) {
            expect(distance(flightCenters[row], flightCenters[row - 1])).toBeCloseTo(distance(restCenters[row], restCenters[row - 1]), 7);
          }
          for (const row of [...toeRows, ...clawRows]) {
            const beforeCenter = center(rest, row), afterCenter = center(flying, row);
            for (const vertex of row) expect(distance(point(flying, vertex), afterCenter)).toBeCloseTo(distance(point(rest, vertex), beforeCenter), 7);
          }
          expect(distance(flightCenters.at(-1), flightCenters[0]) / distance(restCenters.at(-1), restCenters[0])).toBeLessThan(.94);
          expect(flightCenters.at(-1)[1] - flightCenters[0][1]).toBeLessThan(-.005);
          // The claw stays seated on its toe tip and remains a rigid curved nail.
          expect(distance(center(flying, clawRows[0]), flightCenters.at(-1))).toBeLessThan(1e-8);
          for (let a = 0; a < clawRows.length; a++) for (let b = a + 1; b < clawRows.length; b++) {
            expect(distance(center(flying, clawRows[a]), center(flying, clawRows[b]))).toBeCloseTo(distance(center(rest, clawRows[a]), center(rest, clawRows[b])), 7);
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('extends continuously before landing and restores the exact grounded footprint (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), geometry = footGeometry(bird), rest = geometry.attributes.position.array.slice();
      try {
        let previous = rest, takeoffChange = 0;
        for (let frame = 0; frame <= 60; frame++) {
          bird.update({ flight: frame / 60, phase: frame * .17 });
          const positions = geometry.attributes.position.array;
          takeoffChange = Math.max(takeoffChange, maxDelta(positions, previous));
          previous = positions.slice();
        }
        expect(takeoffChange).toBeGreaterThan(.0001);
        expect(takeoffChange).toBeLessThan(.002);
        const fullyCurled = previous, fullDifference = maxDelta(fullyCurled, rest);
        let previousDifference = fullDifference;
        for (let frame = 0; frame <= 60; frame++) {
          bird.update({ flight: 1, landing: frame / 60, phase: frame * .19 });
          const positions = geometry.attributes.position.array, difference = maxDelta(positions, rest);
          expect(maxDelta(positions, previous)).toBeLessThan(.002);
          expect(difference).toBeLessThanOrEqual(previousDifference + 1e-8);
          if (frame === 45) expect(difference).toBeLessThan(fullDifference * .25);
          previous = positions.slice(); previousDifference = difference;
        }
        expect(geometry.attributes.position.array).toEqual(rest);
        bird.update({ flight: 0, walking: 1, stride: 1.3, peck: .7 });
        // Ground walking now articulates the swing foot independently. Its
        // supporting toes still retain the exact neutral contact geometry.
        expect(geometry.attributes.position.array).not.toEqual(rest);
        const support = footGeometry(bird, 1), supportParts = components(support);
        for (const part of supportParts.slice(1)) for (const vertex of part) {
          expect(point(support.attributes.position.array, vertex)).toEqual(point(rest, vertex));
        }
        bird.update({ flight: 1, landing: .2 });
        bird.update({ flight: 0, landing: 0 });
        expect(geometry.attributes.position.array).toEqual(rest);
        bird.root.updateMatrixWorld(true);
        let groundMinimum = Infinity;
        const position = geometry.attributes.position;
        for (let i = 0; i < position.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(bird.feet[0].matrixWorld);
          groundMinimum = Math.min(groundMinimum, p.y);
        }
        expect(groundMinimum).toBeGreaterThanOrEqual(-1e-7);
        expect(groundMinimum).toBeLessThan(.0015);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('retains buffers, normalized normals, and stable feet on held or phase-only poses (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), meshes = [];
      bird.root.traverse(object => { if (object.isMesh) meshes.push(object); });
      try {
        expect(meshes).toHaveLength(9);
        expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(3);
        const feet = [footGeometry(bird, 0), footGeometry(bird, 1)];
        const buffers = feet.map(geometry => [geometry.attributes.position.array, geometry.attributes.normal.array, geometry.index.array]);
        const pose = { flight: .62, landing: .18, phase: 1.2, effort: .8 };
        bird.update(pose);
        const expected = feet.map(geometry => geometry.attributes.position.array.slice());
        const versions = feet.map(geometry => [geometry.attributes.position.version, geometry.attributes.normal.version]);
        // A reduced-motion/static frame and a full moving wingbeat both keep
        // the tucked foot steady, rather than pulsing its toes with the wings.
        for (let frame = 0; frame < 12; frame++) bird.update(pose);
        for (let frame = 0; frame < 12; frame++) bird.update({ ...pose, phase: frame * .4, lookYaw: .3 });
        for (let f = 0; f < feet.length; f++) {
          expect(feet[f].attributes.position.array).toEqual(expected[f]);
          expect([feet[f].attributes.position.version, feet[f].attributes.normal.version]).toEqual(versions[f]);
        }
        bird.update({ flight: 0 });
        bird.update({ flight: 1, landing: .8 });
        bird.update(pose);
        for (let f = 0; f < feet.length; f++) {
          const { position, normal } = feet[f].attributes;
          expect(position.array).toBe(buffers[f][0]); expect(normal.array).toBe(buffers[f][1]); expect(feet[f].index.array).toBe(buffers[f][2]);
          expect(position.array).toEqual(expected[f]);
          for (let i = 0; i < position.count; i++) {
            expect(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i))).toBe(true);
            expect(Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))).toBeCloseTo(1, 5);
            expect(Math.hypot(position.getX(i), position.getY(i), position.getZ(i))).toBeLessThan(feet[f].boundingSphere.radius);
          }
        }
      } finally { bird.dispose(); }
    }
  });
});
