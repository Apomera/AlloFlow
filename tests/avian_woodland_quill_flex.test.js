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
function primaries(g) {
  const { position, uv, featherInfo } = g.attributes, result = [];
  for (let first = 0; first < position.count;) {
    let end = first + 1;
    while (end < position.count && !(uv.getX(end) === 0 && uv.getY(end) === 0)) end++;
    const centers = [];
    for (let v = first; v < end; v++) if (uv.getX(v) === .5) centers.push(v);
    if (featherInfo.getX(first) === 4 && position.getX(centers.at(-1)) - position.getX(centers[0]) > .025)
      result.push({ centers, halfRow: centers[0] - first });
    first = end;
  }
  expect(result).toHaveLength(10);
  return result;
}
function shaftLength(position, feather) {
  return feather.centers.slice(1).reduce((sum, index, row) =>
    sum + point(position, index).distanceTo(point(position, feather.centers[row])), 0);
}
function width(position, feather) {
  const center = feather.centers[Math.round((feather.centers.length - 1) * .6)];
  return point(position, center + feather.halfRow).distanceTo(point(position, center - feather.halfRow));
}
function distalCurvature(position, feather) {
  const n = feather.centers.length, a = point(position, feather.centers[n - 3]);
  const middle = point(position, feather.centers[n - 2]).sub(a);
  const chord = point(position, feather.centers[n - 1]).sub(a);
  // Distance from the penultimate shaft sample to its local chord removes
  // whole-wing rotation. Only the quill's actual shape changes this measure.
  return middle.cross(chord).length() / chord.length();
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

describe('woodland primary quill flex', () => {
  it.each(cases)('lets the outer %s quills finish flexing progressively through recovery (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), position = g.attributes.position;
    try {
      bird.update({ flight: 1, effort: 0 });
      // The distal rows of these quills are all beyond the wrist. Their
      // curvature cannot be mistaken for the weighted elbow/hand bend.
      const feathers = primaries(g).slice(-4), curves = feathers.map(() => []), samples = 144;
      for (let step = 0; step < samples; step++) {
        bird.update({ flight: 1, effort: 1, phase: step * Math.PI * 2 / samples });
        feathers.forEach((feather, index) => curves[index].push(distalCurvature(position, feather)));
      }
      const peaks = curves.map(curve => curve.indexOf(Math.max(...curve)) * Math.PI * 2 / samples);
      for (let index = 1; index < peaks.length; index++) expect(peaks[index]).toBeGreaterThanOrEqual(peaks[index - 1]);
      // Uniform wing-tip flex previously peaked at the same instant on every
      // shaft. A modest outward delay avoids both that paddle motion and flutter.
      expect(peaks.at(-1) - peaks[0]).toBeGreaterThan(.06);
      expect(peaks.at(-1) - peaks[0]).toBeLessThan(.24);
      for (const curve of curves) {
        expect(Math.max(...curve) - Math.min(...curve)).toBeGreaterThan(.00004);
        expect(Math.max(...curve)).toBeLessThan(.0005);
      }
    } finally { bird.dispose(); }
  });

  it.each(cases)('keeps %s loaded vanes coherent, periodic, and seekable without replacing buffers (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird);
    const { position, normal } = g.attributes, positions = position.array, normals = normal.array;
    try {
      bird.update({ flight: 1, effort: 0 });
      const feathers = primaries(g), lengths = feathers.map(feather => shaftLength(position, feather));
      const widths = feathers.map(feather => width(position, feather));
      let minWidth = Infinity, maxWidth = 0, maxStrain = 0, normalError = 0;
      for (let step = 0; step < 36; step++) {
        bird.update({ flight: 1, effort: 1, phase: step * Math.PI / 18, bank: .5, landing: .65 });
        feathers.forEach((feather, index) => {
          const relativeWidth = width(position, feather) / widths[index];
          minWidth = Math.min(minWidth, relativeWidth); maxWidth = Math.max(maxWidth, relativeWidth);
          maxStrain = Math.max(maxStrain, Math.abs(shaftLength(position, feather) / lengths[index] - 1));
        });
        for (let vertex = 0; vertex < normal.count; vertex++) normalError = Math.max(normalError,
          Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
      }
      expect(minWidth).toBeGreaterThan(.96); expect(maxWidth).toBeLessThan(1.01);
      expect(maxStrain).toBeLessThan(.055); expect(normalError).toBeLessThan(2e-5);
      expect([...positions].every(Number.isFinite)).toBe(true);

      const pose = { flight: .74, effort: .92, phase: 4.73, bank: -.38, landing: .3 };
      bird.update(pose); const expected = snapshot(bird);
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
      expect(difference(snapshot(bird), expected)).toBeLessThan(1e-7);
      const epsilon = .0005;
      bird.update({ ...pose, phase: pose.phase - epsilon }); const before = snapshot(bird);
      bird.update({ ...pose, phase: pose.phase + epsilon }); const after = snapshot(bird);
      let velocityJump = 0;
      for (let i = 0; i < expected.length; i++) velocityJump = Math.max(velocityJump,
        Math.abs(after[i] - 2 * expected[i] + before[i]) / epsilon);
      expect(velocityJump).toBeLessThan(.01);

      for (const flight of [0, 1]) {
        bird.update({ flight, effort: 0, phase: 0 }); const neutral = snapshot(bird);
        for (const phase of [1.7, 4.6, -17]) {
          bird.update({ flight, effort: flight ? 0 : 1, phase });
          expect(snapshot(bird)).toEqual(neutral);
        }
      }
      bird.update({ ...pose, effort: 0 }); const glide = snapshot(bird);
      bird.update({ ...pose, effort: .00001 }); expect(difference(snapshot(bird), glide)).toBeLessThan(.00001);
      bird.update(pose); expect(snapshot(bird)).toEqual(expected);
      expect(position.array).toBe(positions); expect(normal.array).toBe(normals);
    } finally { bird.dispose(); }
  });
});
