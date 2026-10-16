import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const courses = [['mourningDove', 3.8, 6.2], ['mourningDove', 21, 23.5], ['grouse', 5, 8.2], ['grouse', 25, 28]];
function fixture(quality, groundHeight = () => 0) {
  const window = {}, scene = new THREE.Scene();
  for (const file of ['avian_woodland_birds.js', 'birdlab_3d_wildlife.js'])
    new Function('window', readFileSync('stem_lab/' + file, 'utf8'))(window);
  return { scene, wildlife: window.BirdLab3DWildlife.create(THREE, scene, { quality, groundHeight }) };
}
function footParts(geometry) {
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const indices = geometry.index.array;
  for (let i = 0; i < indices.length; i += 3) {
    parent[find(indices[i + 1])] = find(indices[i]); parent[find(indices[i + 2])] = find(indices[i]);
  }
  const components = new Map();
  for (let vertex = 0; vertex < parent.length; vertex++) {
    const component = find(vertex);
    if (!components.has(component)) components.set(component, []);
    components.get(component).push(vertex);
  }
  const parts = [...components.values()].sort((a, b) => a[0] - b[0]);
  expect(parts).toHaveLength(10);
  // The proximal leg may follow the body. Contact is the pad and four
  // separate toe/claw pairs, whose actual vertices must hold their foothold.
  return { contact: parts.slice(1).flat(), toes: parts.slice(2).flat() };
}
function feet(bird) {
  return ['woodland-left-foot', 'woodland-right-foot'].map(name => {
    const mesh = bird.getObjectByName(name).getObjectByName('woodland-scaled-toes');
    return { mesh, ...footParts(mesh.geometry) };
  });
}
function vertices(foot, indices = foot.contact, world = true) {
  const point = new THREE.Vector3(), values = [], position = foot.mesh.geometry.attributes.position;
  for (const index of indices) {
    point.fromBufferAttribute(position, index);
    if (world) point.applyMatrix4(foot.mesh.matrixWorld);
    values.push(point.x, point.y, point.z);
  }
  return values;
}
function difference(a, b) {
  let largest = 0;
  for (let i = 0; i < a.length; i++) largest = Math.max(largest, Math.abs(a[i] - b[i]));
  return largest;
}
function footState(pair) {
  return pair.flatMap(foot => {
    const values = [...foot.mesh.parent.position.toArray(), ...foot.mesh.parent.quaternion.toArray()];
    for (const value of foot.mesh.geometry.attributes.position.array) values.push(value);
    return values;
  });
}
function clearance(foot, groundHeight) {
  const positions = vertices(foot); let minimum = Infinity;
  for (let i = 0; i < positions.length; i += 3)
    minimum = Math.min(minimum, positions[i + 1] - groundHeight(positions[i], positions[i + 2]));
  return minimum;
}

describe('BirdLab walking sole contact', () => {
  it.each(['high', 'low'])('keeps actual support toes planted through six alternating steps and reverse seeks (%s)', quality => {
    const { scene, wildlife } = fixture(quality, (x, z) => .018 * x - .012 * z);
    try {
      for (const [id, start, end] of courses) {
        const pair = feet(scene.getObjectByName('woodland-' + id));
        for (let step = 0; step < 6; step++) {
          const support = pair[1 - step % 2]; let planted;
          for (const fraction of [.12, .40, .78, .40]) {
            wildlife.update(start + (end - start) * (step + fraction) / 6); scene.updateMatrixWorld(true);
            const at = vertices(support);
            if (!planted) planted = at;
            else expect(difference(at, planted), id + ' support sole slipped').toBeLessThan(1e-8);
          }
        }
      }
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('clears the moving toes while keeping stance soles near flat and sloped ground (%s)', quality => {
    for (const groundHeight of [() => 0, (x, z) => .04 * x - .025 * z]) {
      const { scene, wildlife } = fixture(quality, groundHeight);
      try {
        for (const [id, start, end] of courses) {
          const pair = feet(scene.getObjectByName('woodland-' + id));
          for (let step = 0; step < 6; step++) {
            for (const fraction of [0, .03, .15, .35, .50, .70, .90, .97, 1]) {
              wildlife.update(start + (end - start) * (step + fraction) / 6); scene.updateMatrixWorld(true);
              const support = clearance(pair[1 - step % 2], groundHeight), swing = clearance(pair[step % 2], groundHeight);
              // A flat sole spans a gently varying terrain sample. Keep its
              // contact error below the existing 1.5 mm terrain tolerance.
              expect(support, id + ' support clearance').toBeGreaterThan(-.0015);
              expect(support, id + ' support hover').toBeLessThan(.0015);
              expect(swing, id + ' swing penetration').toBeGreaterThan(-.0015);
              if (fraction === .5) expect(swing, id + ' toe clearance at midswing').toBeGreaterThan(.0015);
            }
          }
        }
      } finally { wildlife.dispose(); }
    }
  });

  it.each(['high', 'low'])('articulates only the lifted foot and restores the resting footprint at each course endpoint (%s)', quality => {
    const { scene, wildlife } = fixture(quality);
    try {
      for (const [id, start, end] of courses) {
        const pair = feet(scene.getObjectByName('woodland-' + id));
        wildlife.update(0);
        const rest = pair.map(foot => vertices(foot, foot.toes, false));
        for (let step = 0; step < 6; step++) {
          wildlife.update(start + (end - start) * (step + .5) / 6);
          const swing = step % 2, support = 1 - swing;
          expect(difference(vertices(pair[support], pair[support].toes, false), rest[support])).toBeLessThan(1e-8);
          expect(difference(vertices(pair[swing], pair[swing].toes, false), rest[swing])).toBeGreaterThan(.0004);
        }
        for (const endpoint of [start, end]) {
          wildlife.update(endpoint);
          for (let foot = 0; foot < 2; foot++)
            expect(difference(vertices(pair[foot], pair[foot].toes, false), rest[foot])).toBeLessThan(1e-8);
        }
      }
    } finally { wildlife.dispose(); }
  });

  it.each(['high', 'low'])('joins every step continuously and reproduces complete foot geometry after repeated or reverse seeks (%s)', quality => {
    const { scene, wildlife } = fixture(quality, (x, z) => .018 * x - .012 * z), epsilon = 1e-5;
    try {
      for (const [id, start, end] of courses) {
        const pair = feet(scene.getObjectByName('woodland-' + id));
        for (let boundary = 0; boundary <= 6; boundary++) {
          const time = start + (end - start) * boundary / 6;
          const samples = [-epsilon, 0, epsilon].map(offset => {
            wildlife.update(time + offset); scene.updateMatrixWorld(true);
            return pair.flatMap(foot => vertices(foot, Array.from({ length: foot.mesh.geometry.attributes.position.count }, (_, index) => index)));
          });
          let velocityJump = 0;
          for (let index = 0; index < samples[0].length; index++) velocityJump = Math.max(velocityJump,
            Math.abs(samples[2][index] - 2 * samples[1][index] + samples[0][index]) / epsilon);
          expect(difference(samples[0], samples[1]), id + ' step endpoint position').toBeLessThan(.0001);
          expect(velocityJump, id + ' step endpoint velocity').toBeLessThan(.02);
        }
        for (const fraction of [.03, .27, .59, .96]) {
          const time = start + (end - start) * fraction;
          wildlife.update(time); const expected = footState(pair);
          wildlife.update(time); expect(footState(pair)).toEqual(expected);
          wildlife.update(40); wildlife.update(time); expect(footState(pair)).toEqual(expected);
          wildlife.update(0); wildlife.update(time); expect(footState(pair)).toEqual(expected);
        }
      }
    } finally { wildlife.dispose(); }
  });
});
