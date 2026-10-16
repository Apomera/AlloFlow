import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(groundHeight = () => 0) {
  const scope = {}, scene = new THREE.Scene(); let model, pose;
  Function('window', anatomy)(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const value = create(...args), update = value.update;
    if (args[1] === 'northernCardinal') {
      model = value; value.update = next => { pose = next; update(next); };
    }
    return value;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57, groundHeight });
  return { scene, wildlife, model, get pose() { return pose; }, state: () => wildlife.snapshot().find(bird => bird.id === 'northernCardinal') };
}
function sole(foot) {
  const mesh = foot.getObjectByName('woodland-scaled-toes'), { position, featherInfo } = mesh.geometry.attributes;
  const point = new THREE.Vector3(), values = [];
  for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) !== 1) {
    point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); values.push(point.x, point.y, point.z);
  }
  return values;
}
function maximumDifference(a, b) { let value = 0; for (let i = 0; i < a.length; i++) value = Math.max(value, Math.abs(a[i] - b[i])); return value; }
function transforms(model) { return [model.body, model.head, model.tail, ...model.wings, ...model.feet].flatMap(part => [...part.position.toArray(), ...part.quaternion.toArray()]); }

describe('cardinal leg-supported flight loading', () => {
  it.each([['flat', () => 0], ['sloped', (x, z) => x * .012 + z * .018]])('plants every toe through wing preparation and landing compression on %s terrain', (_label, height) => {
    const f = fixture(height), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    let flew = false, landed = false, preparationFrames = 0, settleFrames = 0, launchDepth = 0, landingDepth = 0;
    let launchSoles, landingSoles;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 5 * 120; frame++) {
        f.wildlife.update(frame / 120, 1 / 120, observer); f.scene.updateMatrixWorld(true);
        const state = f.state(), pose = f.pose;
        if (state.altitude > .02) flew = true;
        if (flew && state.altitude === 0) landed = true;
        const preparing = !flew && state.altitude === 0 && pose.flight > .001;
        const settling = landed && pose.landingLoad > 0;
        if (!preparing && !settling) continue;
        expect(pose.flightTuck).toBe(0);
        const feet = f.model.feet.map(sole), prior = preparing ? launchSoles : landingSoles;
        feet.forEach((values, foot) => {
          let clearance = Infinity;
          for (let i = 0; i < values.length; i += 3) clearance = Math.min(clearance, values[i + 1] - height(values[i], values[i + 2]));
          expect(Math.abs(clearance)).toBeLessThan(.0015);
          if (prior) expect(maximumDifference(values, prior[foot]), 'supporting toes slide while the torso loads').toBeLessThan(1e-7);
        });
        if (preparing) { preparationFrames++; launchSoles = feet; launchDepth = Math.max(launchDepth, .068 - f.model.body.position.y); }
        else { settleFrames++; landingSoles = feet; landingDepth = Math.max(landingDepth, .068 - f.model.body.position.y); }
      }
      expect(preparationFrames).toBeGreaterThan(10); expect(settleFrames).toBeGreaterThan(25);
      expect(launchDepth).toBeGreaterThan(.0045); expect(landingDepth).toBeGreaterThan(.0035);
    } finally { f.wildlife.dispose(); }
  });

  it('gathers both feet only after liftoff and extends them before touchdown without restarting a wingbeat', () => {
    const f = fixture(), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    let previousPhase, flights = 0, approaches = 0, maxTuck = 0;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 5 * 120; frame++) {
        f.wildlife.update(frame / 120, 1 / 120, observer); f.scene.updateMatrixWorld(true);
        const pose = f.pose, state = f.state();
        if (previousPhase !== undefined) {
          const rate = (pose.phase - previousPhase) * 120 / (Math.PI * 2);
          expect(rate).toBeGreaterThan(6.39); expect(rate).toBeLessThan(8.02);
        }
        previousPhase = pose.phase;
        maxTuck = Math.max(maxTuck, pose.flightTuck);
        if (pose.flightTuck > 0) { expect(state.altitude).toBeGreaterThan(0); flights++; }
        if (state.altitude > .01 && pose.landing > .999) { expect(pose.flightTuck).toBeLessThan(.001); approaches++; }
        if (state.altitude > 0) for (const foot of f.model.feet) {
          const values = sole(foot);
          for (let i = 1; i < values.length; i += 3) expect(values[i]).toBeGreaterThan(-.0015);
        }
        expect(f.model.feet[0].rotation.x).toBe(f.model.feet[1].rotation.x);
      }
      expect(flights).toBeGreaterThan(40); expect(approaches).toBeGreaterThan(5); expect(maxTuck).toBe(1);
    } finally { f.wildlife.dispose(); }
  });

  it('accepts periodic wing load in the chest while holding the sightline quiet and countering with the tail', () => {
    const scope = {}; Function('window', anatomy)(scope);
    const model = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality: 'low' });
    try {
      const chest = [], heads = [], tails = [], heights = [];
      for (let step = 0; step < 32; step++) {
        model.update({ flight: 1, phase: step / 32 * Math.PI * 2, effort: .8, flightTuck: 1 });
        chest.push(model.body.rotation.x); heads.push(model.head.rotation.x); tails.push(model.tail.rotation.x); heights.push(model.body.position.y);
      }
      expect(Math.max(...chest) - Math.min(...chest)).toBeGreaterThan(.03);
      expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(.001);
      expect(Math.max(...heads) - Math.min(...heads)).toBe(0);
      const covariance = chest.reduce((value, pitch, i) => value + (pitch - .08) * (tails[i] - .055), 0);
      expect(covariance).toBeLessThan(0);
      model.update({ flight: 1, effort: 0, phase: 0, flightTuck: 1 }); const restingLoad = transforms(model);
      model.update({ flight: 1, effort: 0, phase: 2, flightTuck: 1 }); expect(transforms(model)).toEqual(restingLoad);
    } finally { model.dispose(); }
  });

  it('joins preparation, lift and settling smoothly and retains geometry through repeatable seeking', () => {
    const f = fixture(), epsilon = 1e-5, resources = [], arrays = [];
    try {
      f.model.root.traverse(part => { if (part.isMesh) { resources.push(part.geometry, part.material); arrays.push(part.geometry.attributes.position.array); } });
      for (const boundary of [12.84, 13, 13.2, 14.2, 14.52]) {
        const samples = [];
        for (const offset of [-2, -1, 0, 1, 2]) { f.wildlife.update(boundary + offset * epsilon); samples.push(transforms(f.model)); }
        for (let i = 0; i < samples[0].length; i++) {
          const leftVelocity = (3 * samples[2][i] - 4 * samples[1][i] + samples[0][i]) / (2 * epsilon);
          const rightVelocity = (-3 * samples[2][i] + 4 * samples[3][i] - samples[4][i]) / (2 * epsilon);
          expect(Math.abs(leftVelocity - rightVelocity), `boundary ${boundary}, transform ${i}`).toBeLessThan(.0005);
          const leftAcceleration = (samples[2][i] - 2 * samples[1][i] + samples[0][i]) / epsilon ** 2;
          const rightAcceleration = (samples[4][i] - 2 * samples[3][i] + samples[2][i]) / epsilon ** 2;
          expect(Math.abs(leftAcceleration - rightAcceleration), `boundary ${boundary}, transform ${i}`).toBeLessThan(.5);
        }
      }
      f.wildlife.update(13.31); const expected = transforms(f.model), geometry = arrays.map(array => array.slice());
      for (const time of [14.36, 13.01, 22.3, 13.70, 4.68, 31.2]) f.wildlife.update(time);
      f.wildlife.update(13.31); expect(transforms(f.model)).toEqual(expected);
      let index = 0;
      f.model.root.traverse(part => {
        if (!part.isMesh) return;
        expect(part.geometry).toBe(resources[index * 2]); expect(part.material).toBe(resources[index * 2 + 1]);
        expect(part.geometry.attributes.position.array).toBe(arrays[index]);
        expect(arrays[index]).toEqual(geometry[index]); expect(arrays[index].every(Number.isFinite)).toBe(true);
        expect(part.geometry.attributes.normal.array.every(Number.isFinite)).toBe(true); index++;
      });
    } finally { f.wildlife.dispose(); }
  });

  it('leaves the other shared species unchanged when given cardinal loading cues', () => {
    const scope = {}; Function('window', anatomy)(scope);
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const model = scope.AvianWoodlandBirds.create(THREE, id, { quality: 'low' });
      try {
        for (const pose of [{}, { walking: .7, stride: 2 }, { flight: .6, phase: 1.8, landing: .3 }]) {
          model.update(pose); const expected = transforms(model);
          model.update({ ...pose, launchLoad: .8, landingLoad: .4, flightTuck: 0 }); expect(transforms(model)).toEqual(expected);
        }
      } finally { model.dispose(); }
    }
  });
});
