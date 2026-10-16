import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(quality = 'low', groundHeight = () => 0) {
  const scope = {}, scene = new THREE.Scene(); let model, pose;
  Function('window', anatomy)(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const value = create(...args), update = value.update;
    if (args[1] === 'northernCardinal') {
      model = value;
      value.update = next => { pose = next; update(next); };
    }
    return value;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality, groundHeight, seed: 57 });
  return { scene, wildlife, model, get pose() { return pose; } };
}
function sole(foot) {
  const mesh = foot.getObjectByName('woodland-scaled-toes'), position = mesh.geometry.attributes.position;
  const surface = mesh.geometry.attributes.featherInfo, point = new THREE.Vector3(), values = [];
  for (let i = 0; i < position.count; i++) if (surface.getX(i) !== 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); values.push(point.x, point.y, point.z);
  }
  return values;
}
function largestDifference(a, b) { let found = 0; for (let i = 0; i < a.length; i++) found = Math.max(found, Math.abs(a[i] - b[i])); return found; }
function articulation(model) {
  return [model.body, model.head, model.tail, ...model.wings, ...model.feet].flatMap(part => [...part.position.toArray(), ...part.quaternion.toArray()]);
}
function positions(model) {
  const result = []; model.root.traverse(part => { if (part.isMesh) result.push(...part.geometry.attributes.position.array); }); return result;
}

describe('cardinal coordinated hop and flight posture', () => {
  it.each(['high', 'low'])('leans into the push-off, steadies the head, gathers both feet and absorbs landing (%s)', quality => {
    const f = fixture(quality);
    try {
      f.wildlife.update(4.4 + .7 * .09);
      expect(f.model.body.rotation.x).toBeGreaterThan(.08);
      expect(Math.abs(f.model.head.rotation.x)).toBeLessThan(.02);
      expect(f.model.tail.rotation.x).toBeLessThan(-.07);
      expect(f.model.wings[0].rotation.x).toBeCloseTo(f.model.body.rotation.x, 10);
      f.wildlife.update(4.4 + .7 * .40); f.scene.updateMatrixWorld(true);
      expect(f.model.body.rotation.x).toBeGreaterThan(.07);
      expect(Math.abs(f.model.head.rotation.x)).toBeLessThan(.02);
      for (const foot of f.model.feet) {
        expect(foot.rotation.x).toBeLessThan(-.40);
        expect(foot.position.z).toBeLessThan(.001);
        const ankle = new THREE.Vector3(0, f.model.profile.ankleY, f.model.profile.ankleZ).applyMatrix4(foot.matrix);
        expect(ankle.z).toBeLessThan(.004);
        const points = sole(foot);
        for (let i = 1; i < points.length; i += 3) expect(points[i]).toBeGreaterThan(.035);
      }
      expect(f.model.feet[0].rotation.x).toBe(f.model.feet[1].rotation.x);
      f.wildlife.update(4.4 + .7 * .825);
      expect(f.model.body.rotation.x).toBeLessThan(-.06);
      expect(f.model.tail.rotation.x).toBeGreaterThan(.075);
      expect(Math.abs(f.model.head.rotation.x)).toBeLessThan(.02);
    } finally { f.wildlife.dispose(); }
  });

  it.each([['flat', () => 0], ['sloped', (x, z) => x * .012 + z * .018]])('keeps every supporting sole vertex fixed through compression and settling on %s terrain', (_label, height) => {
    const f = fixture('low', height);
    try {
      for (const hop of [0, 1]) for (const hold of [[.01, .04, .09, .13, .17], [.67, .72, .825, .92, .99]]) {
        let planted;
        for (const local of hold) {
          f.wildlife.update(4.4 + .7 * (hop + local)); f.scene.updateMatrixWorld(true);
          const feet = f.model.feet.map(sole);
          feet.forEach((points, foot) => {
            if (planted) expect(largestDifference(points, planted[foot])).toBeLessThan(1e-7);
            let lowest = Infinity;
            for (let i = 0; i < points.length; i += 3) lowest = Math.min(lowest, points[i + 1] - height(points[i], points[i + 2]));
            expect(Math.abs(lowest)).toBeLessThan(.0015);
          });
          planted = feet;
        }
      }
    } finally { f.wildlife.dispose(); }
  });

  it('joins the new articulation with continuous velocity and acceleration and returns to exact rest', () => {
    const f = fixture(), epsilon = 1e-5;
    try {
      for (const hop of [0, 1]) for (const local of [0, .18, .65, 1]) {
        const boundary = 4.4 + .7 * (hop + local), samples = [];
        for (const offset of [-2, -1, 0, 1, 2]) { f.wildlife.update(boundary + offset * epsilon); samples.push(articulation(f.model)); }
        for (let i = 0; i < samples[0].length; i++) {
          // Evaluate both derivatives at the join, rather than comparing
          // first differences centered half a sample apart during a scan.
          const leftVelocity = (3 * samples[2][i] - 4 * samples[1][i] + samples[0][i]) / (2 * epsilon);
          const rightVelocity = (-3 * samples[2][i] + 4 * samples[3][i] - samples[4][i]) / (2 * epsilon);
          const leftAcceleration = (samples[2][i] - 2 * samples[1][i] + samples[0][i]) / epsilon ** 2;
          const rightAcceleration = (samples[4][i] - 2 * samples[3][i] + samples[2][i]) / epsilon ** 2;
          expect(Math.abs(leftVelocity - rightVelocity), `hop ${hop}, phase ${local}, transform ${i} velocity`).toBeLessThan(.0001);
          expect(Math.abs(leftAcceleration - rightAcceleration), `hop ${hop}, phase ${local}, transform ${i} acceleration`).toBeLessThan(.08);
        }
      }
      f.wildlife.update(4.68); const expected = [...articulation(f.model), ...positions(f.model)];
      for (const time of [13.4, 4.45, 5.6, 14.1, 8.5, 31.5]) f.wildlife.update(time);
      f.wildlife.update(4.68);
      expect([...articulation(f.model), ...positions(f.model)]).toEqual(expected);
      f.wildlife.setMode('free'); f.wildlife.update(0, 1 / 30);
      const held = [...articulation(f.model), ...positions(f.model)];
      f.wildlife.update(800, 0); expect([...articulation(f.model), ...positions(f.model)]).toEqual(held);
    } finally { f.wildlife.dispose(); }
  });

  it.each(['high', 'low'])('sweeps the crest into flight without moving its roots or changing the face (%s)', quality => {
    const scope = {}; Function('window', anatomy)(scope);
    const model = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality });
    try {
      const mesh = model.head.getObjectByName('woodland-head-plumage');
      const { position, featherInfo, uv } = mesh.geometry.attributes;
      const array = position.array, before = array.slice(), face = model.head.getObjectByName('woodland-eyes-and-bill').geometry.attributes.position.array.slice();
      let restingTip = -Infinity, flightTip = -Infinity, moved = 0;
      for (let i = 0; i < position.count; i++) if (featherInfo.getY(i) <= -1600) restingTip = Math.max(restingTip, position.getY(i));
      model.update({ flight: 1, effort: .8 });
      for (let i = 0; i < position.count; i++) {
        const cardinalCrest = featherInfo.getY(i) <= -1600;
        if (!cardinalCrest || uv.getY(i) === 0) for (let axis = 0; axis < 3; axis++) expect(array[i * 3 + axis]).toBe(before[i * 3 + axis]);
        if (cardinalCrest) {
          flightTip = Math.max(flightTip, position.getY(i));
          if (Math.abs(position.getY(i) - before[i * 3 + 1]) > .004) moved++;
        }
      }
      expect(flightTip).toBeLessThan(restingTip - .005); expect(moved).toBeGreaterThan(20);
      expect(model.head.getObjectByName('woodland-eyes-and-bill').geometry.attributes.position.array).toEqual(face);
      for (let step = 0; step <= 30; step++) model.update({ flight: 1 - step / 30, landing: 1, effort: .5 });
      expect(position.array).toBe(array); expect(array).toEqual(before);
      expect(mesh.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
    } finally { model.dispose(); }
  });

  it.each(['high', 'low'])('keeps short crest tips above their own roots instead of hooking backward (%s)', quality => {
    const scope = {}; Function('window', anatomy)(scope);
    const bird = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality });
    try {
      const { position, featherInfo, uv } = bird.head.getObjectByName('woodland-head-plumage').geometry.attributes;
      const feathers = new Map();
      for (let i = 0; i < position.count; i++) if (featherInfo.getY(i) <= -1600 && uv.getX(i) === .5) {
        const seed = featherInfo.getY(i);
        if (!feathers.has(seed)) feathers.set(seed, { shaft: [] });
        feathers.get(seed).shaft.push(i);
        if (uv.getY(i) === 0) feathers.get(seed).root = i;
        if (uv.getY(i) === 1) feathers.get(seed).tip = i;
      }
      const ordered = [...feathers.values()].map(part => ({ ...part,
        restRise: position.getY(part.tip) - position.getY(part.root),
        restSweep: position.getZ(part.root) - position.getZ(part.tip),
        shaft: part.shaft.sort((a, b) => uv.getY(a) - uv.getY(b)),
        tipY: position.getY(part.tip), tipZ: position.getZ(part.tip) })).sort((a, b) => a.restRise - b.restRise);
      for (const part of ordered) expect(part.restSweep).toBeGreaterThan(0);
      for (const flight of [.25, .5, .75, 1]) {
        bird.update({ flight, effort: .7 });
        for (const part of ordered) {
          expect(position.getY(part.tip) - position.getY(part.root)).toBeGreaterThan(.001);
          // Short outer feathers have shorter resting shafts. Their flight
          // sweep must preserve that own geometry instead of meeting a fixed
          // length chosen for the former long, crossing crest surfaces.
          const sweep = position.getZ(part.root) - position.getZ(part.tip);
          expect(sweep).toBeGreaterThanOrEqual(part.restSweep - 1e-8);
          for (let row = 1; row < part.shaft.length; row++) {
            const previous = part.shaft[row - 1], current = part.shaft[row];
            expect(position.getY(current) - position.getY(previous)).toBeGreaterThanOrEqual(-1e-8);
            expect(position.getZ(current) - position.getZ(previous)).toBeLessThanOrEqual(1e-8);
          }
        }
      }
      const shortest = ordered[0], tallest = ordered.at(-1);
      const travel = part => Math.hypot(position.getY(part.tip) - part.tipY, position.getZ(part.tip) - part.tipZ);
      expect(travel(shortest)).toBeLessThan(travel(tallest) * .60);
    } finally { bird.dispose(); }
  });

  it('ignores optional cardinal hop cues for the three existing shared species', () => {
    const scope = {}; Function('window', anatomy)(scope);
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const bird = scope.AvianWoodlandBirds.create(THREE, id, { quality: 'low' });
      try {
        for (const pose of [{}, { walking: .7, stride: .8 }, { flight: .4, phase: 2.3, effort: .8 }, { peck: .5 }]) {
          bird.update(pose); const expected = [...articulation(bird), ...positions(bird)];
          for (const hopPhase of [.09, .40, .825]) { bird.update({ ...pose, hopPhase }); expect([...articulation(bird), ...positions(bird)]).toEqual(expected); }
        }
      } finally { bird.dispose(); }
    }
  });
});
