import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(quality = 'low', groundHeight = () => 0) {
  const scope = {}, scene = new THREE.Scene(); let model, pose;
  Function('window', anatomy)(scope);
  const make = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const value = make(...args), update = value.update;
    if (args[1] === 'northernCardinal') { model = value; value.update = next => { pose = next; update(next); }; }
    return value;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality, groundHeight, seed: 57 });
  return { scene, wildlife, model, get pose() { return pose; }, state: () => wildlife.snapshot().find(bird => bird.id === 'northernCardinal') };
}
function sole(foot, world = true) {
  const mesh = foot.getObjectByName('woodland-scaled-toes'), { position, featherInfo } = mesh.geometry.attributes;
  const point = new THREE.Vector3(), values = [];
  for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) !== 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(world ? mesh.matrixWorld : foot.matrix); values.push(point.x, point.y, point.z);
  }
  return values;
}
function extent(values, axis) { let min = Infinity, max = -Infinity; for (let i = axis; i < values.length; i += 3) { min = Math.min(min, values[i]); max = Math.max(max, values[i]); } return max - min; }
function difference(a, b) { let largest = 0; for (let i = 0; i < a.length; i++) largest = Math.max(largest, Math.abs(a[i] - b[i])); return largest; }
function articulation(model) { return [model.body, model.head, model.tail, ...model.wings, ...model.feet].flatMap(part => [...part.position.toArray(), ...part.quaternion.toArray()]); }
function tailWidth(model) { const bounds = new THREE.Box3().setFromBufferAttribute(model.tail.children[0].geometry.attributes.position); return bounds.max.x - bounds.min.x; }

describe('cardinal recovery and landing preparation', () => {
  it.each(['high', 'low'])('gathers both feet at the apex, then opens and reaches toward the next plant (%s)', quality => {
    const f = fixture(quality);
    try {
      f.wildlife.update(4.4 + .7 * .40); f.scene.updateMatrixWorld(true);
      const tuckedWidth = extent(sole(f.model.feet[0], false), 0), restingFan = tailWidth(f.model);
      expect(f.model.feet[0].rotation.x).toBeLessThan(-.40);
      f.wildlife.update(4.4 + .7 * .55); f.scene.updateMatrixWorld(true);
      expect(f.state().altitude).toBeGreaterThan(.01);
      for (const foot of f.model.feet) {
        const ankle = new THREE.Vector3(0, f.model.profile.ankleY, f.model.profile.ankleZ).applyMatrix4(foot.matrix);
        expect(foot.rotation.x).toBeGreaterThan(-.001);
        expect(ankle.z).toBeGreaterThan(.012);
        expect(extent(sole(foot, false), 0)).toBeGreaterThan(tuckedWidth * 1.4);
      }
      expect(f.model.feet[0].rotation.x).toBe(f.model.feet[1].rotation.x);
      expect(f.model.head.rotation.x).toBeGreaterThan(.025); expect(f.model.head.rotation.x).toBeLessThan(.05);
      expect(tailWidth(f.model)).toBeGreaterThan(restingFan * 1.3);
      f.wildlife.update(4.4 + .7 * .65); f.scene.updateMatrixWorld(true);
      expect(tailWidth(f.model)).toBe(restingFan);
      for (const foot of f.model.feet) expect(foot.rotation.x).toBe(0);
    } finally { f.wildlife.dispose(); }
  });

  it.each([['flat', () => 0], ['sloped', (x, z) => x * .012 + z * .018]])('keeps toes clear during both hops and fixes every sole vertex after contact on %s terrain', (_label, height) => {
    const f = fixture('low', height);
    try {
      for (const hop of [0, 1]) {
        let planted;
        for (let step = 0; step <= 100; step++) {
          const local = step / 100;
          f.wildlife.update(4.4 + .7 * (hop + local)); f.scene.updateMatrixWorld(true);
          const feet = f.model.feet.map(foot => sole(foot));
          for (const values of feet) {
            let clearance = Infinity;
            for (let i = 0; i < values.length; i += 3) clearance = Math.min(clearance, values[i + 1] - height(values[i], values[i + 2]));
            expect(clearance, `hop ${hop}, phase ${local}`).toBeGreaterThan(-.0015);
          }
          if (local >= .65) {
            if (planted) feet.forEach((values, foot) => expect(difference(values, planted[foot])).toBeLessThan(1e-7));
            planted = feet;
          }
        }
      }
    } finally { f.wildlife.dispose(); }
  });

  it('uses forward foot preparation only in airborne flight approaches and returns to a fixed contact', () => {
    const f = fixture(), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    let reaches = 0, furthest = 0, planted, contactFrames = 0, flew = false;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 5 * 120; frame++) {
        f.wildlife.update(frame / 120, 1 / 120, observer); f.scene.updateMatrixWorld(true);
        const state = f.state(), cue = f.pose.landingReach;
        if (state.altitude > .02) flew = true;
        if (cue > 0) { expect(state.altitude).toBeGreaterThan(0); reaches++; }
        if (cue > .9 && f.pose.flightTuck < .001) for (const foot of f.model.feet) {
          const ankle = new THREE.Vector3(0, f.model.profile.ankleY, f.model.profile.ankleZ).applyMatrix4(foot.matrix);
          furthest = Math.max(furthest, ankle.z);
        }
        const feet = f.model.feet.map(foot => sole(foot));
        if (state.altitude > 0) for (const values of feet) for (let i = 1; i < values.length; i += 3) expect(values[i]).toBeGreaterThan(-.0015);
        if (flew && state.altitude === 0 && contactFrames++ < 65) {
          expect(cue).toBe(0);
          if (planted) feet.forEach((values, foot) => expect(difference(values, planted[foot])).toBeLessThan(1e-7));
          planted = feet;
        }
      }
      expect(reaches).toBeGreaterThan(30); expect(furthest).toBeGreaterThan(.0115); expect(contactFrames).toBeGreaterThan(65);
    } finally { f.wildlife.dispose(); }
  });

  it('joins recovery and plant envelopes continuously, reuses feather buffers and seeks exactly', () => {
    const f = fixture(), epsilon = 1e-5, resources = [];
    try {
      f.model.root.traverse(part => { if (part.isMesh) resources.push([part, part.geometry, part.geometry.attributes.position.array]); });
      for (const air of [.48, .58, .80, 1]) {
        const boundary = 4.4 + .7 * (.18 + .47 * air), samples = [];
        for (const offset of [-2, -1, 0, 1, 2]) { f.wildlife.update(boundary + offset * epsilon); samples.push(articulation(f.model)); }
        for (let i = 0; i < samples[0].length; i++) {
          const leftVelocity = (3 * samples[2][i] - 4 * samples[1][i] + samples[0][i]) / (2 * epsilon);
          const rightVelocity = (-3 * samples[2][i] + 4 * samples[3][i] - samples[4][i]) / (2 * epsilon);
          expect(Math.abs(leftVelocity - rightVelocity)).toBeLessThan(.0005);
          const leftAcceleration = (samples[2][i] - 2 * samples[1][i] + samples[0][i]) / epsilon ** 2;
          const rightAcceleration = (samples[4][i] - 2 * samples[3][i] + samples[2][i]) / epsilon ** 2;
          expect(Math.abs(leftAcceleration - rightAcceleration)).toBeLessThan(.6);
        }
      }
      f.wildlife.update(4.785); const expected = articulation(f.model), positions = resources.map(([, , array]) => array.slice());
      for (const time of [14.1, 5.01, 22.38, 13.02, 4.6]) f.wildlife.update(time);
      f.wildlife.update(4.785); expect(articulation(f.model)).toEqual(expected);
      resources.forEach(([part, geometry, array], index) => {
        expect(part.geometry).toBe(geometry); expect(geometry.attributes.position.array).toBe(array); expect(array).toEqual(positions[index]);
        expect(array.every(Number.isFinite)).toBe(true); expect(geometry.attributes.normal.array.every(Number.isFinite)).toBe(true);
      });
    } finally { f.wildlife.dispose(); }
  });
});
