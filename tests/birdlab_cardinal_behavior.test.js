import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const id = 'northernCardinal';
function fixture(options = {}) {
  const scope = {}, scene = new THREE.Scene(); let model, pose;
  new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const value = create(...args), update = value.update;
    if (args[1] === id) {
      model = value;
      value.update = next => {
        pose = { ...next, footTargets: next.footTargets?.map(target => ({ ...target })) || null };
        update(next);
      };
    }
    return value;
  };
  new Function('window', readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8'))(scope);
  const wildlife = scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57, ...options });
  return { scene, wildlife, model, get pose() { return pose; }, state: () => wildlife.snapshot().find(bird => bird.id === id) };
}
function transforms(root) {
  const values = [];
  root.traverse(object => values.push(...object.position.toArray(), ...object.quaternion.toArray()));
  return values;
}
function soleVertices(foot) {
  const mesh = foot.getObjectByName('woodland-scaled-toes'), geometry = mesh.geometry;
  // Separate the articulating leg from actual sole, toes and claws.
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  for (let i = 0; i < geometry.index.count; i += 3) {
    const a = geometry.index.getX(i), b = geometry.index.getX(i + 1), c = geometry.index.getX(i + 2);
    parent[find(b)] = find(a); parent[find(c)] = find(a);
  }
  const leg = find(0), point = new THREE.Vector3(), values = [];
  for (let i = 0; i < parent.length; i++) if (find(i) !== leg) {
    point.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);
    values.push(point.x, point.y, point.z);
  }
  return values;
}
function minimumY(values) { return Math.min(...values.filter((_, index) => index % 3 === 1)); }

describe('Northern cardinal independent woodland behavior', () => {
  it('pushes off with both feet, carries them through each hop, and plants both during the anticipation and landing holds', () => {
    const f = fixture();
    try {
      for (const hop of [0, 1]) {
        for (const hold of [[.03, .09, .15], [.72, .83, .95]]) {
          let planted;
          for (const local of hold) {
            f.wildlife.update(4.4 + .7 * (hop + local)); f.scene.updateMatrixWorld(true);
            const soles = f.model.feet.map(soleVertices);
            expect(f.state().altitude).toBe(0); expect(f.pose.flight).toBe(0);
            expect(f.pose.footTargets.every(target => target.swing === -1)).toBe(true);
            for (const sole of soles) expect(Math.abs(minimumY(sole))).toBeLessThan(.0015);
            if (planted) soles.forEach((sole, foot) => {
              expect(Math.max(...sole.map((value, index) => Math.abs(value - planted[foot][index]))), 'sole slides during hop hold').toBeLessThan(1e-7);
            });
            planted = soles;
          }
        }
        f.wildlife.update(4.4 + .7 * (hop + .40)); f.scene.updateMatrixWorld(true);
        expect(f.state().altitude).toBeGreaterThan(.035); expect(f.state().behavior).toBe('Hopping and searching');
        expect(f.pose.footTargets[0].swing).toBe(f.pose.footTargets[1].swing);
        for (const foot of f.model.feet) expect(minimumY(soleVertices(foot))).toBeGreaterThan(.03);
      }
    } finally { f.wildlife.dispose(); }
  });

  it('joins hop anticipation, lift and landing with continuous root velocity and acceleration', () => {
    const f = fixture(), epsilon = 1e-5;
    try {
      for (const hop of [0, 1]) for (const local of [0, .18, .65, 1]) {
        const boundary = 4.4 + .7 * (hop + local), positions = [];
        for (const offset of [-2, -1, 0, 1, 2]) {
          f.wildlife.update(boundary + epsilon * offset); positions.push(f.model.root.position.toArray());
        }
        for (let axis = 0; axis < 3; axis++) {
          const velocityLeft = (positions[2][axis] - positions[1][axis]) / epsilon;
          const velocityRight = (positions[3][axis] - positions[2][axis]) / epsilon;
          const accelerationLeft = (positions[2][axis] - 2 * positions[1][axis] + positions[0][axis]) / epsilon ** 2;
          const accelerationRight = (positions[4][axis] - 2 * positions[3][axis] + positions[2][axis]) / epsilon ** 2;
          expect(Math.abs(velocityLeft - velocityRight)).toBeLessThan(.0001);
          expect(Math.abs(accelerationLeft - accelerationRight)).toBeLessThan(.03);
        }
      }
    } finally { f.wildlife.dispose(); }
  });

  it('chooses varied independent hop, seed-foraging and flight bouts without reallocating model resources', () => {
    const f = fixture(), resources = new Set(); let hops = 0, feeds = 0, flights = 0, grounded = 0;
    try {
      f.model.root.traverse(object => { if (object.isMesh) { resources.add(object.geometry); resources.add(object.material); } });
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 100 * 30; frame++) {
        f.wildlife.update(frame / 30, 1 / 30);
        const state = f.state();
        expect(state.position.every(Number.isFinite)).toBe(true); expect(Math.hypot(state.position[0], state.position[2])).toBeLessThan(6.81);
        if (state.behavior === 'Hopping and searching') { hops++; expect(f.pose.flight).toBe(0); }
        if (state.behavior === 'Foraging') feeds++;
        if (state.altitude > .15) flights++;
        if (f.pose.footTargets?.every(target => target.swing === -1)) grounded++;
      }
      expect(hops).toBeGreaterThan(20); expect(feeds).toBeGreaterThan(20); expect(flights).toBeGreaterThan(20); expect(grounded).toBeGreaterThan(20);
      f.model.root.traverse(object => { if (object.isMesh) { expect(resources.has(object.geometry)).toBe(true); expect(resources.has(object.material)).toBe(true); } });
    } finally { f.wildlife.dispose(); }
  }, 20000);

  it('replays at 30 and 60 Hz, freezes when paused, and restores Guided observations after Free roam', () => {
    const a = fixture(), b = fixture();
    try {
      a.wildlife.update(4.68); const guided = transforms(a.model.root);
      a.wildlife.setMode('free'); b.wildlife.setMode('free');
      for (let frame = 0; frame < 25 * 30; frame++) {
        a.wildlife.update(frame / 30, 1 / 30);
        b.wildlife.update(frame / 30, 1 / 60); b.wildlife.update(frame / 30, 1 / 60);
        const first = transforms(a.model.root), second = transforms(b.model.root);
        expect(Math.max(...first.map((value, index) => Math.abs(value - second[index])))).toBeLessThan(1e-8);
        const held = a.state(); a.wildlife.update(900, 0);
        expect(a.state()).toEqual(held); expect(transforms(a.model.root)).toEqual(first);
      }
      a.wildlife.setMode('guided'); a.wildlife.update(4.68); expect(transforms(a.model.root)).toEqual(guided);
    } finally { a.wildlife.dispose(); b.wildlife.dispose(); }
  });

  it('settles both feet before a smooth outward escape and keeps them planted during wing folding', () => {
    const f = fixture(), observer = { position: new THREE.Vector3(-.32, 1.65, 2.45), speed: 0 };
    try {
      f.wildlife.setMode('free'); let flew = false, landed = false, landingFrames = 0, lastStep = -1, firstWing = -1, planted;
      let previous = f.state();
      for (let frame = 0; frame < 7 * 60; frame++) {
        f.wildlife.update(frame / 60, 1 / 60, observer); f.scene.updateMatrixWorld(true);
        const state = f.state(), pose = f.pose;
        if (!flew && pose.footTargets?.some(target => target.swing >= 0)) lastStep = frame;
        if (firstWing < 0 && pose.flight > .01) firstWing = frame;
        if (state.altitude > .05) {
          flew = true;
          expect(Math.hypot(state.position[0] - observer.position.x, state.position[2] - observer.position.z)).toBeGreaterThanOrEqual(
            Math.hypot(previous.position[0] - observer.position.x, previous.position[2] - observer.position.z) - 1e-8);
        }
        if (flew && state.altitude === 0 && !landed) { landed = true; expect(pose.flight).toBeGreaterThan(.99); expect(pose.landing).toBe(1); }
        if (landed && landingFrames++ < 23) {
          const soles = f.model.feet.map(soleVertices);
          for (const sole of soles) expect(Math.abs(minimumY(sole))).toBeLessThan(.0015);
          if (planted) soles.forEach((sole, foot) => expect(Math.max(...sole.map((value, index) => Math.abs(value - planted[foot][index])))).toBeLessThan(1e-7));
          planted = soles;
        }
        previous = state;
      }
      expect(flew && landed).toBe(true); expect(firstWing - lastStep).toBeGreaterThanOrEqual(2); expect(landingFrames).toBeGreaterThan(23);
    } finally { f.wildlife.dispose(); }
  });

  it('refuses blocked destinations instead of hopping or flying through habitat obstacles', () => {
    const f = fixture({ isBlocked: () => true });
    try {
      f.wildlife.setMode('free'); const start = f.state().position;
      for (let frame = 0; frame < 24 * 20; frame++) {
        f.wildlife.update(frame / 20, 1 / 20);
        expect(f.state().position).toEqual(start); expect(f.state().altitude).toBe(0);
      }
    } finally { f.wildlife.dispose(); }
  });
});
