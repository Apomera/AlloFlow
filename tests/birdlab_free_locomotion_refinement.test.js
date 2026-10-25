import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const ids = ['mourningDove', 'grouse', 'blueJay'];
const origins = { mourningDove: [-.7, -1.6], grouse: [2, 1.55], blueJay: [-1.8, 1.2] };
const source = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
function fixture(controller = source) {
  const scope = {}, scene = new THREE.Scene(), poses = new Map(), models = new Map();
  const groundHeight = (x, z) => .018 * x - .012 * z;
  new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
  const create = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const model = create(...args), update = model.update; models.set(args[1], model);
    model.update = pose => { poses.set(args[1], { ...pose, footTargets: pose.footTargets ? pose.footTargets.map(target => ({ ...target })) : null }); update(pose); };
    return model;
  };
  new Function('window', controller)(scope);
  return { scene, poses, models, groundHeight, wildlife: scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed: 57, groundHeight }) };
}
function contactVertices(foot) {
  const mesh = foot.getObjectByName('woodland-scaled-toes'), geometry = mesh.geometry;
  // The first connected component is the articulating leg. The remaining
  // components are the actual sole, toes, and claws that make ground contact.
  const parent = Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
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
function distance(a, b) { return Math.max(...a.map((v, i) => Math.abs(v - b[i]))); }
function transforms(root) {
  const values = [];
  root.traverse(item => values.push(...item.position.toArray(), ...item.quaternion.toArray(), ...item.scale.toArray()));
  return values;
}

describe('Free woodland grounded reorientation', () => {
  it.each(ids)('keeps %s support toes stationary during preparatory turn steps and plants before takeoff', id => {
    const f = fixture(), [x, z] = origins[id], observer = { position: new THREE.Vector3(x + .03, 1.65, z), speed: 0 };
    try {
      f.wildlife.setMode('free'); const model = f.models.get(id);
      let previous = null, pivotFrames = 0, supportFrames = 0, tookFlight = false, stepped = new Set();
      for (let frame = 0; frame < 6 * 60; frame++) {
        f.wildlife.update(frame / 60, 1 / 60, observer); f.scene.updateMatrixWorld(true);
        const pose = f.poses.get(id), state = f.wildlife.snapshot().find(bird => bird.id === id);
        if (pose.footTargets && pose.footTargets.some(target => Math.abs(target.yaw || 0) > .001)) {
          pivotFrames++; expect(state.altitude).toBe(0); expect(pose.flight).toBe(0);
          expect(state.position[0]).toBe(x); expect(state.position[2]).toBe(z);
          const contact = model.feet.map(contactVertices);
          pose.footTargets.forEach((target, foot) => {
            if (target.swing >= 0) stepped.add(foot);
            if (target.swing < 0 && previous?.targets[foot].swing < 0) {
              expect(distance(contact[foot], previous.contact[foot]), 'planted sole slipped').toBeLessThan(1e-7); supportFrames++;
            }
            const minimum = Math.min(...contact[foot].filter((_, i) => i % 3 === 1).map((y, i) => y - f.groundHeight(contact[foot][i * 3], contact[foot][i * 3 + 2])));
            expect(minimum, 'toe penetration').toBeGreaterThan(-.0015);
            if (target.swing < 0) expect(minimum, 'support hover').toBeLessThan(.0015);
          });
          previous = { targets: pose.footTargets, contact };
        } else previous = null;
        if (state.altitude > .05) { tookFlight = true; expect(pose.footTargets).toBeNull(); }
      }
      expect(pivotFrames).toBeGreaterThan(8); expect(supportFrames).toBeGreaterThan(5);
      expect(stepped.size).toBe(2); expect(tookFlight).toBe(true);
    } finally { f.wildlife.dispose(); }
  });

  it('replays turn contacts exactly at 30 and 60 Hz and holds all transforms while paused', () => {
    const a = fixture(), b = fixture();
    try {
      a.wildlife.setMode('free'); b.wildlife.setMode('free'); let turns = 0;
      for (let frame = 0; frame < 24 * 30; frame++) {
        a.wildlife.update(frame / 30, 1 / 30);
        b.wildlife.update(frame / 30, 1 / 60); b.wildlife.update(frame / 30, 1 / 60);
        for (const id of ids) {
          const pose = a.poses.get(id), other = b.poses.get(id);
          if (!pose.footTargets || !pose.footTargets.some(target => Math.abs(target.yaw || 0) > .001)) continue;
          turns++;
          pose.footTargets.forEach((target, index) => {
            for (const key of ['x', 'y', 'z', 'swing', 'yaw']) expect(target[key]).toBeCloseTo(other.footTargets[index][key], 7);
          });
          const held = transforms(a.models.get(id).root), heldPose = pose;
          a.wildlife.update(900, 0);
          expect(transforms(a.models.get(id).root)).toEqual(held); expect(a.poses.get(id)).toEqual(heldPose);
        }
      }
      expect(turns).toBeGreaterThan(20);
    } finally { a.wildlife.dispose(); b.wildlife.dispose(); }
    // Keep the full 24-second, 30/60 Hz replay on slower CI runners.
  }, 15000);

  it('uses different even stride counts for differently sized foraging routes', () => {
    const f = fixture(), bouts = new Map(), completed = [];
    try {
      f.wildlife.setMode('free');
      for (let frame = 0; frame < 65 * 20; frame++) {
        f.wildlife.update(frame / 20, 1 / 20);
        const snapshot = f.wildlife.snapshot();
        for (const id of ids) {
          const pose = f.poses.get(id), state = snapshot.find(bird => bird.id === id), bout = bouts.get(id);
          if (state.behavior === 'Walking and searching') {
            if (!bout) bouts.set(id, { id, start: state.position.slice(), finish: state.position.slice(), stride: pose.stride });
            else { bout.finish = state.position.slice(); bout.stride = pose.stride; }
          } else if (bout) { completed.push(bout); bouts.delete(id); }
        }
      }
      expect(completed.length).toBeGreaterThan(8);
      const counts = completed.map(bout => Math.round(bout.stride / Math.PI));
      expect(new Set(counts).size).toBeGreaterThan(1);
      for (let i = 0; i < completed.length; i++) {
        const bout = completed[i], count = counts[i], travel = new THREE.Vector3(...bout.start).distanceTo(new THREE.Vector3(...bout.finish));
        expect([4, 6, 8]).toContain(count);
        expect(travel / count).toBeLessThan(f.models.get(bout.id).profile.walkReach * 1.5 + .001);
      }
    } finally { f.wildlife.dispose(); }
  });

  it('restores exact Guided transforms and contact geometry after a paused turn', () => {
    const a = fixture(), b = fixture();
    try {
      a.wildlife.setMode('free');
      for (let frame = 0; frame < 24 * 30; frame++) {
        a.wildlife.update(frame / 30, 1 / 30);
        if ([...a.poses.values()].some(pose => pose.footTargets?.some(target => Math.abs(target.yaw || 0) > .001))) break;
      }
      a.wildlife.setMode('guided');
      for (const time of [0, 3.72, 4.2, 5.1, 6.2, 8.2, 12.4, 18.5, 21.9, 29.9, 34.9, 43.9]) {
        a.wildlife.update(time); b.wildlife.update(time); a.scene.updateMatrixWorld(true); b.scene.updateMatrixWorld(true);
        expect(a.wildlife.snapshot()).toEqual(b.wildlife.snapshot());
        expect(transforms(a.wildlife.root)).toEqual(transforms(b.wildlife.root));
        for (const id of ids) for (let foot = 0; foot < 2; foot++) expect(contactVertices(a.models.get(id).feet[foot])).toEqual(contactVertices(b.models.get(id).feet[foot]));
      }
    } finally { a.wildlife.dispose(); b.wildlife.dispose(); }
  });
});
