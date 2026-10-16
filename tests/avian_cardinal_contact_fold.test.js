import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture() {
  const scope = {}, scene = new THREE.Scene(); let model, pose;
  Function('window', anatomy)(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const value = create(...args), update = value.update;
    if (args[1] === 'northernCardinal') {
      model = value; value.update = next => { pose = { ...next }; update(next); };
    }
    return value;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57 });
  return { scene, wildlife, model, get pose() { return pose; }, state: () => wildlife.snapshot().find(bird => bird.id === 'northernCardinal') };
}
function wingShape(model) {
  const values = [];
  for (const wing of model.wings) wing.traverse(part => {
    values.push(...part.position.toArray(), ...part.quaternion.toArray());
    if (part.isMesh) values.push(...part.geometry.attributes.position.array);
  });
  return values;
}
function soleShape(model) {
  const values = [], point = new THREE.Vector3();
  for (const foot of model.feet) {
    const mesh = foot.getObjectByName('woodland-scaled-toes'), { position, featherInfo } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) if (featherInfo.getX(i) !== 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); values.push(point.x, point.y, point.z);
    }
  }
  return values;
}

describe('cardinal transition from the last stroke to a grounded wing fold', () => {
  it('preserves the established departure, cruise, approach and contact poses before damping', () => {
    const f = fixture();
    // Golden samples from the previous guided flight establish that damping
    // begins at foot contact, without changing the airborne effort or phase.
    const samples = [
      [12.9, 0, .84, 518.7397789607465],
      [13.04, .49999999999999334, .8389385215534129, 524.3695129959796],
      [13.2, 1, .7651274547233168, 530.8034947505315],
      [13.6, 1, .6, 546.8884491369113],
      [14.05, 1, .72, 564.9840228215883],
      [14.2, .4281685892273448, .72, 571.0158807164809]
    ];
    try {
      for (const [time, flight, effort, phase] of samples) {
        f.wildlife.update(time);
        expect(f.pose.flight).toBeCloseTo(flight, 12);
        expect(f.pose.effort).toBeCloseTo(effort, 12);
        expect(f.pose.phase).toBeCloseTo(phase, 10);
      }
      f.wildlife.update(14.24); expect(f.pose.effort).toBeCloseTo(.36, 12);
      f.wildlife.update(14.29); expect(f.pose.effort).toBe(0);
      expect(f.pose.flight).toBeGreaterThan(0); expect(f.pose.flightTuck).toBe(0);
      f.wildlife.update(14.3); expect(f.pose.landingSettle).toBeCloseTo(1, 12);
      f.wildlife.update(14.73); expect(f.pose.landingSettle).toBe(0);
    } finally { f.wildlife.dispose(); }
  });

  it('joins contact damping with continuous velocity and acceleration at both ends', () => {
    const f = fixture(), epsilon = 1e-6;
    try {
      for (const boundary of [14.2, 14.28]) {
        const samples = [];
        for (const offset of [-2, -1, 0, 1, 2]) { f.wildlife.update(boundary + offset * epsilon); samples.push(f.pose.effort); }
        const leftV = (3 * samples[2] - 4 * samples[1] + samples[0]) / (2 * epsilon);
        const rightV = (-3 * samples[2] + 4 * samples[3] - samples[4]) / (2 * epsilon);
        const leftA = (samples[2] - 2 * samples[1] + samples[0]) / epsilon ** 2;
        const rightA = (samples[4] - 2 * samples[3] + samples[2]) / epsilon ** 2;
        expect(Math.abs(leftV - rightV)).toBeLessThan(.000001);
        expect(Math.abs(leftA - rightA)).toBeLessThan(.15);
      }
    } finally { f.wildlife.dispose(); }
  });

  it.each(['low', 'high'])('keeps the grounded fold independent of running wingbeat phase (%s)', quality => {
    const scope = {}; Function('window', anatomy)(scope);
    const model = scope.AvianWoodlandBirds.create(THREE, 'northernCardinal', { quality });
    try {
      for (const flight of [.96, .7, .25]) {
        let expected;
        for (const phase of [0, .5, 1.4, 2.8, 4.2, 6.2]) {
          model.update({ flight, phase, effort: 0, landing: 1, flightTuck: 0, landingSettle: .8 });
          const current = wingShape(model);
          if (expected) expect(current).toEqual(expected); else expected = current;
        }
      }
    } finally { model.dispose(); }
  });

  it('damps actual free-flight contact without sliding feet or restarting the wingbeat', () => {
    const f = fixture(), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    let flew = false, landedFrames = 0, foldedFrames = 0, previousPhase, support;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 5 * 60; frame++) {
        f.wildlife.update(frame / 60, 1 / 60, observer); f.scene.updateMatrixWorld(true);
        const pose = f.pose, state = f.state();
        if (previousPhase !== undefined) {
          const frequency = (pose.phase - previousPhase) * 60 / (Math.PI * 2);
          expect(frequency).toBeGreaterThan(6.39); expect(frequency).toBeLessThan(8.02);
        }
        previousPhase = pose.phase;
        if (state.altitude > .02) flew = true;
        if (flew && state.altitude === 0) landedFrames++;
        if (!landedFrames || pose.flight === 0) continue;
        const feet = soleShape(f.model);
        if (support) feet.forEach((value, i) => expect(Math.abs(value - support[i])).toBeLessThan(1e-7));
        support = feet; expect(pose.flightTuck).toBe(0);
        if (landedFrames >= 7) { expect(pose.effort).toBe(0); foldedFrames++; }
      }
      expect(foldedFrames).toBeGreaterThan(10);
    } finally { f.wildlife.dispose(); }
  }, 20000);

  it('reproduces the same intermediate fold after arbitrary seeking and pauses free mode exactly', () => {
    const f = fixture();
    try {
      f.wildlife.update(14.24); const shape = wingShape(f.model), pose = { ...f.pose };
      for (const time of [4.68, 13.2, 14.7, 31.6, 14.3, 8.2]) f.wildlife.update(time);
      f.wildlife.update(14.24); expect(wingShape(f.model)).toEqual(shape); expect(f.pose).toEqual(pose);
      f.wildlife.setMode('free'); f.wildlife.update(0, 1 / 60);
      const heldShape = wingShape(f.model), heldPose = { ...f.pose };
      f.wildlife.update(800, 0); expect(wingShape(f.model)).toEqual(heldShape); expect(f.pose).toEqual(heldPose);
    } finally { f.wildlife.dispose(); }
  });
});
