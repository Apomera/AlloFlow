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
function geometry(bird, foot) { return bird.feet[foot].children[0].geometry; }
function anatomy(g) {
  const parents = Array.from({ length: g.attributes.position.count }, (_, i) => i);
  const find = i => parents[i] === i ? i : (parents[i] = find(parents[i]));
  for (let i = 0; i < g.index.array.length; i += 3) {
    const [a, b, c] = g.index.array.slice(i, i + 3);
    parents[find(b)] = find(a); parents[find(c)] = find(a);
  }
  const components = new Map();
  parents.forEach((_, i) => { const key = find(i); if (!components.has(key)) components.set(key, []); components.get(key).push(i); });
  const parts = [...components.values()].sort((a, b) => a[0] - b[0]);
  return { parts, rows: vertices => {
    const map = new Map();
    for (const vertex of vertices) {
      const v = g.attributes.uv.getY(vertex);
      if (!map.has(v)) map.set(v, []);
      map.get(v).push(vertex);
    }
    return [...map.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
  } };
}
function center(array, row) {
  const value = [0, 0, 0];
  for (const vertex of row) for (let axis = 0; axis < 3; axis++) value[axis] += array[vertex * 3 + axis] / row.length;
  return value;
}
function distance(a, b) { return Math.hypot(...a.map((n, i) => n - b[i])); }
function worldPositions(bird, f, vertices) {
  bird.root.updateMatrixWorld(true);
  const g = geometry(bird, f), point = new THREE.Vector3(), out = [];
  for (const vertex of vertices) {
    point.fromBufferAttribute(g.attributes.position, vertex).applyMatrix4(bird.feet[f].matrixWorld);
    out.push(point.x, point.y, point.z);
  }
  return out;
}
function maxDelta(a, b) { let max = 0; for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i])); return max; }
function params(id) { return id === 'grouse' ? { leg: .056, stance: .024, lift: .016, upper: .066, reach: .039 } : { leg: .034, stance: .014, lift: .011, upper: .042, reach: .028 }; }

describe('woodland walking feet', () => {
  it.each(['high', 'low'])('plants actual sole vertices while fixed-length hocks follow body movement (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), p = params(id), g = geometry(bird, 0), { parts, rows } = anatomy(g);
      const legRows = rows(parts[0]), baseline = g.attributes.position.array.slice();
      const lowerLength = distance(center(baseline, legRows[0]), center(baseline, legRows.at(-1)));
      const targets = [{ x: -p.stance, y: p.leg, z: .006, swing: -1 }, { x: p.stance, y: p.leg + p.lift, z: .006, swing: .5 }];
      const pose = { walking: 1, stride: .7, footTargets: targets };
      try {
        let planted;
        for (const advance of [0, .009, .018, .009, -.009, 0]) {
          bird.root.position.z = advance; targets[0].z = .006 - advance;
          bird.update(pose);
          const sole = worldPositions(bird, 0, parts.slice(1).flat());
          if (!planted) planted = sole; else expect(maxDelta(sole, planted)).toBeLessThan(1e-8);
          expect(bird.feet[0].rotation.toArray().slice(0, 3).every(angle => angle === 0)).toBe(true);
          const array = g.attributes.position.array, hip = center(array, legRows[0]);
          const expectedHip = [bird.body.position.x - p.stance - bird.feet[0].position.x, bird.body.position.y - .010 - bird.feet[0].position.y, .002 - bird.feet[0].position.z];
          expect(distance(hip, expectedHip)).toBeLessThan(1e-8);
          const knee = center(array, legRows[quality === 'high' ? 3 : 2]), ankle = center(array, legRows.at(-1));
          expect(distance(knee, ankle)).toBeCloseTo(lowerLength, 6);
          expect(distance(hip, knee)).toBeCloseTo(p.upper, 6);
          expect(knee[2]).toBeLessThan(Math.max(hip[2], ankle[2]));
          for (let row = 0; row < legRows.length; row++) {
            const oldCenter = center(baseline, legRows[row]), newCenter = center(array, legRows[row]);
            for (const vertex of legRows[row]) {
              const before = Array.from(baseline.slice(vertex * 3, vertex * 3 + 3)), after = Array.from(array.slice(vertex * 3, vertex * 3 + 3));
              expect(distance(after, newCenter)).toBeCloseTo(distance(before, oldCenter), 7);
            }
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('clears toe and claw geometry throughout a gathered swing and opens before planting (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), p = params(id), g = geometry(bird, 0), { parts, rows } = anatomy(g);
      const baseline = g.attributes.position.array.slice(), soleVertices = parts.slice(1).flat();
      const targets = [{ x: -p.stance, y: p.leg, z: .006, swing: 0 }, { x: p.stance, y: p.leg, z: .006, swing: -1 }];
      try {
        let largestLift = 0, previous;
        for (let frame = 0; frame <= 80; frame++) {
          const swing = frame / 80, arc = Math.sin(Math.PI * swing) ** 2;
          Object.assign(targets[0], { y: p.leg + arc * p.lift, z: .006 + (swing * 2 - 1) * p.reach, swing });
          bird.update({ walking: 1, stride: swing * Math.PI, footTargets: targets });
          const array = g.attributes.position.array, positions = worldPositions(bird, 0, soleVertices);
          const minimum = Math.min(...positions.filter((_, i) => i % 3 === 1));
          expect(minimum, id + ' sole clearance at ' + swing).toBeGreaterThanOrEqual(-1e-7);
          largestLift = Math.max(largestLift, minimum);
          if (previous) expect(maxDelta(array, previous)).toBeLessThan(.0035);
          previous = array.slice();
          for (let toe = 0; toe < 4; toe++) {
            const toeRows = rows(parts[2 + toe * 2]), clawRows = rows(parts[3 + toe * 2]);
            if (frame === 40 && toe !== 1 && toe !== 3) {
              const restRoot = center(baseline, toeRows[0]), restTip = center(baseline, toeRows.at(-1));
              const root = center(array, toeRows[0]), tip = center(array, toeRows.at(-1));
              const restSplay = Math.abs(Math.atan2(restTip[0] - restRoot[0], restTip[2] - restRoot[2]));
              const swingSplay = Math.abs(Math.atan2(tip[0] - root[0], tip[2] - root[2]));
              expect(swingSplay).toBeLessThan(restSplay * .8);
              expect(swingSplay).toBeGreaterThan(restSplay * .55);
              expect(distance(root, restRoot)).toBeLessThan(1e-8);
            }
            for (let row = 1; row < toeRows.length; row++) {
              expect(distance(center(array, toeRows[row]), center(array, toeRows[row - 1]))).toBeCloseTo(distance(center(baseline, toeRows[row]), center(baseline, toeRows[row - 1])), 7);
            }
            expect(distance(center(array, toeRows.at(-1)), center(array, clawRows[0]))).toBeLessThan(1e-8);
            expect(distance(center(array, clawRows[0]), center(array, clawRows.at(-1)))).toBeCloseTo(distance(center(baseline, clawRows[0]), center(baseline, clawRows.at(-1))), 7);
          }
        }
        expect(largestLift).toBeGreaterThan(.004);
        // The final roll and toe gather close exactly at contact.
        for (const vertex of soleVertices) for (let axis = 0; axis < 3; axis++) expect(g.attributes.position.array[vertex * 3 + axis]).toBeCloseTo(baseline[vertex * 3 + axis], 8);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('caches mutable targets by value and returns deterministically to default, rest and flight (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), reference = create(id, quality), p = params(id), g = geometry(bird, 0);
      const rest = g.attributes.position.array.slice(), buffers = [g.attributes.position.array, g.attributes.normal.array, g.index.array];
      const targets = [{ x: -p.stance, y: p.leg + .007, z: .012, swing: .4 }, { x: p.stance, y: p.leg, z: -.004, swing: -1 }];
      const pose = { walking: 1, stride: 1.2, footTargets: targets };
      try {
        bird.update(pose);
        const first = g.attributes.position.array.slice(), version = g.attributes.position.version;
        bird.update(pose); bird.update({ ...pose, footTargets: targets.map(target => ({ ...target })) });
        expect(g.attributes.position.version).toBe(version);
        targets[0].yaw = .35; bird.update(pose);
        expect(g.attributes.position.version).toBeGreaterThan(version); expect(g.attributes.position.array).not.toEqual(first);
        const yawVersion = g.attributes.position.version;
        bird.update(pose); expect(g.attributes.position.version).toBe(yawVersion);
        delete targets[0].yaw; bird.update(pose);
        expect(g.attributes.position.array).toEqual(first);
        targets[0].z += .007; bird.update(pose);
        expect(g.attributes.position.version).toBeGreaterThan(version); expect(g.attributes.position.array).not.toEqual(first);
        targets[0].z -= .007; bird.update(pose);
        expect(g.attributes.position.array).toEqual(first);
        bird.update({ walking: 1, stride: 1.2, footTargets: null }); reference.update({ walking: 1, stride: 1.2 });
        expect(g.attributes.position.array).toEqual(geometry(reference, 0).attributes.position.array);
        expect(bird.feet[0].position.toArray()).toEqual(reference.feet[0].position.toArray());
        const flight = { flight: 1, phase: 2.1, effort: .8, walking: 1 };
        bird.update(flight); reference.update(flight);
        expect(g.attributes.position.array).toEqual(geometry(reference, 0).attributes.position.array);
        bird.update({ walking: 1, stride: 4.1, footTargets: targets }); bird.update({ flight: 0, walking: 0 });
        expect(g.attributes.position.array).toEqual(rest);
        // Finite but impossible caller targets must not introduce NaNs when
        // the ankle coincides with the hip and has no preferred leg direction.
        const bodyY = id === 'grouse' ? .126 : .083;
        for (let f = 0; f < 2; f++) Object.assign(targets[f], {
          x: (f ? 1 : -1) * p.stance, y: bodyY + .0013 - .010 + p.leg - .003, z: 0, swing: -1
        });
        bird.update({ walking: 1, stride: 0, footTargets: targets });
        expect([...g.attributes.position.array, ...g.attributes.normal.array].every(Number.isFinite)).toBe(true);
        expect(g.attributes.position.array).toBe(buffers[0]); expect(g.attributes.normal.array).toBe(buffers[1]); expect(g.index.array).toBe(buffers[2]);
      } finally { bird.dispose(); reference.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps every planted sole vertex fixed while the body turns around the ankle (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), p = params(id), g = geometry(bird, 0), { parts, rows } = anatomy(g);
      const soleVertices = parts.slice(1).flat(), legRows = rows(parts[0]);
      const baseline = g.attributes.position.array.slice(), lowerLength = distance(center(baseline, legRows[0]), center(baseline, legRows.at(-1)));
      const targets = [-1, 1].map(side => ({ x: side * p.stance, y: p.leg, z: .006, swing: -1, yaw: 0 }));
      const positions = g.attributes.position.array, normals = g.attributes.normal.array;
      try {
        let planted;
        for (const heading of [0, .25, .60, -.2, .25, 0]) {
          bird.root.rotation.y = heading;
          for (let f = 0; f < 2; f++) {
            // Contacts are world ankle centers, not group origins: the latter
            // would leave a small circular toe slide around the .002 Z offset.
            const ankleX = (f ? 1 : -1) * p.stance, ankleZ = .008;
            targets[f].x = Math.cos(heading) * ankleX - Math.sin(heading) * ankleZ;
            targets[f].z = Math.sin(heading) * ankleX + Math.cos(heading) * ankleZ - .002;
            targets[f].yaw = -heading;
          }
          bird.update({ walking: 1, stride: .7, footTargets: targets });
          const sole = worldPositions(bird, 0, soleVertices);
          if (!planted) planted = sole; else expect(maxDelta(sole, planted)).toBeLessThan(1e-8);
          const array = g.attributes.position.array;
          const hip = center(array, legRows[0]), knee = center(array, legRows[quality === 'high' ? 3 : 2]), ankle = center(array, legRows.at(-1));
          expect(distance(hip, [bird.body.position.x - p.stance - targets[0].x, bird.body.position.y - .010 - targets[0].y, .002 - targets[0].z])).toBeLessThan(1e-8);
          expect(distance(knee, ankle)).toBeCloseTo(lowerLength, 6);
          expect(g.attributes.position.array).toBe(positions); expect(g.attributes.normal.array).toBe(normals);
          for (let vertex = 0; vertex < g.attributes.normal.count; vertex++) {
            expect(Math.hypot(...Array.from(normals.slice(vertex * 3, vertex * 3 + 3)))).toBeCloseTo(1, 5);
          }
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps stopped displaced and sloped contacts attached after walking intensity decays to zero (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), p = params(id), g = geometry(bird, 0), { parts, rows } = anatomy(g);
      const baseline = g.attributes.position.array.slice(), legRows = rows(parts[0]);
      const lowerLength = distance(center(baseline, legRows[0]), center(baseline, legRows.at(-1)));
      const targets = [{ x: -p.stance, y: p.leg, z: .006, swing: -1 }, { x: p.stance, y: p.leg, z: .006, swing: -1 }];
      try {
        for (const displacement of [{ x: .012, y: 0, z: .018 }, { x: 0, y: .004, z: 0 }, { x: 0, y: -.003, z: 0 }]) {
          Object.assign(targets[0], { x: -p.stance + displacement.x, y: p.leg + displacement.y, z: .006 + displacement.z });
          let planted;
          for (const walking of [1, .6, .2, .01, 0]) {
            bird.update({ walking, stride: .7, footTargets: targets });
            const array = g.attributes.position.array, hip = center(array, legRows[0]);
            const knee = center(array, legRows[quality === 'high' ? 3 : 2]), ankle = center(array, legRows.at(-1));
            expect(distance(hip, [bird.body.position.x - p.stance - targets[0].x, bird.body.position.y - .010 - targets[0].y, .002 - targets[0].z])).toBeLessThan(1e-8);
            expect(distance(knee, ankle)).toBeCloseTo(lowerLength, 6);
            expect(distance(hip, knee)).toBeCloseTo(p.upper, 6);
            const sole = worldPositions(bird, 0, parts.slice(1).flat());
            if (!planted) planted = sole; else expect(maxDelta(sole, planted)).toBeLessThan(1e-8);
          }
        }
        // Neutral target presence still joins the existing idle terrain pose
        // without a hidden-leg extension at the beginning of a BirdLab course.
        Object.assign(targets[0], { x: -p.stance, y: p.leg + .0003, z: .006 });
        bird.update({ walking: 0, stride: .7, footTargets: targets });
        expect(g.attributes.position.array).toEqual(baseline);
        bird.update({ walking: 0, stride: .7, footTargets: null });
        expect(g.attributes.position.array).toEqual(baseline);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps both default walking feet finite and normal buffers retained without new resources (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality), meshes = [], resources = new Map();
      bird.root.traverse(object => { if (object.isMesh) meshes.push(object); });
      meshes.forEach(mesh => [mesh.geometry, mesh.material].forEach(resource => {
        if (resources.has(resource)) return;
        resources.set(resource, 0); resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
      }));
      try {
        expect(meshes).toHaveLength(9); expect(new Set(meshes.map(mesh => mesh.material)).size).toBe(3);
        const retained = [0, 1].map(f => geometry(bird, f).attributes.normal.array);
        for (let frame = 0; frame <= 48; frame++) {
          bird.update({ walking: 1, stride: frame / 48 * Math.PI * 2 });
          for (let f = 0; f < 2; f++) {
            const { position, normal } = geometry(bird, f).attributes;
            expect(normal.array).toBe(retained[f]);
            for (let vertex = 0; vertex < position.count; vertex++) {
              expect(Number.isFinite(position.getX(vertex) + position.getY(vertex) + position.getZ(vertex))).toBe(true);
              expect(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex))).toBeCloseTo(1, 5);
            }
          }
        }
      } finally { bird.dispose(); bird.dispose(); }
      expect([...resources.values()].every(count => count === 1)).toBe(true);
    }
  }, 20000);
});
