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
function geometry(bird) { return bird.wings[0].getObjectByName('woodland-layered-wing').geometry; }
function difference(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}
function smooth(value) { value = Math.max(0, Math.min(1, value)); return value * value * (3 - 2 * value); }
function feathers(g) {
  const { position, uv, featherInfo } = g.attributes, found = [];
  for (let first = 0; first < position.count;) {
    let end = first + 1;
    while (end < position.count && !(uv.getX(end) === 0 && uv.getY(end) === 0)) end++;
    const centers = [];
    for (let i = first; i < end; i++) if (uv.getX(i) === .5) centers.push(i);
    found.push({ first, end, root: centers[0], tip: centers.at(-1), kind: featherInfo.getX(first) });
    first = end;
  }
  return found;
}
function at(array, index) { return new THREE.Vector3().fromArray(array, index * 3); }
function tipProgress(feather, closed, open, current) {
  const path = at(open, feather.tip).sub(at(closed, feather.tip));
  return at(current, feather.tip).sub(at(closed, feather.tip)).dot(path) / path.lengthSq();
}
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function snapshot(bird) {
  return bird.wings.flatMap(wing => [...wing.position.toArray(), ...wing.quaternion.toArray(),
    ...wing.getObjectByName('woodland-layered-wing').geometry.attributes.position.array]);
}

describe('woodland wing deployment', () => {
  it.each(['mourningDove', 'grouse'].flatMap(id => ['high', 'low'].map(quality => [id, quality])))
  ('opens the %s forearm before the outer hand without straining vanes or moving their root attachments (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), position = g.attributes.position;
    try {
      bird.update({ flight: 0, effort: 0 }); const closed = position.array.slice();
      bird.update({ flight: 1, effort: 0 }); const open = position.array.slice(), islands = feathers(g);
      const primary = islands.filter(feather => feather.kind === 4 && open[feather.tip * 3] - open[feather.root * 3] > .025);
      const secondary = islands.filter(feather => feather.kind === 4 && open[feather.tip * 3] - open[feather.root * 3] < .025 &&
        open[feather.root * 3] > .07);
      expect(primary.length).toBeGreaterThan(6); expect(secondary.length).toBeGreaterThan(2);
      bird.update({ flight: .5, effort: 0 });
      const forearm = mean(secondary.map(feather => tipProgress(feather, closed, open, position.array)));
      const inner = mean(primary.slice(0, 3).map(feather => tipProgress(feather, closed, open, position.array)));
      const outer = mean(primary.slice(-3).map(feather => tipProgress(feather, closed, open, position.array)));
      expect(forearm).toBeGreaterThan(.515); expect(inner).toBeLessThan(.48);
      expect(inner - outer).toBeGreaterThan(.006); expect(outer).toBeGreaterThan(.42);

      let rootError = 0, edgeStrain = 0, minimumNormalAlignment = 1;
      const indices = g.index.array, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
      const baseNormal = new THREE.Vector3(), currentNormal = new THREE.Vector3();
      for (const flight of [.03, .2, .5, .8, .97]) {
        bird.update({ flight, effort: 0 }); const blend = smooth(flight);
        // Compare against the existing endpoint morph. Deployment staging is
        // rigid per vane, so it must add no shortening, stretch, or inversion.
        const base = Float64Array.from(closed, (value, i) => value + (open[i] - value) * blend);
        for (const feather of islands) rootError = Math.max(rootError,
          at(position.array, feather.root).distanceTo(at(base, feather.root)));
        for (let triangle = 0; triangle < indices.length; triangle += 3) {
          a.fromArray(base, indices[triangle] * 3); b.fromArray(base, indices[triangle + 1] * 3); c.fromArray(base, indices[triangle + 2] * 3);
          pa.fromBufferAttribute(position, indices[triangle]); pb.fromBufferAttribute(position, indices[triangle + 1]); pc.fromBufferAttribute(position, indices[triangle + 2]);
          const ab = a.distanceTo(b), bc = b.distanceTo(c), ca = c.distanceTo(a);
          edgeStrain = Math.max(edgeStrain, Math.abs(pa.distanceTo(pb) - ab), Math.abs(pb.distanceTo(pc) - bc), Math.abs(pc.distanceTo(pa) - ca));
          baseNormal.crossVectors(b.sub(a), c.sub(a)); currentNormal.crossVectors(pb.sub(pa), pc.sub(pa));
          if (baseNormal.lengthSq() > 1e-15 && currentNormal.lengthSq() > 1e-15)
            minimumNormalAlignment = Math.min(minimumNormalAlignment, baseNormal.normalize().dot(currentNormal.normalize()));
        }
      }
      expect(rootError).toBeLessThan(2e-8); expect(edgeStrain).toBeLessThan(3e-8);
      expect(minimumNormalAlignment).toBeGreaterThan(.98);
      bird.update({ flight: 0, effort: 0 }); expect(position.array).toEqual(closed);
      bird.update({ flight: 1, effort: 0 }); expect(position.array).toEqual(open);
    } finally { bird.dispose(); }
  });

  it.each(['mourningDove', 'grouse'])('keeps %s deployment and folding continuous, seekable, and phase-safe', id => {
    const bird = create(id, 'low'), g = geometry(bird), position = g.attributes.position, normal = g.attributes.normal;
    const positions = position.array, normals = normal.array;
    try {
      const pose = { flight: .46, phase: 4.1, effort: .82, bank: .43, landing: .8 };
      bird.update(pose); const expected = snapshot(bird);
      const epsilon = .0005; let velocityJump = 0, normalError = 0, boundsExcess = -Infinity;
      const point = new THREE.Vector3();
      for (const phase of [0, Math.PI * .5, Math.PI, Math.PI * 1.5]) {
        for (const flight of [0, .001, .03, .2, .5, .8, .97, .999, 1]) {
          const samples = [-epsilon, 0, epsilon].map(offset => {
            bird.update({ ...pose, flight: flight + offset, phase }); return snapshot(bird);
          });
          for (let i = 0; i < samples[0].length; i++) velocityJump = Math.max(velocityJump,
            Math.abs(samples[2][i] - 2 * samples[1][i] + samples[0][i]) / epsilon);
          for (let vertex = 0; vertex < position.count; vertex++) {
            point.fromBufferAttribute(position, vertex);
            expect(point.toArray().every(Number.isFinite)).toBe(true);
            boundsExcess = Math.max(boundsExcess, point.distanceTo(g.boundingSphere.center) - g.boundingSphere.radius);
            normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
          }
        }
      }
      expect(velocityJump).toBeLessThan(.014); expect(normalError).toBeLessThan(2e-5); expect(boundsExcess).toBeLessThan(0);
      bird.update({ ...pose, effort: 0 }); const glide = snapshot(bird);
      bird.update({ ...pose, effort: .00001 }); expect(difference(snapshot(bird), glide)).toBeLessThan(.00001);
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 }); expect(difference(snapshot(bird), expected)).toBeLessThan(1e-7);
      bird.update({ flight: 0, phase: -30, effort: 0 }); bird.update(pose);
      expect(snapshot(bird)).toEqual(expected); expect(position.array).toBe(positions); expect(normal.array).toBe(normals);
    } finally { bird.dispose(); }
  });
});
