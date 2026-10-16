import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const cases = ['mourningDove', 'grouse'].flatMap(id => ['high', 'low'].map(quality => [id, quality]));
function create(id, quality) {
  const scope = {};
  new Function('window', source)(scope);
  return scope.AvianWoodlandBirds.create(THREE, id, { quality });
}
function geometry(bird) { return bird.wings[0].getObjectByName('woodland-layered-wing').geometry; }
function point(position, index) { return new THREE.Vector3().fromBufferAttribute(position, index); }
function secondaries(g) {
  const { position, uv, featherInfo } = g.attributes, result = [];
  for (let first = 0; first < position.count;) {
    let end = first + 1;
    while (end < position.count && !(uv.getX(end) === 0 && uv.getY(end) === 0)) end++;
    const centers = [];
    for (let v = first; v < end; v++) if (uv.getX(v) === .5) centers.push(v);
    // Secondary shafts point back from the forearm. The tertials sit above
    // them, and the primaries extend outward from the hand.
    if (featherInfo.getX(first) === 4 && position.getX(centers.at(-1)) - position.getX(centers[0]) < .025 &&
        position.getY(centers[0]) < .003) result.push({ centers, halfRow: centers[0] - first });
    first = end;
  }
  expect(result).toHaveLength(10);
  return result;
}
function widths(position, feathers) {
  return feathers.flatMap(feather => feather.centers.slice(1, -1).map(center =>
    point(position, center + feather.halfRow).distanceTo(point(position, center - feather.halfRow))));
}
function lengths(position, feathers) {
  return feathers.map(feather => feather.centers.slice(1).reduce((sum, center, row) =>
    sum + point(position, center).distanceTo(point(position, feather.centers[row])), 0));
}
function roll(position, feathers, index) {
  const feather = feathers[index], row = Math.round((feather.centers.length - 1) * .63), center = feather.centers[row];
  const axis = point(position, feather.centers[row + 1]).sub(point(position, feather.centers[row - 1])).normalize();
  const span = point(position, feathers[index + 1].centers[row]).sub(point(position, feathers[index - 1].centers[row]));
  span.addScaledVector(axis, -span.dot(axis)).normalize();
  const normal = new THREE.Vector3().crossVectors(axis, span).normalize();
  const across = point(position, center + feather.halfRow).sub(point(position, center - feather.halfRow));
  return Math.atan2(across.dot(normal), across.dot(span));
}
function snapshot(bird) {
  return bird.wings.flatMap(wing => [...wing.position.toArray(), ...wing.quaternion.toArray(),
    ...wing.getObjectByName('woodland-layered-wing').geometry.attributes.position.array]);
}
function difference(a, b) {
  let max = 0;
  for (let i = 0; i < a.length; i++) max = Math.max(max, Math.abs(a[i] - b[i]));
  return max;
}

describe('woodland secondary recovery', () => {
  it.each(cases)('keeps the %s forearm vanes broad and gently pitched through recovery (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), position = g.attributes.position;
    try {
      bird.update({ flight: 1, effort: 0 });
      const feathers = secondaries(g), neutralWidths = widths(position, feathers), neutralLengths = lengths(position, feathers);
      let minimumWidth = 1, maximumWidth = 1, maximumStrain = 0;
      for (let sample = 0; sample < 36; sample++) {
        bird.update({ flight: 1, effort: 1, phase: sample * Math.PI / 18, bank: .5, landing: .65 });
        widths(position, feathers).forEach((width, index) => {
          minimumWidth = Math.min(minimumWidth, width / neutralWidths[index]);
          maximumWidth = Math.max(maximumWidth, width / neutralWidths[index]);
        });
        lengths(position, feathers).forEach((length, index) => {
          maximumStrain = Math.max(maximumStrain, Math.abs(length / neutralLengths[index] - 1));
        });
      }
      // Independent edge weights previously squeezed these vanes to 69–79%
      // of their resting width as the forearm folded during the upstroke.
      expect(minimumWidth).toBeGreaterThan(.97);
      expect(maximumWidth).toBeLessThan(1.01);
      expect(maximumStrain).toBeLessThan(.03);
      const at = phase => {
        bird.update({ flight: 1, effort: 1, phase });
        return [6, 8].map(index => roll(position, feathers, index));
      };
      const power = at(Math.PI * .5), early = at(Math.PI * 1.25), recovery = at(Math.PI * 1.5);
      for (let index = 0; index < power.length; index++) {
        expect(Math.abs(power[index])).toBeLessThan(.04);
        expect(recovery[index] - power[index]).toBeGreaterThan(.035);
        expect(recovery[index]).toBeLessThan(.14);
        expect(early[index]).toBeGreaterThan(power[index]);
        expect(early[index]).toBeLessThan(recovery[index]);
      }
    } finally { bird.dispose(); }
  });

  it.each(cases)('keeps %s forearm recovery continuous, periodic, and neutral at rest (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), { position, normal } = g.attributes;
    const positions = position.array, normals = normal.array;
    try {
      const pose = { flight: .72, effort: .85, phase: 4.1, bank: -.3, landing: .45 };
      bird.update(pose); const expected = snapshot(bird);
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
      expect(difference(snapshot(bird), expected)).toBeLessThan(1e-7);
      let maximumJump = 0;
      const epsilon = .0005;
      for (let sample = 0; sample < 24; sample++) {
        const phase = sample * Math.PI / 12;
        bird.update({ ...pose, phase: phase - epsilon }); const before = snapshot(bird);
        bird.update({ ...pose, phase }); const at = snapshot(bird);
        bird.update({ ...pose, phase: phase + epsilon }); const after = snapshot(bird);
        for (let vertex = 0; vertex < at.length; vertex++) maximumJump = Math.max(maximumJump,
          Math.abs(after[vertex] - 2 * at[vertex] + before[vertex]) / epsilon);
      }
      expect(maximumJump).toBeLessThan(.012);
      for (const flight of [0, 1]) {
        bird.update({ flight, effort: 0, phase: 0 }); const neutral = snapshot(bird);
        for (const phase of [1.7, 4.6, -17]) {
          bird.update({ flight, effort: flight ? 0 : 1, phase });
          expect(snapshot(bird)).toEqual(neutral);
        }
      }
      bird.update({ ...pose, effort: 0 }); const glide = snapshot(bird);
      bird.update({ ...pose, effort: .00001 });
      expect(difference(snapshot(bird), glide)).toBeLessThan(.00001);
      bird.update(pose); expect(snapshot(bird)).toEqual(expected);
      expect(position.array).toBe(positions); expect(normal.array).toBe(normals);
      expect([...positions, ...normals].every(Number.isFinite)).toBe(true);
    } finally { bird.dispose(); }
  });
});
