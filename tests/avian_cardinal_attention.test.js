import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');

function fixture(options = {}) {
  const scope = {}, scene = new THREE.Scene(), poses = {};
  Function('window', anatomy)(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const model = create(...args), update = model.update;
    model.update = pose => {
      poses[args[1]] = { ...pose, footTargets: pose.footTargets?.map(foot => ({ ...foot })) ?? null };
      update(pose);
    };
    return model;
  };
  Function('window', behavior)(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57, ...options });
  return { wildlife, poses, get pose() { return poses.northernCardinal; },
    state: () => wildlife.snapshot().find(bird => bird.id === 'northernCardinal') };
}

function quiet(pose) {
  return pose.flight === 0 && pose.walking === 0 && pose.peck === 0 && pose.preen === 0 && pose.hopPhase === -1;
}

describe('cardinal quiet woodland attention', () => {
  it('holds varied sideways, ground and upward looks between continuous short shifts', () => {
    const f = fixture({ isBlocked: () => true }), holds = [], yaws = [], pitches = [];
    let previous, hold = 0, maxStep = 0;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 85 * 30; frame++) {
        f.wildlife.update(frame / 30, 1 / 30);
        const pose = f.pose;
        if (quiet(pose) && previous && quiet(previous)) {
          yaws.push(pose.lookYaw); pitches.push(pose.lookPitch);
          const step = Math.hypot(pose.lookYaw - previous.lookYaw, pose.lookPitch - previous.lookPitch);
          maxStep = Math.max(maxStep, step);
          if (step < 1e-12) hold += 1 / 30;
          else { if (hold > .7) holds.push(hold); hold = 0; }
        } else { if (hold > .7) holds.push(hold); hold = 0; }
        previous = pose;
      }
      if (hold > .7) holds.push(hold);
      expect(holds.length).toBeGreaterThan(8);
      expect(Math.max(...holds) - Math.min(...holds)).toBeGreaterThan(1);
      expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(.5);
      expect(Math.max(...pitches)).toBeGreaterThan(.07);
      expect(Math.min(...pitches)).toBeLessThan(-.05);
      expect(maxStep).toBeLessThan(.16);
    } finally { f.wildlife.dispose(); }
  });

  it('replays the same attention at 30 and 60 Hz, freezes on pause, and restarts from its seed', () => {
    const a = fixture(), b = fixture();
    try {
      a.wildlife.setMode('free'); b.wildlife.setMode('free');
      let first;
      for (let frame = 0; frame < 24 * 30; frame++) {
        a.wildlife.update(frame / 30, 1 / 30);
        b.wildlife.update(frame / 30, 1 / 60); b.wildlife.update(frame / 30, 1 / 60);
        expect(a.pose.lookYaw).toBeCloseTo(b.pose.lookYaw, 10);
        expect(a.pose.lookPitch).toBeCloseTo(b.pose.lookPitch, 10);
        if (frame === 89) first = { yaw: a.pose.lookYaw, pitch: a.pose.lookPitch };
      }
      const held = { ...a.pose };
      a.wildlife.update(900, 0); expect(a.pose).toEqual(held);
      a.wildlife.setMode('guided'); a.wildlife.setMode('free');
      for (let frame = 0; frame < 90; frame++) a.wildlife.update(frame / 30, 1 / 30);
      expect(a.pose.lookYaw).toBe(first.yaw); expect(a.pose.lookPitch).toBe(first.pitch);
    } finally { a.wildlife.dispose(); b.wildlife.dispose(); }
  }, 30000 /* exhaustive replay/calculation coverage; not a wall-clock performance test */);

  it('gives observer vigilance priority and releases the added pitch during flight, hops and preening', () => {
    const f = fixture(), observer = { position: new THREE.Vector3(-.35, 1.65, 1.25), speed: 0 };
    let alerted = 0, hops = 0, flights = 0, grooming = 0;
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 4 * 60; frame++) {
        f.wildlife.update(frame / 60, 1 / 60, observer);
        if (f.state().alertness >= .30 && quiet(f.pose)) {
          expect(Math.abs(f.pose.lookPitch)).toBe(0); expect(f.pose.lookYaw).toBeGreaterThan(.25); alerted++;
        }
      }
      expect(alerted).toBeGreaterThan(10);
      f.wildlife.setMode('guided'); f.wildlife.setMode('free');
      for (let frame = 0; frame < 100 * 20; frame++) {
        f.wildlife.update(frame / 20, 1 / 20);
        const pose = f.pose;
        if (pose.hopPhase > .22 && pose.hopPhase < .60) {
          expect(Math.abs(pose.lookYaw)).toBe(0); expect(Math.abs(pose.lookPitch)).toBe(0); hops++;
        }
        if (pose.flight === 1) { expect(Math.abs(pose.lookYaw)).toBe(0); flights++; }
        if (pose.preen === 1) { expect(Math.abs(pose.lookPitch)).toBe(0); grooming++; }
      }
      expect(hops).toBeGreaterThan(10); expect(flights).toBeGreaterThan(10); expect(grooming).toBeGreaterThan(10);
    } finally { f.wildlife.dispose(); }
  });

  it('restores every Guided species pose after free-roam attention', () => {
    const f = fixture();
    try {
      const times = [0, 1.22, 5.64, 13.5, 14.24, 23.82, 40.85, 44];
      const guided = times.map(time => { f.wildlife.update(time); return structuredClone(f.poses); });
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 20 * 30; frame++) f.wildlife.update(frame / 30, 1 / 30);
      f.wildlife.setMode('guided');
      times.forEach((time, index) => { f.wildlife.update(time); expect(f.poses).toEqual(guided[index]); });
    } finally { f.wildlife.dispose(); }
  });
});
