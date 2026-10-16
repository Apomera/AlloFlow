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
function wingGeometry(bird) {
  return bird.wings[0].getObjectByName('woodland-layered-wing').geometry;
}
function primaryRows(geometry) {
  const { position, uv, featherInfo } = geometry.attributes, feathers = [];
  // The primary shafts extend outward from the wrist. Find the UV islands
  // and their center rows instead of depending on a mesh/vertex count.
  for (let first = 0; first < position.count;) {
    let end = first + 1;
    while (end < position.count && !(uv.getX(end) === 0 && uv.getY(end) === 0)) end++;
    const centers = [];
    for (let vertex = first; vertex < end; vertex++) if (uv.getX(vertex) === .5) centers.push(vertex);
    if (featherInfo.getX(first) === 4 && centers.length > 2 &&
        position.getX(centers.at(-1)) - position.getX(centers[0]) > .025) {
      feathers.push({ centers, halfRow: centers[0] - first });
    }
    first = end;
  }
  expect(feathers.length).toBeGreaterThan(6);
  return feathers;
}
function point(position, index) {
  return new THREE.Vector3().fromBufferAttribute(position, index);
}
function section(geometry, feathers, index) {
  const position = geometry.attributes.position, feather = feathers[index];
  const row = Math.round((feather.centers.length - 1) * .63), center = feather.centers[row];
  const axis = point(position, feather.centers[row + 1]).sub(point(position, feather.centers[row - 1])).normalize();
  const span = point(position, feathers[index + 1].centers[row]).sub(point(position, feathers[index - 1].centers[row]));
  span.addScaledVector(axis, -span.dot(axis)).normalize();
  const normal = new THREE.Vector3().crossVectors(axis, span).normalize();
  const across = point(position, center + feather.halfRow).sub(point(position, center - feather.halfRow));
  return { roll: Math.atan2(across.dot(normal), across.dot(span)), width: across.length() };
}
function snapshot(bird) {
  return bird.wings.flatMap(wing => [
    ...wing.position.toArray(), ...wing.quaternion.toArray(),
    ...wing.getObjectByName('woodland-layered-wing').geometry.attributes.position.array,
  ]);
}
function difference(a, b) {
  let largest = 0;
  for (let i = 0; i < a.length; i++) largest = Math.max(largest, Math.abs(a[i] - b[i]));
  return largest;
}

describe('woodland primary feather articulation', () => {
  it.each(['mourningDove', 'grouse'].flatMap(id => ['high', 'low'].map(quality => [id, quality])))
  ('feathers the %s recovery stroke progressively while keeping vanes coherent (%s)', (id, quality) => {
    const bird = create(id, quality), geometry = wingGeometry(bird);
    try {
      bird.update({ flight: 1, effort: 0 });
      const feathers = primaryRows(geometry), indices = [2, Math.floor(feathers.length / 2), feathers.length - 2];
      const glideWidths = indices.map(index => section(geometry, feathers, index).width);
      const sections = phase => {
        bird.update({ flight: 1, phase, effort: 1 });
        return indices.map(index => section(geometry, feathers, index));
      };
      const power = sections(Math.PI / 2), beginning = sections(Math.PI);
      const early = sections(Math.PI * 1.25), recovery = sections(Math.PI * 1.5);
      for (let i = 0; i < indices.length; i++) {
        // The vane changes pitch relative to the adjacent shafts, not merely
        // because the entire wing rotates. Powerstroke vanes close together.
        expect(Math.abs(power[i].roll)).toBeLessThan(.09);
        expect(recovery[i].roll - power[i].roll).toBeGreaterThan(.14);
        // The inner hand also folds at the wrist, but no vane inverts or
        // collapses as it feathers through that bend.
        expect(recovery[i].roll).toBeLessThan(Math.PI / 3);
        expect(recovery[i].width / glideWidths[i]).toBeGreaterThan(.95);
        expect(recovery[i].width / glideWidths[i]).toBeLessThan(1.05);
      }
      const progression = early.map((value, i) => (value.roll - beginning[i].roll) / (recovery[i].roll - beginning[i].roll));
      // The outer primaries follow the inner hand instead of flipping as one
      // rigid paddle at the turn into the upstroke.
      expect(progression[0] - progression.at(-1)).toBeGreaterThan(.08);
      expect(progression.every(value => value > .3 && value < .95)).toBe(true);
    } finally { bird.dispose(); }
  });

  it('gives the dove a more feathered recovery than the broader grouse wing', () => {
    const rolls = [];
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id);
      try {
        bird.update({ flight: 1, effort: 0 });
        const geometry = wingGeometry(bird), feathers = primaryRows(geometry);
        bird.update({ flight: 1, effort: 1, phase: Math.PI * 1.5 });
        rolls.push(section(geometry, feathers, feathers.length - 2).roll);
      } finally { bird.dispose(); }
    }
    expect(rolls[0] - rolls[1]).toBeGreaterThan(.025);
    expect(rolls[0] - rolls[1]).toBeLessThan(.10);
  });

  it.each(['mourningDove', 'grouse'])('keeps %s recovery, phase wrap, and backward seeking smooth without replacing buffers', id => {
    const bird = create(id), geometries = bird.wings.map(wing => wing.getObjectByName('woodland-layered-wing').geometry);
    const arrays = geometries.map(geometry => [geometry.attributes.position.array, geometry.attributes.normal.array]);
    try {
      const pose = { flight: .82, phase: Math.PI * 1.36, effort: .87, bank: .36, landing: .28 };
      bird.update(pose); const expected = snapshot(bird);
      let largestVelocityJump = 0;
      const epsilon = .001;
      for (let sample = 0; sample <= 24; sample++) {
        const phase = sample * Math.PI / 12;
        bird.update({ ...pose, phase: phase - epsilon }); const before = snapshot(bird);
        bird.update({ ...pose, phase }); const at = snapshot(bird);
        bird.update({ ...pose, phase: phase + epsilon }); const after = snapshot(bird);
        for (let vertex = 0; vertex < at.length; vertex++) largestVelocityJump = Math.max(largestVelocityJump,
          Math.abs(after[vertex] - 2 * at[vertex] + before[vertex]) / epsilon);
      }
      expect(largestVelocityJump).toBeLessThan(.012);
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
      expect(difference(snapshot(bird), expected)).toBeLessThan(1e-7);
      // Bank and landing still deform the wrist when effort reaches zero.
      // Switching from edge weights to shaft weights at that boundary would
      // create a visible jump even though the recovery pitch tends to zero.
      bird.update({ ...pose, effort: 0 }); const glide = snapshot(bird);
      bird.update({ ...pose, effort: .00001 });
      expect(difference(snapshot(bird), glide)).toBeLessThan(.00001);
      bird.update({ flight: 0, phase: -20, effort: 0, bank: -.8, landing: 1 });
      bird.update(pose); expect(snapshot(bird)).toEqual(expected);
      geometries.forEach((geometry, index) => {
        expect(geometry.attributes.position.array).toBe(arrays[index][0]);
        expect(geometry.attributes.normal.array).toBe(arrays[index][1]);
        for (const array of arrays[index]) expect([...array].every(Number.isFinite)).toBe(true);
      });
    } finally { bird.dispose(); }
  });

  it.each(['high', 'low'])('keeps neutral gliding and folded feathers independent of the stroke phase (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        for (const flight of [0, 1]) {
          bird.update({ flight, effort: 0, phase: 0 }); const expected = snapshot(bird);
          for (const phase of [.9, Math.PI, Math.PI * 1.5, -11]) {
            bird.update({ flight, effort: flight ? 0 : 1, phase });
            expect(snapshot(bird)).toEqual(expected);
          }
        }
      } finally { bird.dispose(); }
    }
  });
});
